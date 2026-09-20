import { Router } from "express";
import { nanoid } from "nanoid";
import { Preference, Payment } from "mercadopago";
import { mpClient } from "../config/mercadopago.js";
import { calcularPreco, TAMANHOS, MATERIAIS, ACABAMENTOS } from "../utils/precos.js";
import { criarPedido, buscarPedidoPorId, atualizarStatusPedido } from "../config/db.js";

export const pedidosRouter = Router();

// POST /api/pedidos
// Recebe as escolhas do configurador, recalcula o preço no servidor,
// cria o pedido "pendente" no banco e devolve o link de pagamento do Mercado Pago.
pedidosRouter.post("/", async (req, res) => {
  try {
    const { modelo, material, tamanho, acabamento, cliente } = req.body;

    if (!TAMANHOS[tamanho] || !MATERIAIS[material] || !(acabamento in ACABAMENTOS)) {
      return res.status(400).json({ erro: "Opções de configuração inválidas." });
    }
    if (!cliente?.nome || !cliente?.email) {
      return res.status(400).json({ erro: "Nome e e-mail do cliente são obrigatórios." });
    }

    const preco = calcularPreco({ tamanho, material, acabamento });
    const pedidoId = nanoid(12);

    await criarPedido({
      id: pedidoId,
      modelo,
      material,
      tamanho,
      acabamento,
      preco,
      cliente,
      status: "pendente",
      criadoEm: new Date().toISOString(),
    });

    const preference = new Preference(mpClient);
    const resultado = await preference.create({
      body: {
        items: [
          {
            id: String(pedidoId),
            title: `Sahir 3D — ${modelo || "peça personalizada"} (${tamanho}, ${material})`,
            description: String(acabamento),
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(preco),
          },
        ],
        external_reference: pedidoId,
        back_urls: {
          success: `http://localhost:56423/pedido-sucesso.html?pedido=${pedidoId}`,
          failure: `http://localhost:56423/pedido-falha.html?pedido=${pedidoId}`,
          pending: `http://localhost:56423/pedido-pendente.html?pedido=${pedidoId}`,
        },
        notification_url: `${process.env.BACKEND_URL}/api/webhooks/mercadopago`,
      },
    });

    res.json({
      pedidoId,
      preco,
      linkPagamento: resultado.init_point,
    });
  } catch (erro) {
    console.error("Erro ao criar pedido:", erro);
    res.status(500).json({ erro: "Não foi possível criar o pedido. Tente novamente." });
  }
});

// GET /api/pedidos/:id
// Usado pela página de "obrigado" pra checar em que status o pedido está.
pedidosRouter.get("/:id", async (req, res) => {
  const pedido = await buscarPedidoPorId(req.params.id);
  if (!pedido) return res.status(404).json({ erro: "Pedido não encontrado." });
  res.json(pedido);
});

// POST /api/webhooks/mercadopago
// O Mercado Pago chama esta URL sozinho quando o status de um pagamento muda.
// É aqui que você confirma de verdade que o dinheiro entrou — nunca confie
// só no redirect de volta pro site (o cliente pode fechar a aba antes).
export const webhookRouter = Router();

webhookRouter.post("/mercadopago", async (req, res) => {
  try {
    const { type, data } = req.body;

    // Responda 200 rápido pro Mercado Pago não ficar reenviando o mesmo evento.
    res.sendStatus(200);

    if (type !== "payment" || !data?.id) return;

    const payment = new Payment(mpClient);
    const pagamento = await payment.get({ id: data.id });

    const pedidoId = pagamento.external_reference;
    if (!pedidoId) return;

    const statusMap = {
      approved: "pago",
      pending: "pendente",
      in_process: "pendente",
      rejected: "recusado",
      cancelled: "cancelado",
      refunded: "reembolsado",
    };

    const novoStatus = statusMap[pagamento.status] || pagamento.status;

    await atualizarStatusPedido(pedidoId, novoStatus, {
      mercadopagoPaymentId: pagamento.id,
      statusDetail: pagamento.status_detail,
    });

    if (novoStatus === "pago") {
      // TODO: dispare aqui seu aviso (e-mail, WhatsApp, Slack) de que um
      // pedido novo foi pago e precisa entrar na fila de impressão.
      console.log(`Pedido ${pedidoId} confirmado como PAGO.`);
    }
  } catch (erro) {
    console.error("Erro processando webhook do Mercado Pago:", erro);
  }
});

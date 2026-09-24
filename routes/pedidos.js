import { Router } from "express";
import { nanoid } from "nanoid";
import { Preference, Payment } from "mercadopago";
import { mpClient } from "../config/mercadopago.js";
import { calcularPreco, TAMANHOS, ACABAMENTOS } from "../utils/precos.js";
import {
  supabase,
  criarPedido,
  buscarPedidoPorId,
  atualizarStatusPedido,
  listarPedidosPorUsuario,
} from "../config/db.js";

export const pedidosRouter = Router();

// Lê o token do Supabase enviado pelo front-end (se o cliente estiver logado)
// e devolve o ID do usuário autenticado, ou null se não estiver logado.
// Nunca confie em um user_id enviado direto pelo corpo da requisição — sempre
// valide o token, senão qualquer pessoa poderia se passar por outro usuário.
async function pegarUsuarioLogado(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

// POST /api/pedidos
// Recebe as escolhas do configurador, recalcula o preço no servidor,
// cria o pedido "pendente" no banco e devolve o link de pagamento do Mercado Pago.
pedidosRouter.post("/", async (req, res) => {
  try {
    const { modelo, personagem, tamanho, acabamento, cliente } = req.body;

    if (!TAMANHOS[tamanho] || !(acabamento in ACABAMENTOS)) {
      return res.status(400).json({ erro: "Opções de configuração inválidas." });
    }
    if (!cliente?.nome || !cliente?.email) {
      return res.status(400).json({ erro: "Nome e e-mail do cliente são obrigatórios." });
    }

    const preco = calcularPreco({ tamanho, acabamento });
    const pedidoId = nanoid(12);
    const userId = await pegarUsuarioLogado(req); // null se o cliente não estiver logado (checkout como convidado)
    
    const nomePersonagem = personagem || "Arquivo Próprio";

    await criarPedido({
      id: pedidoId,
      user_id: userId,
      modelo,
      personagem: nomePersonagem,
      material: "PLA Premium", // Fixado no banco para o histórico do cliente
      tamanho,
      acabamento,
      preco,
      cliente_nome: cliente.nome,
      cliente_email: cliente.email,
      status: "pendente",
    });

    const preference = new Preference(mpClient);
    const resultado = await preference.create({
      body: {
        items: [
          {
            id: String(pedidoId),
            title: `Sahir 3D — ${modelo || "Personalizado"}: ${nomePersonagem} (${tamanho})`,
            description: String(acabamento),
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(preco),
          },
        ],
        external_reference: pedidoId,
        back_urls: {
          success: `https://rafaelmuroni.github.io/sahir3d-site/?status=sucesso&pedido=${pedidoId}`,
          failure: `https://rafaelmuroni.github.io/sahir3d-site/?status=falha&pedido=${pedidoId}`,
          pending: `https://rafaelmuroni.github.io/sahir3d-site/?status=pendente&pedido=${pedidoId}`,
        },
        auto_return: "approved",
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

// GET /api/pedidos/meus
// Lista os pedidos do usuário logado. Exige token válido do Supabase.
// IMPORTANTE: essa rota tem que vir ANTES de "/:id" abaixo, senão o Express
// vai achar que "meus" é um ID de pedido.
pedidosRouter.get("/meus", async (req, res) => {
  const userId = await pegarUsuarioLogado(req);
  if (!userId) return res.status(401).json({ erro: "Faça login para ver seus pedidos." });

  try {
    const pedidos = await listarPedidosPorUsuario(userId);
    res.json(pedidos);
  } catch (erro) {
    console.error("Erro ao listar pedidos do usuário:", erro);
    res.status(500).json({ erro: "Não foi possível carregar seus pedidos." });
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

    console.log(`Webhook recebido do Mercado Pago: payment ${data.id}, status ${pagamento.status}`);

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

    console.log(`Pedido ${pedidoId} atualizado para status: ${novoStatus}`);

    if (novoStatus === "pago") {
      // TODO: dispare aqui seu aviso (e-mail, WhatsApp, Slack) de que um
      // pedido novo foi pago e precisa entrar na fila de impressão.
      console.log(`Pedido ${pedidoId} confirmado como PAGO.`);
    }
  } catch (erro) {
    console.error("Erro processando webhook do Mercado Pago:", erro);
  }
});

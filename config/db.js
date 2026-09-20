// Banco de dados simples em arquivo, só para você sair rodando rápido.
// Quando o site começar a vender de verdade, troque por Postgres (Supabase,
// Neon, Railway) — a interface abaixo (getPedidos/salvarPedido/etc.) pode
// continuar igual, só troca o que tem dentro dessas funções.

import { JSONFilePreset } from "lowdb/node";

const defaultData = { pedidos: [] };
const db = await JSONFilePreset("data/db.json", defaultData);

export async function criarPedido(pedido) {
  db.data.pedidos.push(pedido);
  await db.write();
  return pedido;
}

export async function buscarPedidoPorId(id) {
  return db.data.pedidos.find((p) => p.id === id);
}

export async function atualizarStatusPedido(id, status, detalhesPagamento = {}) {
  const pedido = db.data.pedidos.find((p) => p.id === id);
  if (!pedido) return null;
  pedido.status = status;
  pedido.pagamento = { ...pedido.pagamento, ...detalhesPagamento };
  pedido.atualizadoEm = new Date().toISOString();
  await db.write();
  return pedido;
}

export async function listarPedidos() {
  return db.data.pedidos;
}

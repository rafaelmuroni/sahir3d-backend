// Conexão com o banco de dados Postgres do Supabase.
// Usa a service_role key, que ignora as regras de segurança (RLS) —
// por isso essa chave só pode existir aqui no backend, nunca no front-end.

import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos. Configure essas variáveis no .env (ou nas Environment Variables do Render)."
  );
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function criarPedido(pedido) {
  const { data, error } = await supabase.from("pedidos").insert(pedido).select().single();
  if (error) throw error;
  return data;
}

export async function buscarPedidoPorId(id) {
  const { data, error } = await supabase.from("pedidos").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function atualizarStatusPedido(id, status, detalhes = {}) {
  const { data, error } = await supabase
    .from("pedidos")
    .update({
      status,
      mercadopago_payment_id: detalhes.mercadopagoPaymentId,
      status_detail: detalhes.statusDetail,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listarPedidosPorUsuario(userId) {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .eq("user_id", userId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data;
}

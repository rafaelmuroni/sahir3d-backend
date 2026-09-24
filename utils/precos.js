// Estas tabelas espelham EXATAMENTE os data-attributes usados no configurador
// do site. Se você mudar um preço no HTML, mude aqui também — 
// esta é a fonte de verdade que decide quanto é cobrado.

export const TAMANHOS = {
  "10 cm": 89.9,
  "15 cm": 129.9,
  "20 cm": 189.9,
  "30 cm": 289.9,
};

// O objeto MATERIAIS foi removido, pois agora o sistema opera 100% em PLA.

export const ACABAMENTOS = {
  "Sem pintura": 0,
  "Pintura básica": 40,
  "Pintura premium": 110,
};

/**
 * Recalcula o preço no servidor a partir das escolhas do cliente.
 * Nunca aceite um valor de preço vindo diretamente do front-end.
 *
 * @param {{ tamanho: string, acabamento: string }} escolha
 * @returns {number} preço final em reais, com 2 casas decimais
 */
export function calcularPreco({ tamanho, acabamento }) {
  const base = TAMANHOS[tamanho];
  const add = ACABAMENTOS[acabamento] ?? 0;

  if (base === undefined) {
    throw new Error("Tamanho inválido selecionado.");
  }

  // O multiplicador de material foi removido. 
  // O preço agora é a soma simples da base (tamanho) com o acabamento.
  const preco = base + add;
  return Math.round(preco * 100) / 100;
}

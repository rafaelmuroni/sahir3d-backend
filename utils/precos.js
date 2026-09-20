// Estas tabelas espelham EXATAMENTE os data-attributes usados no configurador
// do site (sahir3d_geek_premium.html). Se você mudar um preço no HTML,
// mude aqui também — esta é a fonte de verdade que decide quanto é cobrado.

export const TAMANHOS = {
  "10 cm": 89.9,
  "15 cm": 129.9,
  "20 cm": 189.9,
  "30 cm": 289.9,
};

export const MATERIAIS = {
  "Resina 8K": 1.4,
  "PLA": 1,
};

export const ACABAMENTOS = {
  "Sem pintura": 0,
  "Pintura básica": 40,
  "Pintura premium": 110,
};

/**
 * Recalcula o preço no servidor a partir das escolhas do cliente.
 * Nunca aceite um valor de preço vindo diretamente do front-end.
 *
 * @param {{ tamanho: string, material: string, acabamento: string }} escolha
 * @returns {number} preço final em reais, com 2 casas decimais
 */
export function calcularPreco({ tamanho, material, acabamento }) {
  const base = TAMANHOS[tamanho];
  const mult = MATERIAIS[material];
  const add = ACABAMENTOS[acabamento] ?? 0;

  if (base === undefined || mult === undefined) {
    throw new Error("Combinação de tamanho/material inválida.");
  }

  const preco = base * mult + add;
  return Math.round(preco * 100) / 100;
}

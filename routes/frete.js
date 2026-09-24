// routes/frete.js
import { Router } from 'express';

export const freteRouter = Router();
const BASE = 'https://api.correios.com.br';

// TODO: SUBSTITUA pelos pesos/medidas reais das suas caixas (valores abaixo são estimativas)
const EMBALAGEM = {
  '10 cm': { peso: 250,  comp: 16, larg: 11, alt: 11 },
  '15 cm': { peso: 450,  comp: 20, larg: 15, alt: 15 },
  '20 cm': { peso: 700,  comp: 25, larg: 20, alt: 20 },
  '30 cm': { peso: 1400, comp: 35, larg: 25, alt: 25 },
};

const SERVICOS = () => ({
  PAC:   { codigo: process.env.CORREIOS_COD_PAC,   nome: 'PAC' },
  SEDEX: { codigo: process.env.CORREIOS_COD_SEDEX, nome: 'SEDEX' },
});

let tokenCache = { token: null, expira: 0 };

async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.expira - 60000) return tokenCache.token;
  const basic = Buffer.from(`${process.env.CORREIOS_USUARIO}:${process.env.CORREIOS_CODIGO_ACESSO}`).toString('base64');
  
  const r = await fetch(`${BASE}/token/v1/autentica/cartaopostagem`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero: process.env.CORREIOS_CARTAO_POSTAGEM }),
  });
  
  if (!r.ok) throw new Error('Falha na autenticação dos Correios: ' + r.status);
  
  const j = await r.json();
  tokenCache = { token: j.token, expira: new Date(j.expiraEm).getTime() };
  return j.token;
}

const num = (v) => Number(String(v).replace(/\./g, '').replace(',', '.'));

export async function calcularFrete(cepDestino, tamanho) {
  const emb = EMBALAGEM[tamanho];
  if (!emb) throw new Error('Tamanho inválido');
  const destino = String(cepDestino).replace(/\D/g, '');
  if (destino.length !== 8) throw new Error('CEP inválido');
  
  const token = await getToken();
  const headers = { Authorization: `Bearer ${token}` };
  const origem = process.env.CORREIOS_CEP_ORIGEM;

  const opcoes = await Promise.all(Object.entries(SERVICOS()).map(async ([chave, s]) => {
    if (!s.codigo) return null;
    try {
      const qPreco = new URLSearchParams({ 
        cepOrigem: origem, cepDestino: destino, psObjeto: emb.peso,
        tpObjeto: 2, comprimento: emb.comp, largura: emb.larg, altura: emb.alt 
      });
      const [rp, rz] = await Promise.all([
        fetch(`${BASE}/preco/v1/nacional/${s.codigo}?${qPreco}`, { headers }),
        fetch(`${BASE}/prazo/v1/nacional/${s.codigo}?${new URLSearchParams({ cepOrigem: origem, cepDestino: destino })}`, { headers }),
      ]);
      
      if (!rp.ok || !rz.ok) return null;
      const preco = await rp.json();
      const prazo = await rz.json();
      
      return { servico: chave, nome: s.nome, valor: num(preco.pcFinal), prazoDias: Number(prazo.prazoEntrega) };
    } catch { return null; }
  }));
  return opcoes.filter(Boolean);
}

// GET /api/frete?cep=89201000&tamanho=15%20cm
freteRouter.get('/', async (req, res) => {
  try {
    const opcoes = await calcularFrete(req.query.cep, req.query.tamanho);
    res.json({ opcoes });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

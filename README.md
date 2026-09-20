# Sahir 3D — Backend de pagamentos

Backend em Node.js/Express que recebe a configuração da peça, recalcula o
preço no servidor (por segurança) e cria um link de pagamento no Mercado
Pago (Checkout Pro). Também recebe o webhook que confirma quando o
pagamento foi aprovado.

## Rodando localmente

```bash
npm install
cp .env.example .env
# edite o .env e coloque seu MP_ACCESS_TOKEN de teste
npm run dev
```

O servidor sobe em `http://localhost:3000`.

## Estrutura

```
server.js               → arquivo principal, monta as rotas
routes/pedidos.js       → cria pedido + preferência de pagamento, e o webhook
config/mercadopago.js   → configuração do SDK do Mercado Pago
config/db.js            → "banco de dados" simples em arquivo JSON
utils/precos.js         → regras de preço (espelha o configurador do site)
data/db.json            → onde os pedidos ficam salvos (criado automaticamente)
integracao-frontend.md  → como plugar isso no HTML do site
```

## Testando o fluxo de pagamento

1. No painel do Mercado Pago, crie uma aplicação e pegue as credenciais de
   TESTE.
2. Crie duas contas de teste (vendedor e comprador) em "Contas de teste".
3. Use o Access Token de teste do vendedor no `.env`.
4. Rode o backend, chame `POST /api/pedidos` (ou use o front-end já
   integrado) e pague usando os dados da conta de teste do comprador.
5. Confira no terminal se o webhook chegou e o pedido virou "pago" em
   `data/db.json`.

## Indo pra produção

Veja o passo a passo completo na conversa com o Claude ou peça
"próximos passos de implantação" — resumo rápido:

1. Deploy do backend (Railway, Render, Fly.io ou uma VPS).
2. Trocar `MP_ACCESS_TOKEN` pelo token de produção.
3. Configurar `SITE_URL` e `BACKEND_URL` com os domínios reais.
4. Trocar `data/db.json` por um banco de verdade quando o volume crescer
   (Postgres via Supabase/Neon/Railway).

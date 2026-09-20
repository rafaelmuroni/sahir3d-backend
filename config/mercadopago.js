import { MercadoPagoConfig } from "mercadopago";

if (!process.env.MP_ACCESS_TOKEN) {
  throw new Error(
    "MP_ACCESS_TOKEN não definido. Copie .env.example para .env e preencha o token do Mercado Pago."
  );
}

export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 },
});

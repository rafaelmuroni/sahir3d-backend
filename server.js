import 'dotenv/config';
import express from "express";
import cors from "cors";
import { pedidosRouter, webhookRouter } from "./routes/pedidos.js";

const app = express();

app.use(cors({ origin: process.env.SITE_URL }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend do Sahir 3D rodando ✅");
});

app.use("/api/pedidos", pedidosRouter);
app.use("/api/webhooks", webhookRouter);

const porta = process.env.PORT || 3000;
app.listen(porta, () => {
  console.log(`Servidor rodando em http://localhost:${porta}`);
});

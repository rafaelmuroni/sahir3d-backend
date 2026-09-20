# Como plugar isso no HTML existente

No arquivo `sahir3d_geek_premium.html`, dentro do `<script>` do configurador,
troque o botão de "Solicitar orçamento" para chamar o backend em vez de só
mostrar o preço calculado no navegador.

## 1. Adicione um formulário de nome/e-mail perto do botão

Antes de redirecionar pro pagamento, você precisa de nome e e-mail do
cliente (o Mercado Pago pede isso). Adicione dois campos simples no
configurador (pode ser um pequeno modal que abre ao clicar em "Finalizar").

## 2. Troque a função do botão

```html
<button id="btnFinalizarPedido" class="w-full btn-primary rounded-full py-3.5 font-semibold text-sm text-white">
  Ir para pagamento
</button>
```

```js
const BACKEND_URL = "https://SEU-BACKEND-AQUI.com"; // troque pela URL real depois do deploy

document.getElementById("btnFinalizarPedido").addEventListener("click", async () => {
  if (!state.model || !state.material || !state.size) {
    alert("Escolha o modelo, material e tamanho antes de continuar.");
    return;
  }

  const nome = document.getElementById("clienteNome").value.trim();
  const email = document.getElementById("clienteEmail").value.trim();
  if (!nome || !email) {
    alert("Preencha nome e e-mail para continuar.");
    return;
  }

  const btn = document.getElementById("btnFinalizarPedido");
  btn.disabled = true;
  btn.textContent = "Gerando pagamento...";

  try {
    const resp = await fetch(`${BACKEND_URL}/api/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelo: state.model,
        material: state.material,
        tamanho: state.size,
        acabamento: state.finish || "Sem pintura",
        cliente: { nome, email },
      }),
    });

    if (!resp.ok) throw new Error("Falha ao criar pedido");

    const { linkPagamento } = await resp.json();
    window.location.href = linkPagamento; // manda o cliente pro checkout do Mercado Pago
  } catch (erro) {
    alert("Não foi possível iniciar o pagamento. Tente novamente em instantes.");
    btn.disabled = false;
    btn.textContent = "Ir para pagamento";
  }
});
```

## 3. Crie 3 páginas simples de retorno

`pedido-sucesso.html`, `pedido-falha.html`, `pedido-pendente.html` — o
Mercado Pago redireciona o cliente pra elas depois do pagamento. Podem ser
bem simples, cada uma pode chamar `GET /api/pedidos/:id` (pegando o `?pedido=`
da URL) pra mostrar o status real, já que o redirect não garante 100% de
certeza (o webhook que garante).

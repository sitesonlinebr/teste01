(function () {
  const WHATSAPP_NUMBER = "5538998347326"; // 55 + DDD + número
  const LS_CART = "magao_cart_v1";
  const LS_PRODUCTS = "magao_products_v1";

  function escapeXml(unsafe) {
    return String(unsafe).replace(/[<>&'"]/g, c => ({
      "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
    }[c]));
  }

  function svgDataUri(text) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#6ee7ff" stop-opacity="0.35"/>
            <stop offset="1" stop-color="#9b87ff" stop-opacity="0.35"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          font-family="Arial" font-size="44" fill="#e9ecf2" opacity="0.95">${escapeXml(text)}</text>
      </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
  }

  function defaultProducts() {
    return [
      {
        id: "mt-001",
        name: "Tênis Corrida AirFlow Pro",
        brand: "Magão",
        category: "corrida",
        price: 249.9,
        oldPrice: 329.9,
        sizeInfo: "Num: 37 ao 43",
        desc: "Leve, confortável e com boa absorção de impacto.",
        mlLink: "https://www.mercadolivre.com.br/",
        image: "",
        active: true,
        tag: ""
      }
    ];
  }

  function loadProducts() {
    try {
      const raw = localStorage.getItem(LS_PRODUCTS);
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr) && arr.length) return arr;
    } catch {}
    const defs = defaultProducts();
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(defs));
    return defs;
  }

  let PRODUCTS = loadProducts().map(p => {
    const img = (p.image && p.image.startsWith("http")) ? p.image : (p.image || svgDataUri((p.name || "Produto").split(" ").slice(0,2).join(" ")));
    return { ...p, image: img, active: !!p.active };
  });

  function readCart() {
    try {
      const raw = localStorage.getItem(LS_CART);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(LS_CART, JSON.stringify(cart));
  }

  function setQty(productId, qty) {
    const cart = readCart();
    const idx = cart.findIndex(i => i.productId === productId);
    if (idx === -1) return;
    const nextQty = Math.max(0, Number(qty) || 0);
    if (nextQty === 0) cart.splice(idx, 1);
    else cart[idx].qty = nextQty;
    writeCart(cart);
    renderAll();
  }

  function clearCart() {
    writeCart([]);
    renderAll();
  }

  function moneyBRL(value) {
    return (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function totals() {
    const cart = readCart();
    let count = 0, subtotal = 0;
    for (const it of cart) {
      const p = PRODUCTS.find(x => x.id === it.productId);
      if (!p) continue;
      count += it.qty;
      subtotal += (Number(p.price) || 0) * it.qty;
    }
    return { count, subtotal };
  }

  function capCategory(cat) {
    const map = { corrida: "Corrida", casual: "Casual", basket: "Basquete", skate: "Skate" };
    return map[cat] || cat;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[m]));
  }

  const ckItemsCount = document.getElementById("ckItemsCount");
  const ckSubtotal = document.getElementById("ckSubtotal");
  const ckCartList = document.getElementById("ckCartList");
  const ckEmptyHint = document.getElementById("ckEmptyHint");
  const ckClearCart = document.getElementById("ckClearCart");

  const pagamento = document.getElementById("pagamento");
  const trocoWrap = document.getElementById("trocoWrap");
  const outroWrap = document.getElementById("outroWrap");

  function renderCartList() {
    PRODUCTS = loadProducts().map(p => {
      const img = (p.image && p.image.startsWith("http")) ? p.image : (p.image || svgDataUri((p.name || "Produto").split(" ").slice(0,2).join(" ")));
      return { ...p, image: img, active: !!p.active };
    });

    const cart = readCart();

    // remove itens inexistentes
    const validIds = new Set(PRODUCTS.map(p => p.id));
    const cleaned = cart.filter(i => validIds.has(i.productId));
    if (cleaned.length !== cart.length) writeCart(cleaned);

    if (!cleaned.length) {
      ckEmptyHint.textContent = "Carrinho vazio. Volte ao catálogo para adicionar itens.";
      ckCartList.innerHTML = "";
      return;
    }

    ckEmptyHint.textContent = "";

    ckCartList.innerHTML = cleaned.map(it => {
      const p = PRODUCTS.find(x => x.id === it.productId);
      if (!p) return "";
      return `
        <div class="cartItem">
          <div class="cartItem__thumb">
            <img src="${p.image}" alt="${escapeHtml(p.name)}" />
          </div>

          <div>
            <div class="cartItem__title">${escapeHtml(p.name)}</div>
            <div class="cartItem__muted">${escapeHtml(p.brand)} • ${escapeHtml(capCategory(p.category))} • ${escapeHtml(p.sizeInfo)}</div>
            <div class="cartItem__muted">${moneyBRL(p.price)} cada</div>
            <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
              <a class="btn" href="${p.mlLink}" target="_blank" rel="noopener" style="padding:8px 10px;border-radius:12px">Abrir link (ML)</a>
              ${p.active ? "" : `<span class="pill" style="border-color:rgba(255,107,107,.35)">Inativo</span>`}
            </div>
          </div>

          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <div class="qty">
              <button type="button" data-dec="${p.id}">−</button>
              <span>${it.qty}</span>
              <button type="button" data-inc="${p.id}">+</button>
            </div>
            <div style="font-weight:900">${moneyBRL((Number(p.price)||0) * it.qty)}</div>
            <button class="btn btn--ghost" type="button" data-del="${p.id}" style="padding:8px 10px">Remover</button>
          </div>
        </div>`;
    }).join("");
  }

  function renderSummary() {
    const t = totals();
    ckItemsCount.textContent = String(t.count);
    ckSubtotal.textContent = moneyBRL(t.subtotal);
  }

  function renderAll() {
    renderCartList();
    renderSummary();
  }

  ckCartList.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const del = e.target.closest("[data-del]");

    if (inc) {
      const id = inc.getAttribute("data-inc");
      const cart = readCart();
      const item = cart.find(i => i.productId === id);
      setQty(id, (item?.qty || 0) + 1);
    }
    if (dec) {
      const id = dec.getAttribute("data-dec");
      const cart = readCart();
      const item = cart.find(i => i.productId === id);
      setQty(id, (item?.qty || 0) - 1);
    }
    if (del) {
      const id = del.getAttribute("data-del");
      setQty(id, 0);
    }
  });

  ckClearCart.addEventListener("click", clearCart);

  pagamento.addEventListener("change", () => {
    const v = pagamento.value;
    trocoWrap.style.display = v === "Dinheiro" ? "flex" : "none";
    outroWrap.style.display = v === "Outro" ? "flex" : "none";
  });

  function buildWhatsAppMessage(formData) {
    const cart = readCart();
    const t = totals();
    const now = new Date();
    const dataHora = now.toLocaleString("pt-BR");

    const lines = [];
    lines.push("🧾 *NOVO PEDIDO — Magão Tênis*");
    lines.push(`📅 *Data/Hora:* ${dataHora}`);
    lines.push("");

    lines.push("*Itens:*");
    cart.forEach(it => {
      const p = PRODUCTS.find(x => x.id === it.productId);
      if (!p) return;
      lines.push(`• ${p.name} — ${it.qty}x — ${moneyBRL((Number(p.price)||0) * it.qty)}`);
      lines.push(`  (${p.brand} | ${capCategory(p.category)} | ${p.sizeInfo})`);
      lines.push(`  Link: ${p.mlLink}`);
    });

    lines.push("");
    lines.push(`💰 *Subtotal:* ${moneyBRL(t.subtotal)}`);
    lines.push("🚚 *Frete:* a combinar");
    lines.push("");

    lines.push(`👤 *Nome:* ${formData.nome}`);
    lines.push(`📍 *Endereço:* ${formData.endereco}`);

    if (formData.obs) lines.push(`📝 *Obs:* ${formData.obs}`);

    let pagamentoTxt = formData.pagamento;
    if (formData.pagamento === "Dinheiro" && formData.troco) pagamentoTxt += ` (troco para ${formData.troco})`;
    if (formData.pagamento === "Outro" && formData.outroPagamento) pagamentoTxt += ` (${formData.outroPagamento})`;

    lines.push(`💳 *Pagamento:* ${pagamentoTxt}`);

    return lines.join("\n");
  }

  document.getElementById("checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const cart = readCart();
    if (!cart.length) {
      alert("Seu carrinho está vazio. Volte ao catálogo e adicione itens.");
      return;
    }

    const nome = document.getElementById("nome").value.trim();
    const endereco = document.getElementById("endereco").value.trim();
    const obs = document.getElementById("obs").value.trim();
    const pag = pagamento.value;

    const troco = document.getElementById("troco").value.trim();
    const outroPagamento = document.getElementById("outroPagamento").value.trim();

    if (!nome || !endereco || !pag) {
      alert("Preencha nome, endereço e forma de pagamento.");
      return;
    }

    const msg = buildWhatsAppMessage({
      nome,
      endereco,
      obs,
      pagamento: pag,
      troco,
      outroPagamento
    });

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
  });

  // init
  renderAll();
})();
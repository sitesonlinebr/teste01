(function () {
  const WHATSAPP_NUMBER = "5538998347326";
  const LS_PRODUCTS = "magao_products";
  const LS_CART = "magao_cart";

  const $ = (id) => document.getElementById(id);

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
  }
  function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function moneyBRL(v) { return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  function capCategory(cat){
    const map={corrida:"Corrida",casual:"Casual",basket:"Basquete",skate:"Skate"};
    return map[cat]||cat||"—";
  }
  function escapeXml(unsafe){
    return String(unsafe).replace(/[<>&'"]/g,c=>({ "<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;" }[c]));
  }

  function loadProducts(){
    const arr = readJSON(LS_PRODUCTS);
    return Array.isArray(arr) ? arr : [];
  }
  function loadCart(){
    const arr = readJSON(LS_CART);
    return Array.isArray(arr) ? arr : [];
  }
  function saveCart(cart){ writeJSON(LS_CART, cart); }

  function totals(PRODUCTS, cart){
    let count=0, subtotal=0;
    for(const it of cart){
      const p = PRODUCTS.find(x=>x.id===it.productId);
      if(!p) continue;
      const q = Number(it.qty)||0;
      count += q;
      subtotal += (Number(p.price)||0) * q;
    }
    return {count, subtotal};
  }

  const ckCartList = $("ckCartList");
  const ckSummary = $("ckSummary");
  const pagamento = $("pagamento");
  const trocoWrap = $("trocoWrap");
  const limparBtn = $("limpar");

  function render(){
    const PRODUCTS = loadProducts();
    const cart = loadCart().filter(it => PRODUCTS.some(p=>p.id===it.productId));
    saveCart(cart);

    const t = totals(PRODUCTS, cart);
    ckSummary.textContent = `${t.count} item(ns) • ${moneyBRL(t.subtotal)}`;

    if(!cart.length){
      ckCartList.innerHTML = `<div class="muted">Carrinho vazio. Volte e adicione produtos.</div>`;
      return;
    }

    ckCartList.innerHTML = cart.map(it=>{
      const p = PRODUCTS.find(x=>x.id===it.productId);
      if(!p) return "";
      return `
        <div style="display:flex;gap:10px;justify-content:space-between;border-bottom:1px solid var(--line);padding:10px 0">
          <div style="flex:1">
            <div style="font-weight:900">${escapeXml(p.name)}</div>
            <div class="muted" style="font-size:12px">${escapeXml(p.brand||"")} • ${escapeXml(capCategory(p.category))}</div>
            <div class="muted" style="font-size:12px">Tamanho: <b>${escapeXml(it.size||"-")}</b>${it.color?` • Cor: <b>${escapeXml(it.color)}</b>`:""}</div>
            <div class="muted" style="font-size:12px">${moneyBRL(p.price)} cada</div>
          </div>
          <div style="text-align:right;min-width:120px">
            <div style="font-weight:900">${it.qty}x</div>
            <div style="font-weight:900">${moneyBRL((Number(p.price)||0)*(Number(it.qty)||0))}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  pagamento.addEventListener("change", ()=>{
    trocoWrap.style.display = pagamento.value === "Dinheiro" ? "flex" : "none";
  });

  limparBtn.addEventListener("click",(e)=>{
    e.preventDefault();
    if(!confirm("Limpar carrinho?")) return;
    saveCart([]);
    render();
  });

  function buildMessage(data){
    const PRODUCTS = loadProducts();
    const cart = loadCart();
    const t = totals(PRODUCTS, cart);

    const now = new Date().toLocaleString("pt-BR");

    const lines = [];
    lines.push("🧾 *PEDIDO — MAGÃO TÊNIS*");
    lines.push(`📅 *Data/Hora:* ${now}`);
    lines.push("");
    lines.push("*Itens:*");

    cart.forEach(it=>{
      const p = PRODUCTS.find(x=>x.id===it.productId);
      if(!p) return;
      lines.push(`• ${p.name} — ${it.qty}x — ${moneyBRL((Number(p.price)||0)*(Number(it.qty)||0))}`);
      lines.push(`  (${p.brand} | ${capCategory(p.category)} | Tam: ${it.size}${it.color?` | Cor: ${it.color}`:""})`);
    });

    lines.push("");
    lines.push(`💰 *Subtotal:* ${moneyBRL(t.subtotal)}`);
    lines.push("🚚 *Frete:* a combinar");
    lines.push("");
    lines.push(`👤 *Nome:* ${data.nome}`);
    if(data.telefone) lines.push(`📞 *Telefone:* ${data.telefone}`);
    lines.push(`📍 *Endereço:* ${data.endereco}`);
    if(data.obs) lines.push(`📝 *Obs:* ${data.obs}`);

    let pag = data.pagamento;
    if(data.pagamento==="Dinheiro" && data.troco) pag += ` (troco para ${data.troco})`;
    lines.push(`💳 *Pagamento:* ${pag}`);

    return lines.join("\n");
  }

  $("checkoutForm").addEventListener("submit",(e)=>{
    e.preventDefault();

    const PRODUCTS = loadProducts();
    const cart = loadCart();
    if(!cart.length){
      alert("Carrinho vazio.");
      return;
    }

    const nome = $("nome").value.trim();
    const telefone = $("telefone").value.trim();
    const endereco = $("endereco").value.trim();
    const pag = pagamento.value;
    const troco = $("troco").value.trim();
    const obs = $("obs").value.trim();

    if(!nome || !endereco || !pag){
      alert("Preencha nome, endereço e pagamento.");
      return;
    }

    const msg = buildMessage({nome, telefone, endereco, pagamento: pag, troco, obs});
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener");
  });

  // init
  render();
})();(function () {
  const WHATSAPP_NUMBER = "5538998347326"; // 55 + DDD + número
  const LS_CART = "magao_cart_v2";
  const LS_PRODUCTS = "magao_products_v2";

  function moneyBRL(value) {
    return (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

  function defaultSvg(name) {
    const text = (name || "Produto").split(" ").slice(0, 2).join(" ");
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
          font-family="Arial" font-size="44" fill="#e9ecf2" opacity="0.95">${escapeHtml(text)}</text>
      </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
  }

  function loadProducts() {
    try {
      const raw = localStorage.getItem(LS_PRODUCTS);
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr) && arr.length) return arr;
    } catch {}
    return [];
  }

  function hydrateProducts(list) {
    return list.map(p => ({
      ...p,
      active: !!p.active,
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      colors: Array.isArray(p.colors) ? p.colors : [],
      image: p.image || defaultSvg(p.name)
    }));
  }

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

  function cartKey(item) {
    return `${item.productId}__${item.size || ""}__${item.color || ""}`;
  }

  function setQtyByKey(key, qty) {
    const cart = readCart();
    const idx = cart.findIndex(i => cartKey(i) === key);
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

  function totals(PRODUCTS) {
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

  // UI refs
  const ckItemsCount = document.getElementById("ckItemsCount");
  const ckSubtotal = document.getElementById("ckSubtotal");
  const ckCartList = document.getElementById("ckCartList");
  const ckEmptyHint = document.getElementById("ckEmptyHint");
  const ckClearCart = document.getElementById("ckClearCart");

  const pagamento = document.getElementById("pagamento");
  const trocoWrap = document.getElementById("trocoWrap");
  const outroWrap = document.getElementById("outroWrap");

  function renderCartList() {
    const PRODUCTS = hydrateProducts(loadProducts());
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
      const key = cartKey(it);

      return `
        <div class="cartItem">
          <div class="cartItem__thumb">
            <img src="${p.image}" alt="${escapeHtml(p.name)}" />
          </div>

          <div>
            <div class="cartItem__title">${escapeHtml(p.name)}</div>
            <div class="cartItem__muted">${escapeHtml(p.brand)} • ${escapeHtml(capCategory(p.category))}</div>
            <div class="cartItem__muted">Tamanho: <b>${escapeHtml(it.size || "-")}</b>${it.color ? ` • Cor: <b>${escapeHtml(it.color)}</b>` : ""}</div>
            <div class="cartItem__muted">${moneyBRL(p.price)} cada</div>
          </div>

          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <div class="qty">
              <button type="button" data-dec="${key}">−</button>
              <span>${it.qty}</span>
              <button type="button" data-inc="${key}">+</button>
            </div>
            <div style="font-weight:900">${moneyBRL((Number(p.price)||0) * it.qty)}</div>
            <button class="btn btn--ghost" type="button" data-del="${key}" style="padding:8px 10px">Remover</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderSummary() {
    const PRODUCTS = hydrateProducts(loadProducts());
    const t = totals(PRODUCTS);
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

    if (inc) setQtyByKey(inc.getAttribute("data-inc"), getQtyByKey(inc.getAttribute("data-inc")) + 1);
    if (dec) setQtyByKey(dec.getAttribute("data-dec"), getQtyByKey(dec.getAttribute("data-dec")) - 1);
    if (del) setQtyByKey(del.getAttribute("data-del"), 0);
  });

  function getQtyByKey(key){
    const cart = readCart();
    const item = cart.find(i => cartKey(i) === key);
    return item ? item.qty : 0;
  }

  ckClearCart.addEventListener("click", clearCart);

  pagamento.addEventListener("change", () => {
    const v = pagamento.value;
    trocoWrap.style.display = v === "Dinheiro" ? "flex" : "none";
    outroWrap.style.display = v === "Outro" ? "flex" : "none";
  });

  function buildWhatsAppMessage(formData) {
    const PRODUCTS = hydrateProducts(loadProducts());
    const cart = readCart();
    const t = totals(PRODUCTS);

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
      const opt = `Tamanho: ${it.size || "-"}${it.color ? ` | Cor: ${it.color}` : ""}`;
      lines.push(`• ${p.name} — ${it.qty}x — ${moneyBRL((Number(p.price)||0) * it.qty)}`);
      lines.push(`  (${p.brand} | ${capCategory(p.category)} | ${opt})`);
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


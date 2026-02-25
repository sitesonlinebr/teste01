(function () {
  const LS_PRODUCTS = "magao_products";
  const LS_CART = "magao_cart";
  const LS_CATEGORY = "magao_category";

  const PRODUCTS_URL = "./produtos.json"; // ✅ arquivo compartilhado (hosting)

  const $ = (id) => document.getElementById(id);

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch { return null; }
  }
  function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function normalize(s) {
    return (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }
  function moneyBRL(v){ return (Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
  function capCategory(cat){
    const map={corrida:"Corrida",casual:"Casual",basket:"Basquete",skate:"Skate"};
    return map[cat]||cat||"—";
  }
  function escapeXml(unsafe){
    return String(unsafe).replace(/[<>&'"]/g,c=>({ "<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;" }[c]));
  }
  function defaultSvg(name){
    const text=(name||"Produto").split(" ").slice(0,2).join(" ");
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="44" fill="#111827" opacity="0.7">${escapeXml(text)}</text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
  }

  function safeKey(productId,size,color){ return encodeURIComponent([productId,size||"",color||""].join("|")); }
  function parseKey(key){
    const decoded = decodeURIComponent(key||"");
    const [productId,size,color]=decoded.split("|");
    return {productId,size,color};
  }

  function hydrateProducts(list){
    return (list||[]).map(p=>({
      ...p,
      active: !!p.active,
      sizes: Array.isArray(p.sizes)?p.sizes:[],
      colors: Array.isArray(p.colors)?p.colors:[],
      image: p.image || defaultSvg(p.name),
      stars: Math.min(5, Math.max(0, Number(p.stars ?? 5) || 5)),
      installments: Math.min(12, Math.max(1, Number(p.installments ?? 5) || 5)),
      discountPercent: Math.min(90, Math.max(0, Number(p.discountPercent ?? 0) || 0)),
    }));
  }

  // ✅ busca produtos da internet (JSON)
  async function fetchProductsRemote(){
    try{
      const res = await fetch(PRODUCTS_URL, { cache: "no-store" });
      if(!res.ok) return null;
      const data = await res.json();
      if(!data || !Array.isArray(data.products)) return null;
      return data.products;
    }catch{
      return null;
    }
  }

  function loadProductsLocal(){
    const arr = readJSON(LS_PRODUCTS);
    return Array.isArray(arr) ? arr : [];
  }

  // ✅ Fonte principal: remoto -> fallback: local
  async function getProducts(){
    const remote = await fetchProductsRemote();
    if(remote && remote.length){
      // salva no local também pra acelerar depois
      writeJSON(LS_PRODUCTS, remote);
      return remote;
    }
    return loadProductsLocal();
  }

  function readCart(){
    const arr = readJSON(LS_CART);
    return Array.isArray(arr) ? arr : [];
  }
  function writeCart(cart){ writeJSON(LS_CART, cart); }

  // UI refs
  const grid = $("grid");
  const resultsInfo = $("resultsInfo");
  const searchInput = $("searchInput");
  const clearSearchBtn = $("clearSearchBtn");
  const yearEl = $("year");

  const chips = Array.from(document.querySelectorAll(".chip"));
  let activeCategory = localStorage.getItem(LS_CATEGORY) || "all";
  let query = "";

  const cartDrawer = $("cartDrawer");
  const openCartBtn = $("openCartBtn");
  const cartItemsEl = $("cartItems");
  const cartSummaryEl = $("cartSummary");
  const cartCountEl = $("cartCount");
  const subtotalEl = $("subtotal");
  const clearCartBtn = $("clearCartBtn");

  function openDrawer(){
    cartDrawer.classList.add("is-open");
    cartDrawer.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
  }
  function closeDrawer(){
    cartDrawer.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden","true");
    document.body.style.overflow="";
  }
  function setActiveChip(){
    chips.forEach(ch=>ch.classList.toggle("is-active", ch.dataset.category===activeCategory));
  }

  function filteredProducts(PRODUCTS){
    const q = normalize(query);
    return PRODUCTS
      .filter(p=>p.active)
      .filter(p => activeCategory==="all" || p.category===activeCategory)
      .filter(p=>{
        if(!q) return true;
        const hay = normalize(`${p.name} ${p.brand} ${p.category} ${p.desc}`);
        return hay.includes(q);
      });
  }

  function cartTotals(PRODUCTS){
    const cart=readCart();
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

  function renderStars(n){
    n = Math.min(5, Math.max(0, Number(n)||0));
    let s="";
    for(let i=0;i<n;i++) s+=`<span class="star">★</span>`;
    return s;
  }

  async function renderAll(){
    const PRODUCTS = hydrateProducts(await getProducts());
    renderGrid(PRODUCTS);
    renderCartUI(PRODUCTS);
  }

  function renderGrid(PRODUCTS){
    const list = filteredProducts(PRODUCTS);
    resultsInfo.textContent = `${list.length} produto(s)`;

    grid.innerHTML = list.map(p=>{
      const hasColors = p.colors.length>0;
      const sizeOptions = p.sizes.map(s=>`<option value="${escapeXml(s)}">${escapeXml(s)}</option>`).join("");
      const colorOptions = hasColors ? p.colors.map(c=>`<option value="${escapeXml(c)}">${escapeXml(c)}</option>`).join("") : "";
      const installmentValue = (Number(p.price)||0) / (p.installments||5);

      return `
        <article class="card">
          <div class="card__img">
            ${p.discountPercent ? `<div class="badgeOff">-${p.discountPercent}%</div>`:""}
            <img src="${p.image}" alt="${escapeXml(p.name)}" />
          </div>
          <div class="card__body">
            <div class="stars">${renderStars(p.stars)}</div>
            <div class="card__title">${escapeXml(p.name)}</div>

            <div class="card__meta">
              <span class="pill">${escapeXml(p.brand||"")}</span>
              <span class="pill">${escapeXml(capCategory(p.category))}</span>
              ${p.colors.length ? `<span class="pill">${p.colors.length} cores</span>`:""}
              ${p.sizes.length ? `<span class="pill">${p.sizes.length} tamanhos</span>`:""}
            </div>

            <div class="muted">${escapeXml(p.desc||"")}</div>

            <div>
              ${p.oldPrice ? `<div class="old">${moneyBRL(p.oldPrice)}</div>`:`<div class="old"> </div>`}
              <div class="price">${moneyBRL(p.price)} <span class="pixLine">no Pix</span></div>
              <div class="installLine">ou ${p.installments}x de ${moneyBRL(installmentValue)}</div>
            </div>

            <div class="opts">
              <div class="optBox">
                <b>Tamanho</b>
                <select id="size_${p.id}">
                  <option value="">Selecione</option>
                  ${sizeOptions}
                </select>
              </div>
              <div class="optBox" style="${hasColors ? "" : "opacity:.6"}">
                <b>Cor</b>
                <select id="color_${p.id}" ${hasColors ? "" : "disabled"}>
                  <option value="">${hasColors ? "Selecione" : "Sem cor"}</option>
                  ${colorOptions}
                </select>
              </div>
            </div>

            <div class="actions">
              <button class="btn btn--primary" data-buy="${p.id}" type="button">Comprar</button>
              <button class="btn" data-add="${p.id}" type="button">Adicionar</button>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderCartUI(PRODUCTS){
    const valid = new Set(PRODUCTS.map(p=>p.id));
    const cart = readCart().filter(i=>valid.has(i.productId));
    writeCart(cart);

    const t = cartTotals(PRODUCTS);
    cartCountEl.textContent = String(t.count);
    cartSummaryEl.textContent = `${t.count} item(ns)`;
    subtotalEl.textContent = moneyBRL(t.subtotal);

    if(!cart.length){
      cartItemsEl.innerHTML = `<div class="muted" style="padding:10px">Carrinho vazio.</div>`;
      return;
    }

    cartItemsEl.innerHTML = cart.map(it=>{
      const p = PRODUCTS.find(x=>x.id===it.productId);
      if(!p) return "";
      const key = safeKey(it.productId, it.size, it.color);

      return `
        <div class="cartItem">
          <div class="cartThumb"><img src="${p.image}" alt="${escapeXml(p.name)}"></div>
          <div>
            <div class="cartTitle">${escapeXml(p.name)}</div>
            <div class="cartSub">${escapeXml(p.brand||"")} • ${escapeXml(capCategory(p.category))}</div>
            <div class="cartSub">Tam: <b>${escapeXml(it.size||"-")}</b>${it.color?` • Cor: <b>${escapeXml(it.color)}</b>`:""}</div>
            <div class="cartSub">${moneyBRL(p.price)} cada</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <div class="qty">
              <button type="button" data-dec="${key}">−</button>
              <span>${it.qty}</span>
              <button type="button" data-inc="${key}">+</button>
            </div>
            <div style="font-weight:900">${moneyBRL((Number(p.price)||0)*(Number(it.qty)||0))}</div>
            <button class="btn btn--ghost" type="button" data-del="${key}" style="padding:8px 10px">Remover</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function addToCart(PRODUCTS, productId, openAfter){
    const p = PRODUCTS.find(x=>x.id===productId && x.active);
    if(!p) return alert("Produto indisponível.");

    const size = document.getElementById(`size_${productId}`)?.value || "";
    const color = document.getElementById(`color_${productId}`)?.value || "";

    if(!size) return alert("Selecione o tamanho.");
    if(p.colors.length && !color) return alert("Selecione a cor.");

    const key = safeKey(productId, size, color);
    let cart = readCart();
    const idx = cart.findIndex(i => safeKey(i.productId,i.size,i.color) === key);

    if(idx>=0) cart[idx].qty = (Number(cart[idx].qty)||0) + 1;
    else cart.push({ productId, size, color, qty:1 });

    writeCart(cart);
    renderCartUI(PRODUCTS);
    if(openAfter) openDrawer();
  }

  function adjustQty(PRODUCTS, encodedKey, deltaOrZero){
    const {productId,size,color} = parseKey(encodedKey);
    const key = safeKey(productId,size,color);

    let cart=readCart();
    const idx = cart.findIndex(i => safeKey(i.productId,i.size,i.color) === key);
    if(idx===-1) return;

    if(deltaOrZero===0) cart.splice(idx,1);
    else{
      const next = Math.max(0, (Number(cart[idx].qty)||0) + deltaOrZero);
      if(next===0) cart.splice(idx,1);
      else cart[idx].qty = next;
    }

    writeCart(cart);
    renderCartUI(PRODUCTS);
  }

  // events
  chips.forEach(ch=>{
    ch.addEventListener("click", async ()=>{
      activeCategory = ch.dataset.category;
      localStorage.setItem(LS_CATEGORY, activeCategory);
      setActiveChip();
      await renderAll();
    });
  });

  grid.addEventListener("click", async (e)=>{
    const buy = e.target.closest("[data-buy]");
    const add = e.target.closest("[data-add]");
    if(!buy && !add) return;

    const PRODUCTS = hydrateProducts(await getProducts());
    if(buy) addToCart(PRODUCTS, buy.getAttribute("data-buy"), true);
    if(add) addToCart(PRODUCTS, add.getAttribute("data-add"), false);
  });

  openCartBtn.addEventListener("click", openDrawer);

  cartDrawer.addEventListener("click", async (e)=>{
    if(e.target.matches("[data-close]") || e.target.closest("[data-close]")) closeDrawer();

    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const del = e.target.closest("[data-del]");

    if(!inc && !dec && !del) return;

    const PRODUCTS = hydrateProducts(await getProducts());

    if(inc) adjustQty(PRODUCTS, inc.getAttribute("data-inc"), +1);
    if(dec) adjustQty(PRODUCTS, dec.getAttribute("data-dec"), -1);
    if(del) adjustQty(PRODUCTS, del.getAttribute("data-del"), 0);
  });

  clearCartBtn.addEventListener("click", async ()=>{
    writeCart([]);
    await renderAll();
  });

  searchInput.addEventListener("input", async ()=>{
    query = searchInput.value || "";
    await renderAll();
  });

  clearSearchBtn.addEventListener("click", async ()=>{
    searchInput.value=""; query="";
    await renderAll();
    searchInput.focus();
  });

  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeDrawer(); });

  // init
  migrateOnce();
  yearEl.textContent = String(new Date().getFullYear());
  setActiveChip();
  renderAll();
})();

(function () {
  const LS_PRODUCTS = "magao_products";
  const LS_CART = "magao_cart";
  const LS_LAST_CATEGORY = "magao_category";

  const LEGACY_PRODUCTS = ["magao_products_v2", "magao_products_v1"];
  const LEGACY_CART = ["magao_cart_v2", "magao_cart_v1"];

  const $ = (id) => document.getElementById(id);

  function normalize(s) {
    return (s || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function moneyBRL(value) {
    return (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function capCategory(cat) {
    const map = { corrida: "Corrida", casual: "Casual", basket: "Basquete", skate: "Skate" };
    return map[cat] || cat;
  }

  function escapeXml(unsafe) {
    return String(unsafe).replace(/[<>&'"]/g, c => ({
      "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
    }[c]));
  }

  function defaultSvg(name) {
    const text = (name || "Produto").split(" ").slice(0, 2).join(" ");
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#2563eb" stop-opacity="0.18"/>
            <stop offset="1" stop-color="#60a5fa" stop-opacity="0.20"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          font-family="Arial" font-size="44" fill="#0f172a" opacity="0.85">${escapeXml(text)}</text>
      </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
  }

  function safeKey(productId, size, color) {
    return encodeURIComponent([productId, size || "", color || ""].join("|"));
  }

  function parseKey(key) {
    const decoded = decodeURIComponent(key || "");
    const [productId, size, color] = decoded.split("|");
    return { productId, size, color };
  }

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function migrateStorage() {
    if (!localStorage.getItem(LS_PRODUCTS)) {
      for (const k of LEGACY_PRODUCTS) {
        const v = readJSON(k);
        if (Array.isArray(v) && v.length) {
          writeJSON(LS_PRODUCTS, v);
          break;
        }
      }
    }
    if (!localStorage.getItem(LS_CART)) {
      for (const k of LEGACY_CART) {
        const v = readJSON(k);
        if (Array.isArray(v) && v.length) {
          writeJSON(LS_CART, v);
          break;
        }
      }
    }
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
        sizes: ["37","38","39","40","41","42","43"],
        colors: ["Preto","Branco"],
        desc: "Leve, confortável e com boa absorção de impacto.",
        image: "",
        active: true
      }
    ];
  }

  function loadProducts() {
    const arr = readJSON(LS_PRODUCTS);
    if (Array.isArray(arr) && arr.length) return arr;
    const defs = defaultProducts();
    writeJSON(LS_PRODUCTS, defs);
    return defs;
  }

  function hydrateProducts(list) {
    return (list || []).map(p => ({
      ...p,
      active: !!p.active,
      sizes: Array.isArray(p.sizes) ? p.sizes : [],
      colors: Array.isArray(p.colors) ? p.colors : [],
      image: p.image || defaultSvg(p.name)
    }));
  }

  function readCart() {
    const arr = readJSON(LS_CART);
    return Array.isArray(arr) ? arr : [];
  }

  function writeCart(cart) {
    writeJSON(LS_CART, cart);
  }

  // ---------- UI refs ----------
  const grid = $("grid");
  const searchInput = $("searchInput");
  const clearSearchBtn = $("clearSearchBtn");
  const resultsInfo = $("resultsInfo");
  const yearEl = $("year");

  const chips = Array.from(document.querySelectorAll(".chip"));
  let activeCategory = localStorage.getItem(LS_LAST_CATEGORY) || "all";
  let query = "";

  const cartDrawer = $("cartDrawer");
  const openCartBtn = $("openCartBtn");
  const cartItemsEl = $("cartItems");
  const cartCountEl = $("cartCount");
  const cartSummaryEl = $("cartSummary");
  const subtotalEl = $("subtotal");
  const clearCartBtn = $("clearCartBtn");

  // ---------- drawer ----------
  function openDrawer() {
    cartDrawer.classList.add("is-open");
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    cartDrawer.classList.remove("is-open");
    cartDrawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function setActiveChip() {
    chips.forEach(ch => ch.classList.toggle("is-active", ch.dataset.category === activeCategory));
  }

  function filteredProducts(PRODUCTS) {
    const q = normalize(query);
    return PRODUCTS
      .filter(p => p.active)
      .filter(p => {
        const inCat = activeCategory === "all" || p.category === activeCategory;
        if (!inCat) return false;
        if (!q) return true;
        const hay = normalize(`${p.name} ${p.brand} ${p.category} ${p.desc}`);
        return hay.includes(q);
      });
  }

  function renderGrid() {
    const PRODUCTS = hydrateProducts(loadProducts());
    const list = filteredProducts(PRODUCTS);

    grid.innerHTML = list.map(p => {
      const hasColors = (p.colors || []).length > 0;

      const sizeOptions = p.sizes.map(s => `<option value="${escapeXml(s)}">${escapeXml(s)}</option>`).join("");
      const colorOptions = hasColors ? p.colors.map(c => `<option value="${escapeXml(c)}">${escapeXml(c)}</option>`).join("") : "";

      return `
        <article class="card">
          <div class="card__img">
            <img src="${p.image}" alt="${escapeXml(p.name)}" />
          </div>

          <div class="card__body">
            <div class="card__title">${escapeXml(p.name)}</div>

            <div class="card__meta">
              <span class="pill">${escapeXml(p.brand)}</span>
              <span class="pill">${escapeXml(capCategory(p.category))}</span>
            </div>

            <div class="muted">${escapeXml(p.desc)}</div>

            <div class="priceRow">
              <div>
                <div class="price">${moneyBRL(p.price)}</div>
                <div class="old">${p.oldPrice ? moneyBRL(p.oldPrice) : "—"}</div>
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
              <div class="pill" style="display:flex;flex-direction:column;gap:6px">
                <b style="font-size:12px;color:var(--muted)">Tamanho</b>
                <select id="size_${p.id}" style="border:0;outline:0;background:transparent;color:var(--text)">
                  <option value="">Selecione</option>
                  ${sizeOptions}
                </select>
              </div>

              <div class="pill" style="display:flex;flex-direction:column;gap:6px;${hasColors ? "" : "opacity:.6"}">
                <b style="font-size:12px;color:var(--muted)">Cor</b>
                <select id="color_${p.id}" ${hasColors ? "" : "disabled"} style="border:0;outline:0;background:transparent;color:var(--text)">
                  <option value="">${hasColors ? "Selecione" : "Sem cor"}</option>
                  ${colorOptions}
                </select>
              </div>
            </div>

            <div class="card__actions">
              <button class="btn btn--primary" data-buy="${p.id}" type="button">Comprar</button>
              <button class="btn" data-add="${p.id}" type="button">Adicionar ao carrinho</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    resultsInfo.textContent =
      activeCategory === "all" && !query
        ? "Mostrando todos os produtos"
        : `Encontrados ${list.length} produto(s)`;
  }

  function cartTotals(PRODUCTS) {
    const cart = readCart();
    let count = 0;
    let subtotal = 0;

    for (const it of cart) {
      const p = PRODUCTS.find(x => x.id === it.productId);
      if (!p) continue;
      count += (Number(it.qty) || 0);
      subtotal += (Number(p.price) || 0) * (Number(it.qty) || 0);
    }
    return { count, subtotal };
  }

  function renderCartUI() {
    const PRODUCTS = hydrateProducts(loadProducts());

    const validIds = new Set(PRODUCTS.map(p => p.id));
    const cleaned = readCart().filter(i => validIds.has(i.productId));
    writeCart(cleaned);

    const totals = cartTotals(PRODUCTS);
    cartCountEl.textContent = String(totals.count);
    cartSummaryEl.textContent = `${totals.count} item(ns)`;
    subtotalEl.textContent = moneyBRL(totals.subtotal);

    if (!cleaned.length) {
      cartItemsEl.innerHTML = `<div class="muted" style="padding:10px">Seu carrinho está vazio 🙂</div>`;
      return;
    }

    cartItemsEl.innerHTML = cleaned.map(it => {
      const p = PRODUCTS.find(x => x.id === it.productId);
      if (!p) return "";
      const key = safeKey(it.productId, it.size, it.color);

      return `
        <div class="cartItem">
          <div class="cartItem__thumb">
            <img src="${p.image}" alt="${escapeXml(p.name)}" />
          </div>

          <div>
            <div class="cartItem__title">${escapeXml(p.name)}</div>
            <div class="cartItem__muted">${moneyBRL(p.price)} • ${escapeXml(p.brand)} • ${escapeXml(capCategory(p.category))}</div>
            <div class="cartItem__muted">Tamanho: <b>${escapeXml(it.size || "-")}</b>${it.color ? ` • Cor: <b>${escapeXml(it.color)}</b>` : ""}</div>
          </div>

          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <div class="qty">
              <button type="button" data-dec="${key}">−</button>
              <span>${it.qty}</span>
              <button type="button" data-inc="${key}">+</button>
            </div>
            <div style="font-weight:900">${moneyBRL((Number(p.price)||0) * (Number(it.qty)||0))}</div>
            <button class="btn btn--ghost" type="button" data-del="${key}" style="padding:8px 10px">Remover</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function addToCart(productId, openAfter) {
    const PRODUCTS = hydrateProducts(loadProducts());
    const p = PRODUCTS.find(x => x.id === productId && x.active);
    if (!p) return alert("Produto indisponível.");

    const sizeSel = document.getElementById(`size_${productId}`);
    const colorSel = document.getElementById(`color_${productId}`);
    const size = sizeSel ? sizeSel.value : "";
    const color = colorSel ? colorSel.value : "";

    if (!size) return alert("Selecione o tamanho.");
    if ((p.colors || []).length && !color) return alert("Selecione a cor.");

    let cart = readCart();
    const key = safeKey(productId, size, color);
    const idx = cart.findIndex(i => safeKey(i.productId, i.size, i.color) === key);

    if (idx >= 0) cart[idx].qty = (Number(cart[idx].qty) || 0) + 1;
    else cart.push({ productId, size, color, qty: 1 });

    writeCart(cart);
    renderCartUI();
    if (openAfter) openDrawer();
  }

  function setQtyByKey(encodedKey, deltaOrZero) {
    const { productId, size, color } = parseKey(encodedKey);
    const key = safeKey(productId, size, color);

    let cart = readCart();
    const idx = cart.findIndex(i => safeKey(i.productId, i.size, i.color) === key);
    if (idx === -1) return;

    if (deltaOrZero === 0) {
      cart.splice(idx, 1);
    } else {
      const nextQty = Math.max(0, (Number(cart[idx].qty) || 0) + deltaOrZero);
      if (nextQty === 0) cart.splice(idx, 1);
      else cart[idx].qty = nextQty;
    }

    writeCart(cart);
    renderCartUI();
  }

  function clearCart() {
    writeCart([]);
    renderCartUI();
  }

  // ---------- events ----------
  chips.forEach(ch => {
    ch.addEventListener("click", () => {
      activeCategory = ch.dataset.category;
      localStorage.setItem(LS_LAST_CATEGORY, activeCategory);
      setActiveChip();
      renderGrid();
    });
  });

  grid.addEventListener("click", (e) => {
    const buy = e.target.closest("[data-buy]");
    const add = e.target.closest("[data-add]");

    if (buy) return addToCart(buy.getAttribute("data-buy"), true);
    if (add) return addToCart(add.getAttribute("data-add"), false);
  });

  cartDrawer.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]") || e.target.closest("[data-close]")) closeDrawer();

    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    const del = e.target.closest("[data-del]");

    if (inc) setQtyByKey(inc.getAttribute("data-inc"), +1);
    if (dec) setQtyByKey(dec.getAttribute("data-dec"), -1);
    if (del) setQtyByKey(del.getAttribute("data-del"), 0);
  });

  openCartBtn.addEventListener("click", openDrawer);
  clearCartBtn.addEventListener("click", clearCart);

  searchInput.addEventListener("input", () => {
    query = searchInput.value || "";
    renderGrid();
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    query = "";
    renderGrid();
    searchInput.focus();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  // ---------- init ----------
  migrateStorage();
  yearEl.textContent = String(new Date().getFullYear());
  setActiveChip();
  renderGrid();
  renderCartUI();
})();

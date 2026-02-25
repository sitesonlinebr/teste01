(function () {
  const LS_CART = "magao_cart_v1";
  const LS_LAST_CATEGORY = "magao_category_v1";
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
      },
      {
        id: "mt-002",
        name: "Tênis Casual Street Lux",
        brand: "Urban",
        category: "casual",
        price: 189.9,
        oldPrice: 229.9,
        sizeInfo: "Num: 36 ao 42",
        desc: "Estilo para o dia a dia, combina com tudo.",
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

  // Carrega produtos e garante imagem
  let PRODUCTS = loadProducts().map(p => {
    const img = (p.image && p.image.startsWith("http")) ? p.image : (p.image || svgDataUri((p.name || "Produto").split(" ").slice(0, 2).join(" ")));
    return { ...p, image: img, active: !!p.active };
  });

  // --- Carrinho ---
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

  function addToCart(productId) {
    const p = PRODUCTS.find(x => x.id === productId && x.active);
    if (!p) {
      alert("Esse produto não está disponível.");
      return;
    }
    const cart = readCart();
    const item = cart.find(i => i.productId === productId);
    if (item) item.qty += 1;
    else cart.push({ productId, qty: 1 });
    writeCart(cart);
    renderCartUI();
  }

  function setQty(productId, qty) {
    const cart = readCart();
    const idx = cart.findIndex(i => i.productId === productId);
    if (idx === -1) return;
    const nextQty = Math.max(0, Number(qty) || 0);
    if (nextQty === 0) cart.splice(idx, 1);
    else cart[idx].qty = nextQty;
    writeCart(cart);
    renderCartUI();
  }

  function clearCart() {
    writeCart([]);
    renderCartUI();
  }

  function cartTotals() {
    const cart = readCart();
    let count = 0;
    let subtotal = 0;
    for (const it of cart) {
      const p = PRODUCTS.find(x => x.id === it.productId);
      if (!p) continue;
      count += it.qty;
      subtotal += (Number(p.price) || 0) * it.qty;
    }
    return { count, subtotal };
  }

  function moneyBRL(value) {
    return (Number(value) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // --- Render catálogo ---
  const grid = document.getElementById("grid");
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const resultsInfo = document.getElementById("resultsInfo");
  const year = document.getElementById("year");

  const chips = Array.from(document.querySelectorAll(".chip"));
  let activeCategory = localStorage.getItem(LS_LAST_CATEGORY) || "all";
  let query = "";

  function normalize(s) {
    return (s || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
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

  function filteredProducts() {
    const q = normalize(query);
    return PRODUCTS
      .filter(p => p.active) // só ativos
      .filter(p => {
        const inCat = activeCategory === "all" || p.category === activeCategory;
        if (!inCat) return false;
        if (!q) return true;
        const hay = normalize(`${p.name} ${p.brand} ${p.category} ${p.desc} ${p.tag || ""}`);
        return hay.includes(q);
      });
  }

  function renderGrid() {
    // Recarrega produtos (caso admin altere e o usuário volte pro index sem recarregar hard)
    PRODUCTS = loadProducts().map(p => {
      const img = (p.image && p.image.startsWith("http")) ? p.image : (p.image || svgDataUri((p.name || "Produto").split(" ").slice(0, 2).join(" ")));
      return { ...p, image: img, active: !!p.active };
    });

    const list = filteredProducts();
    grid.innerHTML = list.map(p => `
      <article class="card">
        <div class="card__img">
          <img src="${p.image}" alt="${escapeHtml(p.name)}" />
        </div>
        <div class="card__body">
          <div class="card__title">${escapeHtml(p.name)}</div>
          <div class="card__meta">
            <span class="pill">${escapeHtml(p.brand)}</span>
            <span class="pill">${escapeHtml(capCategory(p.category))}</span>
            <span class="pill">${escapeHtml(p.sizeInfo)}</span>
            ${p.tag ? `<span class="pill">${escapeHtml(p.tag)}</span>` : ""}
          </div>
          <div class="muted">${escapeHtml(p.desc)}</div>

          <div class="priceRow">
            <div>
              <div class="price">${moneyBRL(p.price)}</div>
              <div class="old">${p.oldPrice ? moneyBRL(p.oldPrice) : "—"}</div>
            </div>
          </div>

          <div class="card__actions">
            <button class="btn btn--primary" data-add="${p.id}" type="button">Adicionar ao carrinho</button>
            <a class="btn" href="${p.mlLink}" target="_blank" rel="noopener">Comprar (link)</a>
          </div>
        </div>
      </article>
    `).join("");

    const msg =
      activeCategory === "all" && !query
        ? "Mostrando todos os produtos"
        : `Encontrados ${list.length} produto(s)`;
    resultsInfo.textContent = msg;
  }

  // --- Drawer carrinho ---
  const cartDrawer = document.getElementById("cartDrawer");
  const openCartBtn = document.getElementById("openCartBtn");
  const cartItemsEl = document.getElementById("cartItems");
  const cartCountEl = document.getElementById("cartCount");
  const cartSummaryEl = document.getElementById("cartSummary");
  const subtotalEl = document.getElementById("subtotal");
  const clearCartBtn = document.getElementById("clearCartBtn");

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

  function renderCartUI() {
    // Recarrega produtos para refletir alterações
    PRODUCTS = loadProducts().map(p => {
      const img = (p.image && p.image.startsWith("http")) ? p.image : (p.image || svgDataUri((p.name || "Produto").split(" ").slice(0, 2).join(" ")));
      return { ...p, image: img, active: !!p.active };
    });

    const cart = readCart();
    // remove do carrinho itens que não existem mais
    const validIds = new Set(PRODUCTS.map(p => p.id));
    const cleaned = cart.filter(i => validIds.has(i.productId));
    if (cleaned.length !== cart.length) writeCart(cleaned);

    const totals = cartTotals();
    cartCountEl.textContent = String(totals.count);
    cartSummaryEl.textContent = `${totals.count} item(ns)`;
    subtotalEl.textContent = moneyBRL(totals.subtotal);

    if (!cleaned.length) {
      cartItemsEl.innerHTML = `
        <div class="muted" style="padding:10px">
          Seu carrinho está vazio. Adicione produtos no catálogo 🙂
        </div>`;
      return;
    }

    cartItemsEl.innerHTML = cleaned.map(it => {
      const p = PRODUCTS.find(x => x.id === it.productId);
      if (!p) return "";
      return `
        <div class="cartItem">
          <div class="cartItem__thumb">
            <img src="${p.image}" alt="${escapeHtml(p.name)}" />
          </div>

          <div>
            <div class="cartItem__title">${escapeHtml(p.name)}</div>
            <div class="cartItem__muted">${moneyBRL(p.price)} • ${escapeHtml(p.sizeInfo)}</div>
            <div class="cartItem__muted">${escapeHtml(p.brand)} • ${escapeHtml(capCategory(p.category))}</div>
          </div>

          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <div class="qty" aria-label="Quantidade">
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

  // --- Eventos ---
  function setActiveChip() {
    chips.forEach(ch => ch.classList.toggle("is-active", ch.dataset.category === activeCategory));
  }

  chips.forEach(ch => {
    ch.addEventListener("click", () => {
      activeCategory = ch.dataset.category;
      localStorage.setItem(LS_LAST_CATEGORY, activeCategory);
      setActiveChip();
      renderGrid();
    });
  });

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    addToCart(btn.getAttribute("data-add"));
    openDrawer();
  });

  cartDrawer.addEventListener("click", (e) => {
    if (e.target.matches("[data-close]") || e.target.closest("[data-close]")) closeDrawer();

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

  // init
  year.textContent = String(new Date().getFullYear());
  setActiveChip();
  renderGrid();
  renderCartUI();
})();
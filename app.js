const LS_PRODUCTS = "magao_products";
const LS_CART = "magao_cart";

const grid = document.getElementById("grid");
const cartDrawer = document.getElementById("cartDrawer");
const cartItemsEl = document.getElementById("cartItems");
const subtotalEl = document.getElementById("subtotal");
const cartCountEl = document.getElementById("cartCount");

document.getElementById("year").textContent = new Date().getFullYear();

function readJSON(key){
  try{return JSON.parse(localStorage.getItem(key)||"[]")}
  catch{return []}
}
function writeJSON(key,val){
  localStorage.setItem(key,JSON.stringify(val));
}

function loadProducts(){
  const products = readJSON(LS_PRODUCTS);
  return products.length ? products : [];
}

function render(){
  const products = loadProducts();

  if(!products.length){
    grid.innerHTML = "<p>Nenhum produto cadastrado.</p>";
    return;
  }

  grid.innerHTML = products.map(p=>`
    <div class="card">
      <img src="${p.image}" alt="">
      <div class="card__body">
        <div class="card__title">${p.name}</div>
        <div class="muted">${p.desc}</div>
        <div class="price">R$ ${p.price}</div>

        <div class="actions">
          <button class="buyBtn" onclick="buy('${p.id}')">Comprar</button>
          <button class="addBtn" onclick="add('${p.id}')">Adicionar</button>
        </div>
      </div>
    </div>
  `).join("");

  updateCartUI();
}

function add(productId){
  const cart = readJSON(LS_CART);
  const idx = cart.findIndex(i=>i.id===productId);

  if(idx>=0) cart[idx].qty++;
  else cart.push({id:productId,qty:1});

  writeJSON(LS_CART,cart);
  updateCartUI();
}

function buy(productId){
  add(productId);
  openCart();
}

function openCart(){
  cartDrawer.classList.add("open");
}
document.getElementById("openCartBtn").onclick=openCart;
document.getElementById("closeCartBtn").onclick=()=>cartDrawer.classList.remove("open");

function updateCartUI(){
  const products = loadProducts();
  const cart = readJSON(LS_CART);

  let subtotal=0, count=0;

  cartItemsEl.innerHTML = cart.map(it=>{
    const p = products.find(x=>x.id===it.id);
    if(!p) return "";

    subtotal += Number(p.price)*it.qty;
    count += it.qty;

    return `<div>${p.name} • ${it.qty}x</div>`;
  }).join("");

  subtotalEl.textContent = subtotal.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  cartCountEl.textContent = count;
}

document.getElementById("goCheckoutBtn").onclick=()=>{
  const cart = readJSON(LS_CART);
  if(!cart.length){
    alert("Carrinho vazio.");
    return;
  }
  location.href="checkout.html";
};

render();

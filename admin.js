const LS_PRODUCTS = "magao_products";

function readJSON(key){
  try{return JSON.parse(localStorage.getItem(key)||"[]")}
  catch{return []}
}
function writeJSON(key,val){
  localStorage.setItem(key,JSON.stringify(val));
}

function save(){
  const products = readJSON(LS_PRODUCTS);

  const newProduct = {
    id: crypto.randomUUID(),
    name: document.getElementById("name").value,
    price: document.getElementById("price").value,
    desc: document.getElementById("desc").value,
    image: document.getElementById("image").value
  };

  products.push(newProduct);
  writeJSON(LS_PRODUCTS,products);

  renderList();
}

function renderList(){
  const products = readJSON(LS_PRODUCTS);
  document.getElementById("list").innerHTML =
    products.map(p=>`<div>${p.name}</div>`).join("");
}

renderList();

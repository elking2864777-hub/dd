// المنتجات الافتراضية
const defaultProducts = [
  {
    id: 1,
    name: "مكرونة بالصوص الأحمر",
    description: "مكرونة طازجة بصوص الطماطم والتوابل الخاصة",
    price: 120,
    category: "وجبات",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: 2,
    name: "مشويات مشكلة",
    description: "كباب وكفتة وشيش طاووق مع الأرز والسلطة",
    price: 280,
    category: "مشويات",
    image: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=85",
  },
  {
    id: 3,
    name: "ساندوتش كفتة",
    description: "كفتة مشوية على الفحم مع الطحينة والسلطة",
    price: 85,
    category: "ساندوتشات",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=700&q=85",
  }
];

let products = [...defaultProducts];
let cart = JSON.parse(localStorage.getItem("restaurantCart")) || [];
let selectedCategory = "all";
let searchText = "";

// عناصر DOM
const productsContainer = document.getElementById("productsContainer");
const cartSidebar = document.getElementById("cartSidebar");
const cartOverlay = document.getElementById("cartOverlay");
const cartCount = document.getElementById("cartCount");
const cartItems = document.getElementById("cartItems");
const emptyCartMessage = document.getElementById("emptyCartMessage");
const cartFooter = document.getElementById("cartFooter");
const cartTotal = document.getElementById("cartTotal");
const checkoutModal = document.getElementById("checkoutModal");
const checkoutTotal = document.getElementById("checkoutTotal");
const successModal = document.getElementById("successModal");
const orderForm = document.getElementById("orderForm");

// فتح وإغلاق السلة المباشر
function openCart() {
  if (cartSidebar) {
    cartSidebar.classList.add("active");
    cartSidebar.style.right = "0px";
  }
  if (cartOverlay) {
    cartOverlay.classList.remove("hidden");
    cartOverlay.style.display = "block";
  }
}

function closeCart() {
  if (cartSidebar) {
    cartSidebar.classList.remove("active");
    cartSidebar.style.right = "-450px";
  }
  if (cartOverlay) {
    cartOverlay.classList.add("hidden");
    cartOverlay.style.display = "none";
  }
}

// جلب المنتجات من Supabase
async function fetchProductsFromSupabase() {
  try {
    if (typeof supabaseClient !== "undefined") {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("id", { ascending: true });

      if (!error && data && data.length > 0) {
        products = data;
      }
    }
  } catch (err) {
    console.warn("استخدام المنتجات الافتراضية بسبب التتبع/الاتصال:", err);
  } finally {
    renderProducts();
  }
}

// عرض الوجبات
function renderProducts() {
  if (!productsContainer) return;

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === "all" || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  productsContainer.innerHTML = "";

  filtered.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image-wrapper">
        <img src="${product.image}" alt="${product.name}" class="product-image" />
      </div>
      <div class="product-details">
        <h3>${product.name}</h3>
        <p>${product.description || ''}</p>
        <div class="product-bottom">
          <span>${product.price} جنيه</span>
          <button class="primary-button" onclick="addToCart(${product.id})">+ إضافة للسلة</button>
        </div>
      </div>
    `;
    productsContainer.appendChild(card);
  });
}

// عمليات السلة
function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const item = cart.find((i) => i.id === productId);
  if (item) {
    item.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveAndRenderCart();
  openCart();
}

function updateQuantity(productId, change) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    cart = cart.filter((i) => i.id !== productId);
  }

  saveAndRenderCart();
}

function saveAndRenderCart() {
  localStorage.setItem("restaurantCart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (cartCount) cartCount.innerText = totalCount;
  if (cartTotal) cartTotal.innerText = totalPrice;
  if (checkoutTotal) checkoutTotal.innerText = totalPrice;

  if (!cartItems) return;
  cartItems.innerHTML = "";

  if (cart.length === 0) {
    emptyCartMessage?.classList.remove("hidden");
    cartFooter?.classList.add("hidden");
    return;
  }

  emptyCartMessage?.classList.add("hidden");
  cartFooter?.classList.remove("hidden");

  cart.forEach((item) => {
    const itemEl = document.createElement("div");
    itemEl.className = "cart-item";
    itemEl.innerHTML = `
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <span>${item.price} × ${item.quantity} = ${item.price * item.quantity} جنيه</span>
      </div>
      <div class="cart-item-controls">
        <button onclick="updateQuantity(${item.id}, -1)">-</button>
        <span>${item.quantity}</span>
        <button onclick="updateQuantity(${item.id}, 1)">+</button>
      </div>
    `;
    cartItems.appendChild(itemEl);
  });
}

// الأحداث والنموذج
function setupEvents() {
  document.getElementById("openCartButton")?.addEventListener("click", openCart);
  document.getElementById("closeCartButton")?.addEventListener("click", closeCart);
  cartOverlay?.addEventListener("click", closeCart);

  document.getElementById("checkoutButton")?.addEventListener("click", () => {
    closeCart();
    if (checkoutModal) checkoutModal.classList.remove("hidden");
  });

  document.getElementById("closeCheckoutModal")?.addEventListener("click", () => {
    if (checkoutModal) checkoutModal.classList.add("hidden");
  });

  document.getElementById("closeSuccessModal")?.addEventListener("click", () => {
    if (successModal) successModal.classList.add("hidden");
  });

  if (orderForm) {
    orderForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const orderData = {
        customer_name: document.getElementById("customerName").value.trim(),
        customer_phone: document.getElementById("customerPhone").value.trim(),
        customer_address: document.getElementById("customerAddress").value.trim(),
        notes: document.getElementById("orderNotes")?.value.trim() || "",
        total_price: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        items: cart
      };

      try {
        const { data, error } = await supabaseClient
          .from("orders")
          .insert([orderData])
          .select();

        if (error) throw error;

        const orderId = data && data[0] ? data[0].id : Math.floor(1000 + Math.random() * 9000);

        cart = [];
        saveAndRenderCart();

        if (checkoutModal) checkoutModal.classList.add("hidden");
        const orderNum = document.getElementById("successOrderNumber");
        if (orderNum) orderNum.innerText = `#${orderId}`;
        if (successModal) successModal.classList.remove("hidden");
        orderForm.reset();

      } catch (err) {
        alert("حدث خطأ أثناء إرسال الطلب، أعد المحاولة.");
      }
    });
  }
}

// تشغيل عند التحميل
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  renderCart();
  setupEvents();
  fetchProductsFromSupabase();
});
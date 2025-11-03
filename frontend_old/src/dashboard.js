const API = 'http://localhost:5001';

document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const menuGrid = document.getElementById("menuGrid");
  const cartButton = document.getElementById("cartButton");
  const cartSidebar = document.getElementById("cartSidebar");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartCount = document.getElementById("cartCount");
  const cartItemsDiv = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  const placeOrderBtn = document.getElementById("placeOrder");

  // Orders sidebar elements
  const ordersButton = document.getElementById("ordersButton");
  const ordersSidebar = document.getElementById("ordersSidebar");
  const closeOrdersBtn = document.getElementById("closeOrders");
  const myOrdersContainer = document.getElementById("myOrdersContainer") || document.getElementById("myOrdersList");

  document.getElementById("welcomeText").textContent = `Welcome, ${user.username}!`;

  const smartBtn = document.getElementById("smartAppBtn");
  if (smartBtn) {
    smartBtn.addEventListener("click", () => {
      window.location.href = "home.html";
    });
  }

  window.logout = function () {
    localStorage.clear();
    window.location.href = "index.html";
  };

  // Cart storage
  let cart = JSON.parse(localStorage.getItem("cart")) || {};

  // Update cart badge
  function updateCartBadge() {
    const count = Object.values(cart).reduce((sum, i) => sum + (i.qty || 0), 0);
    if (cartCount) cartCount.textContent = count;
  }

  // Render cart sidebar
  function renderCart() {
    if (!cartItemsDiv) return;
    cartItemsDiv.innerHTML = "";
    let total = 0;

    Object.values(cart).forEach(item => {
      const div = document.createElement("div");
      div.className = "cart-item";
      div.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${item.image}" alt="${item.name}" style="width:48px;height:48px;border-radius:6px;object-fit:cover"/>
          <span>${item.name}</span>
        </div>
        <div>
          <button class="qtyBtn" data-id="${item.id}" data-action="dec">−</button>
          <span style="margin:0 8px;">${item.qty}</span>
          <button class="qtyBtn" data-id="${item.id}" data-action="inc">+</button>
          <button class="removeBtn" data-id="${item.id}" style="margin-left:8px;">✕</button>
        </div>
      `;
      cartItemsDiv.appendChild(div);
      total += (item.price || 0) * (item.qty || 0);
    });

    if (cartTotal) cartTotal.textContent = total.toFixed(2);
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartBadge();

    document.querySelectorAll(".qtyBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const action = e.currentTarget.dataset.action;
        if (cart[id]) {
          if (action === "inc") cart[id].qty += 1;
          if (action === "dec") cart[id].qty = Math.max(1, cart[id].qty - 1);
        }
        renderCart();
      });
    });

    document.querySelectorAll(".removeBtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        delete cart[id];
        renderCart();
      });
    });
  }

  // Open/close cart sidebar
  if (cartButton) {
    cartButton.addEventListener("click", () => {
      if (cartSidebar) cartSidebar.classList.add("open");
      if (cartOverlay) cartOverlay.classList.add("active");
      renderCart();
    });
  }

  // overlay click closes both sidebars
  if (cartOverlay) {
    cartOverlay.addEventListener("click", () => {
      if (cartSidebar) cartSidebar.classList.remove("open");
      if (ordersSidebar) ordersSidebar.classList.remove("open");
      cartOverlay.classList.remove("active");
    });
  }

  // Add to Cart
  function addToCart(item) {
    const id = item.id;
    if (!id) {
      alert("Item missing id");
      return;
    }
    if (cart[id]) {
      cart[id].qty += 1;
    } else {
      cart[id] = { ...item, qty: 1 };
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartBadge();
  }

  // Store all menu items for search
  let allMenuItems = [];

  // Render menu items
  function renderMenu(items) {
    menuGrid.innerHTML = "";
    if (!items.length) {
      menuGrid.innerHTML = `<p class="text-center text-gray-500 col-span-full">No items found.</p>`;
      return;
    }

    items.forEach(item => {
      if (!item.available) return;
      const card = document.createElement("div");
      card.className = "card fade-in";
      card.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="h-40 w-full object-cover rounded mb-2">
        <h3 class="font-bold text-lg">${item.name}</h3>
        <p class="text-gray-600 mb-2">₹${item.price}</p>
        <button class="addBtn w-full py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Add to Cart</button>
      `;
      const btn = card.querySelector(".addBtn");
      btn.addEventListener("click", () => {
        addToCart({
          id: item._id || item.id || item.name,
          name: item.name,
          price: item.price,
          image: item.image
        });
      });
      menuGrid.appendChild(card);
    });
  }

  // Load Menu from backend
  async function loadMenu(type = "all") {
    if (!menuGrid) return;
    menuGrid.innerHTML = `<p class="text-center text-gray-500 mt-8 col-span-full">Loading...</p>`;
    let endpoint = `${API}/api/menu`;
    if (type === "specials") endpoint = `${API}/api/menu/specials`;
    if (type === "combos") endpoint = `${API}/api/menu/combos`;

    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      allMenuItems = data.filter(i => i.available); // store for search
      renderMenu(allMenuItems);
    } catch (err) {
      console.error(err);
      menuGrid.innerHTML = `<p class="text-center text-gray-500 col-span-full">Failed to load menu.</p>`;
    }
  }

  // ----------- 🔍 SEARCH BAR FUNCTIONALITY -----------
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderMenu(allMenuItems);
      } else {
        const filtered = allMenuItems.filter(item =>
          item.name.toLowerCase().includes(query)
        );
        renderMenu(filtered);
      }
    });
  }
  // ---------------------------------------------------

  // Filter buttons
  const allBtn = document.getElementById("allMenuBtn");
  const specialBtn = document.getElementById("specialBtn");
  const comboBtn = document.getElementById("comboBtn");
  if (allBtn) allBtn.addEventListener("click", () => loadMenu("all"));
  if (specialBtn) specialBtn.addEventListener("click", () => loadMenu("specials"));
  if (comboBtn) comboBtn.addEventListener("click", () => loadMenu("combos"));

  // Place Order
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", async () => {
      const items = Object.values(cart).map(i => ({ id: i.id, qty: i.qty }));
      const preference = document.getElementById("preference")?.value?.trim() || "";

      if (!items.length) return alert("Cart is empty!");

      try {
        const res = await fetch(`${API}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user.username, items, preference })
        });

        if (!res.ok) {
          const t = await res.text();
          console.error('Order failed', t);
          return alert("Order failed!");
        }

        alert("Order placed successfully!");
        cart = {};
        localStorage.removeItem("cart");
        renderCart();
        if (document.getElementById("preference")) document.getElementById("preference").value = "";
        if (cartSidebar) cartSidebar.classList.remove("open");
        if (cartOverlay) cartOverlay.classList.remove("active");
      } catch (err) {
        console.error('Place order error', err);
        alert("Order failed!");
      }
    });
  }

  // ---------------- Orders (my orders) ----------------
  async function fetchMyOrders() {
    try {
      const url = `${API}/api/orders?user=${encodeURIComponent(user.username)}`;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const arr = await resp.json();
      renderMyOrders(arr);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  }

  function renderMyOrders(list) {
    const container = myOrdersContainer;
    if (!container) return;
    container.innerHTML = '';
    if (!list || !list.length) {
      container.innerHTML = '<p class="text-gray-600">No recent orders.</p>';
      return;
    }

    list.forEach(o => {
      const div = document.createElement('div');
      div.className = 'p-3 bg-white rounded mb-2 flex justify-between items-center';
      const statusColor = o.status === 'Ready' ? 'color:#16a34a' : o.status === 'Cancelled' ? 'color:#ef4444' : o.status === 'Started' ? 'color:#f97316' : 'color:#d97706';
      div.innerHTML = `
        <div>
          <div><strong>Order:</strong> ${o._id}</div>
          <div><strong>Status:</strong> <span style="${statusColor}; font-weight:600;">${o.status}</span></div>
          <div><strong>Preference:</strong> ${o.preference || 'No preference'}</div>
        </div>
        <div>
          <small class="text-gray-500">${new Date(o.createdAt).toLocaleString()}</small>
        </div>
      `;
      container.appendChild(div);
    });
  }

  let ordersPollInterval = null;
  function startOrdersPolling() {
    fetchMyOrders();
    if (ordersPollInterval) clearInterval(ordersPollInterval);
    ordersPollInterval = setInterval(fetchMyOrders, 6000);
  }
  function stopOrdersPolling() {
    if (ordersPollInterval) { clearInterval(ordersPollInterval); ordersPollInterval = null; }
  }

  if (ordersButton && ordersSidebar) {
    ordersButton.addEventListener('click', () => {
      ordersSidebar.classList.add('open');
      if (cartOverlay) cartOverlay.classList.add('active');
      startOrdersPolling();
    });
  }

  if (closeOrdersBtn) {
    closeOrdersBtn.addEventListener('click', () => {
      if (ordersSidebar) ordersSidebar.classList.remove('open');
      if (cartOverlay) cartOverlay.classList.remove('active');
      stopOrdersPolling();
    });
  }

  const ordersObserver = new MutationObserver(() => {
    if (ordersSidebar && !ordersSidebar.classList.contains('open')) stopOrdersPolling();
  });
  if (ordersSidebar) ordersObserver.observe(ordersSidebar, { attributes: true, attributeFilter: ['class'] });

  updateCartBadge();
  loadMenu("all");
  fetchMyOrders();
});

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
      closePaymentModal();
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
      allMenuItems = data.filter(i => i.available);
      renderMenu(allMenuItems);
    } catch (err) {
      console.error(err);
      menuGrid.innerHTML = `<p class="text-center text-gray-500 col-span-full">Failed to load menu.</p>`;
    }
  }

  // Search functionality
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

  // Filter buttons
  const allBtn = document.getElementById("allMenuBtn");
  const specialBtn = document.getElementById("specialBtn");
  const comboBtn = document.getElementById("comboBtn");
  if (allBtn) allBtn.addEventListener("click", () => loadMenu("all"));
  if (specialBtn) specialBtn.addEventListener("click", () => loadMenu("specials"));
  if (comboBtn) comboBtn.addEventListener("click", () => loadMenu("combos"));

  // ============ QR CODE PAYMENT MODAL ============
  function generateQRCode(text, size = 256) {
    // Using a QR code API service
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  }

  function showPaymentModal(totalAmount, orderData) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'paymentModalOverlay';
    modalOverlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.3s ease;
    `;

    // UPI payment string (you can customize this with your UPI ID)
    const upiString = `upi://pay?pa=amrita.canteen@upi&pn=Amrita Canteen&am=${totalAmount}&cu=INR&tn=Order Payment`;
    
    const qrCodeUrl = generateQRCode(upiString, 300);

    modalOverlay.innerHTML = `
      <div style="
        background: white;
        border-radius: 24px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: slideUp 0.4s ease;
        text-align: center;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">💳</div>
        <h2 style="font-size: 28px; font-weight: 700; color: #1f2937; margin-bottom: 8px;">
          Scan to Pay
        </h2>
        <p style="color: #6b7280; font-size: 16px; margin-bottom: 24px;">
          Total Amount: <span style="font-size: 32px; font-weight: 700; color: #667eea; display: block; margin-top: 8px;">₹${totalAmount}</span>
        </p>
        
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 24px;
        ">
          <img src="${qrCodeUrl}" alt="Payment QR Code" style="
            width: 280px;
            height: 280px;
            background: white;
            padding: 12px;
            border-radius: 12px;
            margin: 0 auto;
            display: block;
          "/>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-bottom: 24px;">
          Scan this QR code with any UPI app<br/>
          (Google Pay, PhonePe, Paytm, etc.)
        </p>

        <div style="display: flex; gap: 12px; justify-content: center;">
          <button id="cancelPayment" style="
            padding: 12px 24px;
            background: #e5e7eb;
            color: #374151;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.3s ease;
          ">Cancel</button>
          
          <button id="confirmPayment" style="
            padding: 12px 32px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            transition: all 0.3s ease;
          ">I've Paid ✓</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { 
          opacity: 0;
          transform: translateY(30px);
        }
        to { 
          opacity: 1;
          transform: translateY(0);
        }
      }
      #cancelPayment:hover {
        background: #d1d5db;
        transform: translateY(-2px);
      }
      #confirmPayment:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
      }
    `;
    document.head.appendChild(style);

    // Handle cancel
    document.getElementById('cancelPayment').addEventListener('click', () => {
      closePaymentModal();
    });

    // Handle payment confirmation
    document.getElementById('confirmPayment').addEventListener('click', async () => {
      await completeOrder(orderData);
    });
  }

  function closePaymentModal() {
    const modal = document.getElementById('paymentModalOverlay');
    if (modal) {
      modal.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => modal.remove(), 300);
    }
  }

  async function completeOrder(orderData) {
    const confirmBtn = document.getElementById('confirmPayment');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Processing...';
    }

    try {
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });

      if (!res.ok) {
        const t = await res.text();
        console.error('Order failed', t);
        alert("Order failed! Please try again.");
        closePaymentModal();
        return;
      }

      const order = await res.json();
      
      // Show success message
      closePaymentModal();
      showSuccessModal(order._id);

      // Clear cart
      cart = {};
      localStorage.removeItem("cart");
      renderCart();
      if (document.getElementById("preference")) {
        document.getElementById("preference").value = "";
      }
      if (cartSidebar) cartSidebar.classList.remove("open");
      if (cartOverlay) cartOverlay.classList.remove("active");
      
    } catch (err) {
      console.error('Place order error', err);
      alert("Order failed! Please try again.");
      closePaymentModal();
    }
  }

  function showSuccessModal(orderId) {
    const successModal = document.createElement('div');
    successModal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      animation: fadeIn 0.3s ease;
    `;

    successModal.innerHTML = `
      <div style="
        background: white;
        border-radius: 24px;
        padding: 40px;
        max-width: 450px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: slideUp 0.4s ease;
        text-align: center;
      ">
        <div style="
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 48px;
        ">✓</div>
        
        <h2 style="font-size: 28px; font-weight: 700; color: #1f2937; margin-bottom: 16px;">
          Order Placed Successfully!
        </h2>
        
        <div style="
          background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
          padding: 20px;
          border-radius: 16px;
          margin-bottom: 24px;
        ">
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Your Order ID</p>
          <p style="
            font-size: 20px;
            font-weight: 700;
            color: #667eea;
            font-family: monospace;
            word-break: break-all;
          ">${orderId}</p>
        </div>

        <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.6;">
          Your order has been confirmed!<br/>
          You'll be notified when it's ready for pickup.
        </p>

        <button id="closeSuccessModal" style="
          padding: 12px 32px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
        ">Got it!</button>
      </div>
    `;

    document.body.appendChild(successModal);

    document.getElementById('closeSuccessModal').addEventListener('click', () => {
      successModal.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => successModal.remove(), 300);
    });

    // Auto close after 5 seconds
    setTimeout(() => {
      if (document.body.contains(successModal)) {
        successModal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => successModal.remove(), 300);
      }
    }, 5000);
  }

  // Place Order - Modified to show QR code first
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", async () => {
      const items = Object.values(cart).map(i => ({ id: i.id, qty: i.qty }));
      const preference = document.getElementById("preference")?.value?.trim() || "";

      if (!items.length) {
        alert("Cart is empty!");
        return;
      }

      const totalAmount = Object.values(cart).reduce((sum, item) => 
        sum + (item.price * item.qty), 0
      );

      const orderData = {
        username: user.username,
        items,
        preference
      };

      // Show QR payment modal instead of directly placing order
      showPaymentModal(totalAmount, orderData);
    });
  }

  // Orders functionality
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
      const statusColor = o.status === 'Ready' ? 'color:#16a34a' : 
                         o.status === 'Cancelled' ? 'color:#ef4444' : 
                         o.status === 'Started' ? 'color:#f97316' : 'color:#d97706';
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
    if (ordersPollInterval) {
      clearInterval(ordersPollInterval);
      ordersPollInterval = null;
    }
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
    if (ordersSidebar && !ordersSidebar.classList.contains('open')) {
      stopOrdersPolling();
    }
  });
  if (ordersSidebar) {
    ordersObserver.observe(ordersSidebar, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
  }

  // Initialize
  updateCartBadge();
  loadMenu("all");
  fetchMyOrders();
});
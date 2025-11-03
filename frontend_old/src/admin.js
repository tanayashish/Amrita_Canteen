const API = 'http://localhost:5001';

/* ---------------- small helper ---------------- */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ---------------- analytics chart manager ---------------- */

let analyticsCharts = { status: null, trend: null, top: null };

/* 💡 Added global Chart.js default styling */
if (typeof Chart !== "undefined") {
  Chart.defaults.color = '#374151';
  Chart.defaults.font.family = 'Poppins, sans-serif';
  Chart.defaults.plugins.legend.labels.boxWidth = 16;
  Chart.defaults.plugins.legend.position = 'top';
  Chart.defaults.plugins.title.font = { size: 16, weight: 'bold' };
}

function destroyAnalyticsCharts() {
  try {
    Object.values(analyticsCharts).forEach(c => {
      if (c && typeof c.destroy === 'function') c.destroy();
    });
  } catch (e) {
    console.warn('Chart destroy error', e);
  }
  analyticsCharts = { status: null, trend: null, top: null };
}

async function initAnalyticsCharts() {
  try {
    const ordersRes = await fetch(`${API}/api/orders`);
    const orders = await ordersRes.json();
    const menuRes = await fetch(`${API}/api/menu`);
    const menu = await menuRes.json();

    const pending = orders.filter(o => o.status === 'Pending').length;
    const started = orders.filter(o => o.status === 'Started').length;
    const ready = orders.filter(o => o.status === 'Ready').length;
    const collected = orders.filter(o => o.status === 'Collected').length;
    const cancelled = orders.filter(o => o.status === 'Cancelled').length;

    const dailyCounts = {};
    orders.forEach(o => {
      const date = new Date(o.createdAt || Date.now()).toLocaleDateString();
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const itemCount = {};
    orders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(i => {
          const nm = i.name || 'item';
          itemCount[nm] = (itemCount[nm] || 0) + (i.qty || 1);
        });
      }
    });

    const topItems = Object.entries(itemCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    destroyAnalyticsCharts();
    Chart.defaults.maintainAspectRatio = false;

    analyticsCharts.status = new Chart(document.getElementById('ordersStatusChart'), {
      type: 'pie',
      data: {
        labels: ['Pending','Started','Ready','Collected','Cancelled'],
        datasets: [{ data: [pending, started, ready, collected, cancelled],
          backgroundColor: ['#facc15','#f97316','#22c55e','#3b82f6','#ef4444'] }]
      },
      options: { plugins: { title: { display: true, text: 'Order Status Distribution' } } }
    });

    analyticsCharts.trend = new Chart(document.getElementById('ordersTrendChart'), {
      type: 'line',
      data: {
        labels: Object.keys(dailyCounts),
        datasets: [{
          label: 'Orders per Day',
          data: Object.values(dailyCounts),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.12)',
          fill: true,
          tension: 0.3
        }]
      },
      options: { plugins: { title: { display: true, text: 'Orders Over Time' } }, scales: { y: { beginAtZero: true } } }
    });

    analyticsCharts.top = new Chart(document.getElementById('topItemsChart'), {
      type: 'bar',
      data: {
        labels: topItems.map(i => i[0]),
        datasets: [{ label: 'Top Selling Items', data: topItems.map(i => i[1]), backgroundColor: '#3b82f6' }]
      },
      options: { plugins: { title: { display: true, text: 'Top Selling Items' } }, scales: { y: { beginAtZero: true } } }
    });

  } catch (err) {
    console.error('Failed to initialize analytics charts', err);
    const extra = document.getElementById('analyticsExtra');
    if (extra) extra.innerHTML = '<p class="text-red-600">Failed to load analytics data.</p>';
  }
}

/* ---------------- ADMIN UI & ORDERS ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || (user.role !== "staff" && user.role !== "admin")) {
    window.location.href = "index.html";
    return;
  }

  const welcomeText = document.getElementById('welcomeText');
  if (welcomeText) welcomeText.textContent = `Welcome, ${user.username}`;

  document.getElementById("smartAppBtn").addEventListener("click", () => {
    window.location.href = "home.html";
    /* ✅ -------- ADD ITEM FEATURE (Newly Added) -------- */
const addItemBtn = document.getElementById('addItemBtn');
if (addItemBtn) {
  addItemBtn.addEventListener('click', async () => {
    const name = prompt("Enter new item name:");
    if (!name) return alert("❌ Item name required.");

    const price = parseFloat(prompt("Enter item price:") || "0");
    if (isNaN(price) || price <= 0) return alert("❌ Enter a valid price.");

    const image = prompt("Enter image URL (optional):") || "";
    const available = confirm("Mark this item as available?");
    const special = confirm("Mark as a Special Item 🌟?");
    const combo = confirm("Mark as a Combo Offer 🥗?");

    try {
      const res = await fetch(`${API}/api/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, image, available, special, combo })
      });

      if (res.ok) {
        alert("✅ Item added successfully!");
        await loadMenuManager(); // Refresh menu after adding
      } else {
        alert("❌ Failed to add item. Check backend connection.");
      }
    } catch (err) {
      console.error("Add Item Error:", err);
      alert("❌ Error adding item. Check console.");
    }
  });
}

  });


  window.logout = function() {
    localStorage.clear();
    window.location.href = "index.html";
  };

  // Load orders list
  try {
    const [ordersRes, menuRes] = await Promise.all([fetch(`${API}/api/orders`), fetch(`${API}/api/menu`)]);
    const orders = await ordersRes.json();

    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = '';

    if (!orders || orders.length === 0) {
      ordersList.innerHTML = `<p class="text-center text-gray-600">No orders found.</p>`;
    } else {
      orders.forEach(o => {
        const pref = o.preference || 'No preference';
        const itemsText = Array.isArray(o.items) ? o.items.map(i => `${i.name || 'item'} x${i.qty||1}`).join(', ') : '—';
        const statusClass = o.status === 'Ready' ? 'text-green-600' : o.status === 'Collected' ? 'text-blue-600' : o.status === 'Cancelled' ? 'text-red-600' : o.status === 'Started' ? 'text-orange-600' : 'text-yellow-600';

        const div = document.createElement('div');
        div.className = 'p-4 mb-3 rounded-lg bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200';
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p><strong>Order ID:</strong> ${o._id}</p>
              <p><strong>User:</strong> ${escapeHtml(o.user)}</p>
              <p><strong>Items:</strong> ${escapeHtml(itemsText)}</p>
              <p><strong>Preference:</strong> <span class="italic text-blue-700">${escapeHtml(pref)}</span></p>
              <p><strong>Status:</strong> <span class="font-semibold ${statusClass}">${o.status}</span></p>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
              <button class="actionBtn startBtn px-3 py-1 rounded" data-id="${o._id}" data-action="Started">Start</button>
              <button class="actionBtn readyBtn px-3 py-1 rounded" data-id="${o._id}" data-action="Ready">Ready</button>
              <button class="actionBtn cancelBtn px-3 py-1 rounded" data-id="${o._id}" data-action="Cancelled">Cancel</button>
            </div>
          </div>
        `;
        ordersList.appendChild(div);
      });

      document.querySelectorAll('.actionBtn').forEach(b => b.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const action = e.target.dataset.action;
        try {
          const resp = await fetch(`${API}/api/orders/${id}/status`, {
            method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: action })
          });
          if (!resp.ok) return alert('Failed to update status');
          alert('Order updated to ' + action);
          window.location.reload();
        } catch (err) {
          console.error('Status update failed', err);
          alert('Status update failed');
        }
      }));
    }

  } catch (err) {
    console.error('Error loading admin data:', err);
    alert('Failed to load analytics or orders. Check backend connection.');
  }

  /* ---------- Analytics Modal ---------- */
  const analyticsBtn = document.getElementById('analyticsBtn');
  const overlay = document.getElementById('analyticsOverlay');
  const modal = document.getElementById('analyticsModal');
  const closeBtn = document.getElementById('closeAnalytics');
  const refreshBtn = document.getElementById('refreshAnalytics');

  if (analyticsBtn && overlay && modal) {
    analyticsBtn.addEventListener('click', async () => {
      modal.classList.add('open');
      overlay.classList.add('active');
      await initAnalyticsCharts();
      await loadOrdersForecast(2);
      await loadItemsForecast(2, 5);

    });

    overlay.addEventListener('click', () => {
      modal.classList.remove('open');
      overlay.classList.remove('active');
      destroyAnalyticsCharts();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        overlay.classList.remove('active');
        destroyAnalyticsCharts();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        await initAnalyticsCharts();
        refreshBtn.disabled = false;
      });
    }
  }

  /* -------- MENU MANAGER (Popup Modal) -------- */
  const menuBtn = document.getElementById('menuBtn');
  const menuModal = document.getElementById('menuModal');
  const menuOverlay = document.getElementById('menuOverlay');
  const closeMenu = document.getElementById('closeMenu');
  const refreshMenu = document.getElementById('refreshMenu');
  const menuList = document.getElementById('menuList');

  async function loadMenuManager() {
    if (!menuList) return;
    menuList.innerHTML = `<p class="text-gray-500 col-span-full text-center">Loading menu...</p>`;
    try {
      const res = await fetch(`${API}/api/menu`);
      if (!res.ok) throw new Error('Failed to fetch menu');
      const data = await res.json();

      menuList.innerHTML = "";
      data.forEach(item => {
        const card = document.createElement("div");
        card.className = "menu-card";
        card.innerHTML = `
          <img src="${item.image || ''}" alt="${item.name || 'item'}" />
          <div style="min-width:140px;">
            <h4>${item.name}</h4>
            <p>₹${item.price}</p>
          </div>
          <label class="inline-flex items-center cursor-pointer ml-auto">
            <input type="checkbox" class="menu-toggle" data-id="${item._id}" ${item.available ? "checked" : ""}/>
            <span class="ml-2 text-sm ${item.available ? 'text-green-600' : 'text-red-600'}">${item.available ? "Available" : "Unavailable"}</span>
          </label>
        `;
        menuList.appendChild(card);
      });

      document.querySelectorAll(".menu-toggle").forEach(toggle => {
        toggle.addEventListener("change", async (e) => {
          const id = e.target.dataset.id;
          const available = e.target.checked;
          const label = e.target.nextElementSibling;
          label.textContent = available ? "Available" : "Unavailable";
          label.className = `ml-2 text-sm ${available ? 'text-green-600' : 'text-red-600'}`;
          try {
            const resp = await fetch(`${API}/api/menu/${id}/availability`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ available })
            });
            if (!resp.ok) throw new Error('Update failed');
          } catch (err) {
            console.error("Failed to update menu item", err);
            alert("Could not update item status.");
          }
        });
      });
    } catch (err) {
      console.error("Error fetching menu", err);
      menuList.innerHTML = `<p class="text-red-500 text-center">Failed to load menu.</p>`;
    }
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", async () => {
      menuModal.classList.add("open");
      menuOverlay.classList.add("active");
      await loadMenuManager();
    });
  }

  if (closeMenu && menuOverlay) {
    closeMenu.addEventListener("click", () => {
      menuModal.classList.remove("open");
      menuOverlay.classList.remove("active");
    });
    menuOverlay.addEventListener("click", () => {
      menuModal.classList.remove("open");
      menuOverlay.classList.remove("active");
    });
  }

  if (refreshMenu) {
    refreshMenu.addEventListener("click", async () => {
      refreshMenu.disabled = true;
      await loadMenuManager();
      refreshMenu.disabled = false;
    });
  }
  /* ---------- Add Item Modal Logic ---------- */
const addItemModal = document.getElementById('addItemModal');
const addItemOverlay = document.getElementById('addItemOverlay');
const addItemOpen = document.getElementById('addItemOpen');
const cancelAddItem = document.getElementById('cancelAddItem');
const addItemForm = document.getElementById('addItemForm');
const itemImage = document.getElementById('itemImage');
const itemPreview = document.getElementById('itemPreview');

addItemOpen?.addEventListener('click', () => {
  addItemModal.classList.add('open');
  addItemOverlay.classList.add('active');
});

[cancelAddItem, addItemOverlay].forEach(el => el?.addEventListener('click', () => {
  addItemModal.classList.remove('open');
  addItemOverlay.classList.remove('active');
}));

itemImage?.addEventListener('input', () => {
  const url = itemImage.value.trim();
  if (url && url.startsWith('http')) {
    itemPreview.src = url;
    itemPreview.classList.remove('hidden');
  } else {
    itemPreview.classList.add('hidden');
  }
});

addItemForm?.addEventListener('submit', async e => {
  e.preventDefault();

  const name = document.getElementById('itemName').value.trim();
  const price = parseFloat(document.getElementById('itemPrice').value);
  const image = document.getElementById('itemImage').value.trim();
  const available = document.getElementById('itemAvailable').checked;
  const special = document.getElementById('itemSpecial').checked;
  const combo = document.getElementById('itemCombo').checked;

  if (!name || isNaN(price)) return alert('⚠️ Please enter valid name and price.');

  try {
    const res = await fetch(`${API}/api/menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, image, available, special, combo })
    });

    if (res.ok) {
      alert('✅ New item added successfully!');
      addItemForm.reset();
      itemPreview.classList.add('hidden');
      addItemModal.classList.remove('open');
      addItemOverlay.classList.remove('active');
      await loadMenuManager();
    } else {
      alert('❌ Failed to add item.');
    }
  } catch (err) {
    console.error("Add Item Error:", err);
    alert('❌ Error adding item. Check backend connection.');
  }
});
/* ---------- Edit Item Modal Logic ---------- */
const editItemModal = document.getElementById('editItemModal');
const editItemOverlay = document.getElementById('editItemOverlay');
const cancelEditItem = document.getElementById('cancelEditItem');
const editItemForm = document.getElementById('editItemForm');
const editName = document.getElementById('editName');
const editPrice = document.getElementById('editPrice');
const editImage = document.getElementById('editImage');
const editPreview = document.getElementById('editPreview');
const editAvailable = document.getElementById('editAvailable');
const editSpecial = document.getElementById('editSpecial');
const editCombo = document.getElementById('editCombo');

let currentEditId = null;

function openEditModal(item) {
  currentEditId = item._id;
  editName.value = item.name;
  editPrice.value = item.price;
  editImage.value = item.image || '';
  editAvailable.checked = item.available;
  editSpecial.checked = item.special;
  editCombo.checked = item.combo;

  if (item.image) {
    editPreview.src = item.image;
    editPreview.classList.remove('hidden');
  } else {
    editPreview.classList.add('hidden');
  }

  editItemModal.classList.add('open');
  editItemOverlay.classList.add('active');
}

[editItemOverlay, cancelEditItem].forEach(el =>
  el.addEventListener('click', () => {
    editItemModal.classList.remove('open');
    editItemOverlay.classList.remove('active');
  })
);

editImage.addEventListener('input', () => {
  const url = editImage.value.trim();
  if (url && url.startsWith('http')) {
    editPreview.src = url;
    editPreview.classList.remove('hidden');
  } else {
    editPreview.classList.add('hidden');
  }
});

editItemForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentEditId) return alert('No item selected for edit.');

  const updated = {
    name: editName.value.trim(),
    price: parseFloat(editPrice.value),
    image: editImage.value.trim(),
    available: editAvailable.checked,
    special: editSpecial.checked,
    combo: editCombo.checked
  };

  try {
    const res = await fetch(`${API}/api/menu/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });

    if (res.ok) {
      alert('✅ Item updated successfully!');
      editItemModal.classList.remove('open');
      editItemOverlay.classList.remove('active');
      await loadMenuManager();
    } else {
      alert('❌ Failed to update item.');
    }
  } catch (err) {
    console.error('Edit item error:', err);
    alert('Error updating item. Check console.');
  }
});

/* 🔧 Integrate Edit Button inside Menu Manager */
async function loadMenuManager() {
  const menuList = document.getElementById('menuList');
  menuList.innerHTML = `<p class="text-gray-500 text-center">Loading menu...</p>`;
  const res = await fetch(`${API}/api/menu`);
  const data = await res.json();

  menuList.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card bg-gray-50 border rounded-lg p-3 flex items-center gap-4 shadow-sm hover:shadow-md transition';
    card.innerHTML = `
      <img src="${item.image || 'https://via.placeholder.com/80'}" class="w-16 h-16 rounded object-cover border">
      <div class="flex-1">
        <h4 class="font-semibold text-gray-800">${item.name}</h4>
        <p class="text-sm text-gray-600">₹${item.price}</p>
      </div>
      <button class="edit-btn px-2 py-1 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600" data-id="${item._id}">Edit</button>
    `;
    menuList.appendChild(card);
  });

  document.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', async e => {
      const id = e.target.dataset.id;
      const item = data.find(i => i._id === id);
      openEditModal(item);
    })
  );
}

});
// call Node endpoint that proxies Python
async function loadOrdersForecast(days = 2) {
  try {
    const r = await fetch(`${API}/api/forecast/orders?days=${days}`);
    if (!r.ok) throw new Error('Forecast fetch failed');
    const data = await r.json();

    if (!data || !data.history || !data.forecast) {
      console.warn("No forecast data returned");
      return;
    }

    // Merge history + forecast
    const labels = [...data.history.dates, ...data.forecast.dates];
    let values = [...data.history.values, ...data.forecast.values];

    // Clamp all values to 0 minimum (avoid negatives)
    values = values.map(v => (v < 0 ? 0 : v));

    // Destroy old chart if it exists
    if (window._forecastChart) window._forecastChart.destroy();

    const ctx = document.getElementById("forecastChart").getContext("2d");

    // Find max value for dynamic scaling (keep minimum suggested 200)
    const maxValue = Math.max(200, Math.max(...values) * 1.2);

    window._forecastChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Orders (history + forecast)",
            data: values,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.12)",
            fill: true,
            tension: 0.3,
          },
          {
            label: "Forecast (next days)",
            data: labels.map((d, i) =>
              i < data.history.dates.length ? null : data.forecast.values[i - data.history.dates.length]
            ),
            borderColor: "#f59e0b",
            borderDash: [6, 4],
            pointRadius: 3,
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Orders: Past & Next Days Forecast",
            font: { size: 16, weight: "bold" },
          },
          legend: {
            position: "top",
            labels: { boxWidth: 16, color: "#374151", font: { family: "Poppins, sans-serif" } },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            min: 0,
            suggestedMax: maxValue,
            ticks: {
              stepSize: Math.ceil(maxValue / 4),
              color: "#374151",
              font: { family: "Poppins, sans-serif" },
            },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
          x: {
            ticks: { color: "#374151", font: { family: "Poppins, sans-serif" } },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
        },
      },
    });
  } catch (err) {
    console.error("loadOrdersForecast err", err);
  }
}


async function loadItemsForecast(days=2, top=5) {
  try {
    const r = await fetch(`${API}/api/forecast/items?days=${days}&top=${top}`);
    if (!r.ok) throw new Error('Items forecast fetch failed');
    const data = await r.json();
    const labels = data.top_items.map(t => t.item);
    const summed = data.top_items.map(t => t.predicted_next_days.reduce((a,b)=>a+b, 0));

    if (window._itemsChart) window._itemsChart.destroy();
    const ctx = document.getElementById('itemsForecastChart').getContext('2d');
    window._itemsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: `Predicted orders (next ${days} days)`, data: summed, backgroundColor: '#3b82f6' }]
      },
      options: { plugins: { title: { display: true, text: 'Top Dish Demand (sum next days)' } }, scales:{ y:{ beginAtZero:true } } }
    });
  } catch (err) {
    console.error('loadItemsForecast err', err);
  }
}

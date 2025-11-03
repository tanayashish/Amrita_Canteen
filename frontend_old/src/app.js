// ---------------- CONFIG ----------------
const API = (import.meta && import.meta.env && import.meta.env.API_URL)
  ? import.meta.env.API_URL
  : 'http://localhost:5001';

let token = null;
let currentUser = null;
let cart = {}; // { key: { name, price, image, qty } }

const root = document.getElementById('root');

// ---------------- UTILITIES ----------------
function setAuth(tkn, user) {
  token = tkn;
  currentUser = user;
}

function authFetch(url, opts = {}) {
  opts.headers = opts.headers || {};
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, opts);
}

// ---------------- LOGIN ----------------
async function showLogin() {
  root.innerHTML = `
    <div class="flex items-center justify-center min-h-screen">
      <div class="w-full max-w-sm bg-white p-6 rounded shadow">
        <h2 class="text-xl font-bold mb-4">SmartCanteen Login</h2>
        <form id="loginForm" class="space-y-3">
          <input id="username" required placeholder="username" class="w-full p-2 border rounded"/>
          <input id="password" type="password" required placeholder="password" class="w-full p-2 border rounded"/>
          <button class="w-full p-2 bg-indigo-600 text-white rounded">Login</button>
        </form>
        <p class="mt-3 text-sm">No account? <button id="goReg" class="text-indigo-600">Register</button></p>
      </div>
    </div>
  `;
  document.getElementById('goReg').addEventListener('click', showRegister);
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    const resp = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!resp.ok) return alert('Invalid credentials');

    const data = await resp.json();
    const role = data.role || 'student';

    setAuth(data.token, { username: data.username, role });
    localStorage.setItem("user", JSON.stringify({ username: data.username, role }));
    localStorage.setItem("token", data.token);
    showApp();
  });
}

// ---------------- REGISTER ----------------
async function showRegister() {
  root.innerHTML = `
    <div class="flex items-center justify-center min-h-screen">
      <div class="w-full max-w-sm bg-white p-6 rounded shadow">
        <h2 class="text-xl font-bold mb-4">Register</h2>
        <form id="regForm" class="space-y-3">
          <input id="rusername" required placeholder="username" class="w-full p-2 border rounded"/>
          <input id="rpassword" type="password" required placeholder="password" class="w-full p-2 border rounded"/>
          <select id="rrole" class="w-full p-2 border rounded">
            <option value="student">Student</option>
            <option value="staff">Staff</option>
          </select>
          <button class="w-full p-2 bg-green-600 text-white rounded">Register</button>
        </form>
        <p class="mt-3 text-sm">Have account? <button id="goLogin" class="text-indigo-600">Login</button></p>
      </div>
    </div>
  `;
  document.getElementById('goLogin').addEventListener('click', showLogin);
  document.getElementById('regForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('rusername').value.trim();
    const password = document.getElementById('rpassword').value.trim();
    const role = document.getElementById('rrole').value;

    const resp = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });

    if (!resp.ok) {
      const t = await resp.json();
      return alert(t.message || 'Error');
    }

    alert('Registered successfully. Please login.');
    showLogin();
  });
}

// ---------------- APP SWITCH ----------------
async function showApp() {
  if (!currentUser) return showLogin();

  if (currentUser.role === 'staff') {
    return showStaff();
  }

  // Redirect student/customer to new dashboard page
  if (currentUser.role === 'student' || currentUser.role === 'customer') {
    window.location.href = "dashboard.html";
    return;
  }

  return showLogin();
}

// ---------------- FETCH MENU ----------------
async function fetchMenu() {
  const res = await fetch(`${API}/api/menu`);
  const data = await res.json();
  return data.map(x => ({
    ...x,
    __key: String(x._id ?? x.id ?? x.sku ?? x.code ?? x.name)
  }));
}

// ---------------- STAFF VIEW ----------------
async function showStaff() {
  root.innerHTML = `
    <div class="p-6 max-w-5xl mx-auto">
      <div class="flex justify-between">
        <h1 class="text-2xl font-bold">Staff Dashboard</h1>
        <div>
          <button id="logout" class="px-3 py-1 bg-red-600 text-white rounded">Logout</button>
        </div>
      </div>
      <div class="mt-6">
        <h2 class="text-lg font-semibold">Orders</h2>
        <div id="ordersList"></div>
      </div>
      <div class="mt-6">
        <h2 class="text-lg font-semibold">Manage Menu</h2>
        <div id="menuManage"></div>
      </div>
    </div>
  `;

  document.getElementById('logout').addEventListener('click', () => {
    localStorage.clear();
    setAuth(null, null);
    showLogin();
  });

  loadStaffData();
}

async function loadStaffData() {
  const orders = await (await fetch(`${API}/api/orders`)).json();
  const menu = await (await fetch(`${API}/api/menu`)).json();

  const ordersList = document.getElementById('ordersList');
  ordersList.innerHTML = '';
  orders.forEach(o => {
    const div = document.createElement('div');
    div.className = 'p-3 bg-white rounded mb-2';
    div.innerHTML = `
      <p><strong>Order ${o._id}</strong> by ${o.user}</p>
      <p>Items: ${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}</p>
      <p>Status: ${o.status}</p>
      <button data-id="${o._id}" class="markReady px-2 py-1 bg-blue-600 text-white rounded mt-2">Mark Ready</button>
    `;
    ordersList.appendChild(div);
  });

  document.querySelectorAll('.markReady').forEach(b =>
    b.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      await fetch(`${API}/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Ready' })
      });
      loadStaffData();
    })
  );

  const menuManage = document.getElementById('menuManage');
  menuManage.innerHTML = '';
  menu.forEach(m => {
    const d = document.createElement('div');
    d.className = 'p-3 bg-white rounded mb-2 flex justify-between';
    d.innerHTML = `
      <div><b>${m.name}</b><div>₹${m.price}</div></div>
      <div><label>Available <input type="checkbox" data-id="${m._id}" ${m.available ? 'checked' : ''}/></label></div>
    `;
    menuManage.appendChild(d);
  });

  menuManage.querySelectorAll('input[type=checkbox]').forEach(ch =>
    ch.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const available = e.target.checked;
      await fetch(`${API}/api/menu/${id}/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available })
      });
      loadStaffData();
    })
  );
}

// ---------------- AUTO LOGIN ----------------
const savedUser = localStorage.getItem("user");
const savedToken = localStorage.getItem("token");

if (savedUser && savedToken) {
  setAuth(savedToken, JSON.parse(savedUser));
  showApp();
} else {
  showLogin();
}

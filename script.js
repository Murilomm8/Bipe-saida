const STORAGE_KEY = 'orders_dashboard_v1';

const barcodeInput = document.getElementById('barcodeInput');
const storeSelect = document.getElementById('storeSelect');
const platformSelect = document.getElementById('platformSelect');
const feedback = document.getElementById('feedback');
const totalCount = document.getElementById('totalCount');
const byStore = document.getElementById('byStore');
const byPlatform = document.getElementById('byPlatform');
const ordersTable = document.getElementById('ordersTable');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');

let orders = loadOrders();

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function setFeedback(message, type = '') {
  feedback.textContent = message;
  feedback.classList.remove('success', 'error');
  if (type) feedback.classList.add(type);
}

function countBy(field) {
  return orders.reduce((acc, order) => {
    acc[order[field]] = (acc[order[field]] || 0) + 1;
    return acc;
  }, {});
}

function renderCountList(target, dataMap) {
  target.innerHTML = '';
  const entries = Object.entries(dataMap);

  if (!entries.length) {
    const li = document.createElement('li');
    li.textContent = 'Sem dados';
    target.appendChild(li);
    return;
  }

  entries.sort((a, b) => b[1] - a[1]);
  for (const [name, qty] of entries) {
    const li = document.createElement('li');
    li.textContent = `${name}: ${qty}`;
    target.appendChild(li);
  }
}

function renderOrdersTable() {
  ordersTable.innerHTML = '';

  const latest = [...orders].reverse().slice(0, 20);
  for (const order of latest) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${order.codigo}</td>
      <td>${order.loja}</td>
      <td>${order.plataforma}</td>
      <td>${new Date(order.dataHora).toLocaleString('pt-BR')}</td>
    `;
    ordersTable.appendChild(tr);
  }
}

function renderDashboard() {
  totalCount.textContent = String(orders.length);
  renderCountList(byStore, countBy('loja'));
  renderCountList(byPlatform, countBy('plataforma'));
  renderOrdersTable();
}

function focusBarcodeInput() {
  barcodeInput.focus();
}

function registerCode(rawCode) {
  const code = rawCode.trim();
  if (!code) return;

  const duplicate = orders.some((order) => order.codigo === code);
  if (duplicate) {
    setFeedback(`Código ${code} duplicado.`, 'error');
    barcodeInput.select();
    return;
  }

  orders.push({
    codigo: code,
    loja: storeSelect.value,
    plataforma: platformSelect.value,
    dataHora: new Date().toISOString(),
  });

  saveOrders();
  renderDashboard();
  setFeedback(`Código ${code} registrado com sucesso.`, 'success');
  barcodeInput.value = '';
}

function toCSV(data) {
  const headers = ['codigo', 'loja', 'plataforma', 'data_hora'];
  const rows = data.map((order) => [
    order.codigo,
    order.loja,
    order.plataforma,
    new Date(order.dataHora).toLocaleString('pt-BR'),
  ]);

  return [headers, ...rows]
    .map((cols) => cols.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(';'))
    .join('\n');
}

barcodeInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    registerCode(barcodeInput.value);
  }
});

exportBtn.addEventListener('click', () => {
  if (!orders.length) {
    setFeedback('Nenhum dado para exportar.', 'error');
    return;
  }

  const csv = toCSV(orders);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `pedidos_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
  setFeedback('CSV exportado com sucesso.', 'success');
  focusBarcodeInput();
});

clearBtn.addEventListener('click', () => {
  const confirmed = window.confirm('Tem certeza que deseja limpar todos os dados?');
  if (!confirmed) {
    focusBarcodeInput();
    return;
  }

  orders = [];
  saveOrders();
  renderDashboard();
  setFeedback('Dados limpos com sucesso.', 'success');
  focusBarcodeInput();
});

window.addEventListener('click', () => focusBarcodeInput());
window.addEventListener('load', () => {
  renderDashboard();
  focusBarcodeInput();
});

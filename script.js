const ORDER_STORAGE_KEY = 'orders_dashboard_v1';
const META_STORAGE_KEY = 'orders_dashboard_meta_v1';

const defaultMeta = {
  stores: ['PADUA', 'FTW', 'HARD'],
  platforms: ['Shopee', 'Magazine Luiza', 'Amazon', 'Meli Flex', 'Meli Correio'],
};

const barcodeInput = document.getElementById('barcodeInput');
const storeSelect = document.getElementById('storeSelect');
const platformSelect = document.getElementById('platformSelect');
const newStoreInput = document.getElementById('newStoreInput');
const newPlatformInput = document.getElementById('newPlatformInput');
const addStoreBtn = document.getElementById('addStoreBtn');
const addPlatformBtn = document.getElementById('addPlatformBtn');
const feedback = document.getElementById('feedback');
const totalCount = document.getElementById('totalCount');
const byStore = document.getElementById('byStore');
const byPlatform = document.getElementById('byPlatform');
const matrixBoards = document.getElementById('matrixBoards');
const ordersTable = document.getElementById('ordersTable');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');

let orders = loadOrders();
let meta = loadMeta();

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return structuredClone(defaultMeta);

    const parsed = JSON.parse(raw);
    return {
      stores: Array.isArray(parsed.stores) && parsed.stores.length ? parsed.stores : [...defaultMeta.stores],
      platforms: Array.isArray(parsed.platforms) && parsed.platforms.length ? parsed.platforms : [...defaultMeta.platforms],
    };
  } catch {
    return structuredClone(defaultMeta);
  }
}

function saveOrders() {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

function saveMeta() {
  localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
}

function setFeedback(message, type = '') {
  feedback.textContent = message;
  feedback.classList.remove('success', 'error');
  if (type) feedback.classList.add(type);
}

function normalized(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function updateSelectOptions() {
  const currentStore = storeSelect.value;
  const currentPlatform = platformSelect.value;

  storeSelect.innerHTML = '';
  platformSelect.innerHTML = '';

  for (const store of meta.stores) {
    const option = document.createElement('option');
    option.value = store;
    option.textContent = store;
    storeSelect.appendChild(option);
  }

  for (const platform of meta.platforms) {
    const option = document.createElement('option');
    option.value = platform;
    option.textContent = platform;
    platformSelect.appendChild(option);
  }

  if (meta.stores.includes(currentStore)) storeSelect.value = currentStore;
  if (meta.platforms.includes(currentPlatform)) platformSelect.value = currentPlatform;
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

function createCellCodes(store, platform) {
  return orders
    .filter((order) => order.loja === store && order.plataforma === platform)
    .map((order) => order.codigo);
}

function renderSpreadsheetBoards() {
  matrixBoards.innerHTML = '';

  for (const store of meta.stores) {
    const board = document.createElement('article');
    board.className = 'store-board';

    const title = document.createElement('h3');
    title.className = 'store-title';
    title.textContent = store;
    board.appendChild(title);

    const wrapper = document.createElement('div');
    wrapper.className = 'sheet-wrapper';

    const table = document.createElement('table');
    table.className = 'sheet';

    const headRow = document.createElement('tr');
    for (const platform of meta.platforms) {
      const th = document.createElement('th');
      th.textContent = platform;
      headRow.appendChild(th);
    }

    const countRow = document.createElement('tr');
    countRow.className = 'count-row';
    for (const platform of meta.platforms) {
      const td = document.createElement('td');
      td.textContent = String(createCellCodes(store, platform).length);
      countRow.appendChild(td);
    }

    const dataRow = document.createElement('tr');
    for (const platform of meta.platforms) {
      const td = document.createElement('td');
      const codes = createCellCodes(store, platform);
      const ul = document.createElement('ul');
      ul.className = 'cell-list';

      if (!codes.length) {
        const li = document.createElement('li');
        li.textContent = '-';
        ul.appendChild(li);
      } else {
        for (const code of codes) {
          const li = document.createElement('li');
          li.textContent = code;
          ul.appendChild(li);
        }
      }

      td.appendChild(ul);
      dataRow.appendChild(td);
    }

    table.appendChild(headRow);
    table.appendChild(countRow);
    table.appendChild(dataRow);
    wrapper.appendChild(table);
    board.appendChild(wrapper);
    matrixBoards.appendChild(board);
  }
}

function renderOrdersTable() {
  ordersTable.innerHTML = '';

  const latest = [...orders].reverse().slice(0, 25);
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
  renderSpreadsheetBoards();
  renderOrdersTable();
}

function focusBarcodeInput() {
  barcodeInput.focus();
}

function registerCode(rawCode) {
  const code = normalized(rawCode);
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
  focusBarcodeInput();
}

function addStore() {
  const name = normalized(newStoreInput.value);
  if (!name) {
    setFeedback('Informe um nome de loja válido.', 'error');
    return;
  }

  if (meta.stores.includes(name)) {
    setFeedback(`Loja ${name} já existe.`, 'error');
    return;
  }

  meta.stores.push(name);
  saveMeta();
  updateSelectOptions();
  renderDashboard();
  setFeedback(`Loja ${name} adicionada.`, 'success');
  newStoreInput.value = '';
  focusBarcodeInput();
}

function addPlatform() {
  const name = normalized(newPlatformInput.value);
  if (!name) {
    setFeedback('Informe uma plataforma válida.', 'error');
    return;
  }

  if (meta.platforms.includes(name)) {
    setFeedback(`Plataforma ${name} já existe.`, 'error');
    return;
  }

  meta.platforms.push(name);
  saveMeta();
  updateSelectOptions();
  renderDashboard();
  setFeedback(`Plataforma ${name} adicionada.`, 'success');
  newPlatformInput.value = '';
  focusBarcodeInput();
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

newStoreInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addStore();
  }
});

newPlatformInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addPlatform();
  }
});

addStoreBtn.addEventListener('click', addStore);
addPlatformBtn.addEventListener('click', addPlatform);

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
  updateSelectOptions();
  renderDashboard();
  focusBarcodeInput();
});

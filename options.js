// === 以下區塊是處理：核心配置，完全移除 hasShortcut ===
const CONFIG = {
  identities: { title: "身份", desc: "設定 AI 扮演的角色身份，預設為空值", hasShortcut: false },
  events: { title: "指令", desc: "管理您的指令庫 (點選網頁標籤呼叫)", hasShortcut: false },
  styles: { title: "風格", desc: "設定 AI 輸出的語氣風格，預設為空值", hasShortcut: false }
};

const DEFAULT_MENU_CONFIG = { bgColor: '#ffffff', activeBg: '#1a73e8', fontSize: 18, subFontSize: 13 };

let currentType = 'identities';
let allData = { identities: [], events: [], styles: [] };
let editIndex = -1;

// === 以下區塊是處理：側邊欄選單的縮合與切換 ===
document.getElementById('prompt-menu-toggle').onclick = () => {
  document.getElementById('prompt-group-wrapper').classList.toggle('collapsed');
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.onclick = function() {
    if (this.id === 'prompt-menu-toggle') return;
    const target = this.getAttribute('data-target');
    const type = this.getAttribute('data-type');
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    this.classList.add('active');
    
    document.querySelectorAll('.section').forEach(sec => {
      sec.style.display = 'none';
      sec.classList.remove('active');
    });
    
    const targetSec = document.getElementById(target);
    targetSec.style.display = 'block';
    setTimeout(() => targetSec.classList.add('active'), 10);

    if (type) {
      currentType = type;
      showView('list');
      renderTable();
    }
  };
});

// === 以下區塊是處理：資料渲染與儲存邏輯 (已移除代號欄位) ===
function renderTable() {
  const tbody = document.getElementById('data-list-body');
  const thead = document.getElementById('table-head');
  document.getElementById('page-title').innerText = CONFIG[currentType].title;
  document.getElementById('page-desc').innerText = CONFIG[currentType].desc;
  
  thead.innerHTML = `<th>名稱</th><th>內容</th><th style="text-align:right;">操作</th>`;
  tbody.innerHTML = '';

  (allData[currentType] || []).forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${item.label}</b></td><td><span class="text-truncate">${item.text}</span></td><td style="text-align:right;"><button class="btn-gray-blue btn-edit">編輯</button> <button class="btn-gray-red btn-del">刪除</button></td>`;
    tr.querySelector('.btn-edit').onclick = () => openEditor(index);
    tr.querySelector('.btn-del').onclick = () => deleteItem(index);
    tbody.appendChild(tr);
  });
}

function openEditor(index = -1) {
  editIndex = index;
  const item = index > -1 ? allData[currentType][index] : { label: '', text: '' };
  document.getElementById('editor-title').innerText = index > -1 ? '編輯項目' : '新增項目';
  document.getElementById('edit-label').value = item.label;
  document.getElementById('edit-text').value = item.text;
  showView('editor');
}

document.getElementById('btn-save').onclick = () => {
  const label = document.getElementById('edit-label').value.trim();
  const text = document.getElementById('edit-text').value.trim();
  if (!label || !text) return alert('不可為空');
  const newItem = { label, text };
  if (editIndex > -1) allData[currentType][editIndex] = newItem;
  else allData[currentType].push(newItem);
  chrome.storage.local.set({ [currentType]: allData[currentType] }, () => { showView('list'); renderTable(); });
};

// === 以下區塊是處理：外觀預覽與同步 ===
function updateSandbox() {
  const bg = document.getElementById('cfg-bg-color').value;
  const active = document.getElementById('cfg-active-bg').value;
  const fSize = document.getElementById('cfg-font-size').value + 'px';
  const sSize = document.getElementById('cfg-sub-font-size').value + 'px';
  document.getElementById('bg-hex').innerText = bg.toUpperCase();
  document.getElementById('active-hex').innerText = active.toUpperCase();
  const menu = document.getElementById('sandbox-menu');
  const activeItem = document.getElementById('sb-active');
  const tagActive = document.getElementById('sb-tag-active');
  menu.style.backgroundColor = bg;
  activeItem.style.backgroundColor = active;
  activeItem.style.color = '#fff';
  tagActive.style.borderColor = active;
  tagActive.style.color = active;
  tagActive.style.backgroundColor = active + '1A';
  document.querySelectorAll('.sb-t').forEach(e => e.style.fontSize = fSize);
  document.querySelectorAll('.sb-s').forEach(e => e.style.fontSize = sSize);
}

document.getElementById('btn-save-config').onclick = () => {
  const config = { bgColor: document.getElementById('cfg-bg-color').value, activeBg: document.getElementById('cfg-active-bg').value, fontSize: document.getElementById('cfg-font-size').value, subFontSize: document.getElementById('cfg-sub-font-size').value };
  chrome.storage.local.set({ menuConfig: config }, () => alert('設定儲存成功'));
};

function showView(view) {
  const isList = view === 'list';
  document.getElementById('list-view').style.display = isList ? 'block' : 'none';
  document.getElementById('editor-view').style.display = isList ? 'none' : 'block';
}

function init() {
  chrome.storage.local.get({ identities: [], events: [], styles: [], menuConfig: DEFAULT_MENU_CONFIG }, (data) => {
    allData = { identities: data.identities, events: data.events, styles: data.styles };
    renderTable();
    applyConfigToUI(data.menuConfig);
  });
}

function applyConfigToUI(cfg) {
  document.getElementById('cfg-bg-color').value = cfg.bgColor;
  document.getElementById('cfg-active-bg').value = cfg.activeBg;
  document.getElementById('cfg-font-size').value = cfg.fontSize;
  document.getElementById('cfg-sub-font-size').value = cfg.subFontSize;
  updateSandbox();
}

['cfg-bg-color', 'cfg-active-bg', 'cfg-font-size', 'cfg-sub-font-size'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateSandbox);
});

document.getElementById('btn-new').onclick = () => openEditor(-1);
document.getElementById('btn-back').onclick = () => showView('list');
init();
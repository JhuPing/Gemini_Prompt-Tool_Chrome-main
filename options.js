const CONFIG = {
  identities: { title: "身份", desc: "設定 AI 扮演的角色身份，預設為空值", hasShortcut: false },
  events: { title: "指令", desc: "管理您在對話中使用的快捷指令 (輸入 / 呼叫)", hasShortcut: true },
  styles: { title: "風格", desc: "設定 AI 輸出的語氣風格，預設為空值", hasShortcut: false }
};

const DEFAULT_MENU_CONFIG = { bgColor: '#ffffff', activeBg: '#1a73e8', fontSize: 18, subFontSize: 13 };

let currentType = 'identities';
let allData = { identities: [], events: [], styles: [] };
let editIndex = -1;

function init() {
  chrome.storage.local.get({
    identities: [],
    events: [],
    styles: [],
    menuConfig: DEFAULT_MENU_CONFIG
  }, (data) => {
    allData = { identities: data.identities, events: data.events, styles: data.styles };
    renderTable();
    applyConfigToUI(data.menuConfig);
  });
}

// 側邊欄縮合功能
document.getElementById('prompt-menu-toggle').onclick = function(e) {
  const wrapper = document.getElementById('prompt-group-wrapper');
  wrapper.classList.toggle('collapsed');
};

// 側邊欄切換
document.querySelectorAll('.nav-item').forEach(item => {
  item.onclick = function(e) {
    if (this.id === 'prompt-menu-toggle') return;

    const target = this.getAttribute('data-target');
    const type = this.getAttribute('data-type');

    document.querySelectorAll('.nav-item, .section').forEach(el => el.classList.remove('active'));
    this.classList.add('active');

    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
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

function renderTable() {
  const tbody = document.getElementById('data-list-body');
  const thead = document.getElementById('table-head');
  const conf = CONFIG[currentType];

  document.getElementById('page-title').innerText = conf.title;
  document.getElementById('page-desc').innerText = conf.desc;

  thead.innerHTML = `
    <th class="col-name">名稱</th>
    ${conf.hasShortcut ? '<th class="col-short">代號</th>' : ''}
    <th class="col-summary">內容</th>
    <th class="col-ops" style="text-align: right;">操作</th>
  `;

  tbody.innerHTML = '';
  (allData[currentType] || []).forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${item.label}</b></td>
      ${conf.hasShortcut ? `<td><code>${item.shortcut ? '/' + item.shortcut : ''}</code></td>` : ''}
      <td><span class="text-truncate">${item.text}</span></td>
      <td style="text-align: right;">
        <button class="btn-edit" data-idx="${index}">編輯</button>
        <button class="btn-del" data-idx="${index}">刪除</button>
      </td>
    `;
    tr.querySelector('.btn-edit').onclick = () => openEditor(index);
    tr.querySelector('.btn-del').onclick = () => deleteItem(index);
    tbody.appendChild(tr);
  });
}

function openEditor(index = -1) {
  editIndex = index;
  const item = index > -1 ? allData[currentType][index] : { label: '', text: '', shortcut: '' };
  
  document.getElementById('editor-title').innerText = index > -1 ? `編輯${CONFIG[currentType].title}` : `新增${CONFIG[currentType].title}`;
  document.getElementById('edit-label').value = item.label;
  document.getElementById('edit-text').value = item.text;
  document.getElementById('edit-shortcut').value = item.shortcut || '';
  
  showView('editor');
}

document.getElementById('btn-save').onclick = function() {
  const label = document.getElementById('edit-label').value.trim();
  const text = document.getElementById('edit-text').value.trim();
  const shortcut = document.getElementById('edit-shortcut').value.trim();

  if (!label || !text) return alert('名稱與內容不能為空！');

  const newItem = { label, text };
  if (CONFIG[currentType].hasShortcut) newItem.shortcut = shortcut;

  if (editIndex > -1) allData[currentType][editIndex] = newItem;
  else allData[currentType].push(newItem);

  chrome.storage.local.set({ [currentType]: allData[currentType] }, () => {
    showView('list');
    renderTable();
  });
};

function deleteItem(index) {
  if (confirm('確定要刪除這筆資料嗎？')) {
    allData[currentType].splice(index, 1);
    chrome.storage.local.set({ [currentType]: allData[currentType] }, renderTable);
  }
}

function showView(view) {
  const isList = view === 'list';
  document.getElementById('list-view').style.display = isList ? 'block' : 'none';
  document.getElementById('editor-view').style.display = isList ? 'none' : 'block';
  document.getElementById('group-shortcut').style.display = (!isList && CONFIG[currentType].hasShortcut) ? 'block' : 'none';
}

document.getElementById('btn-new').onclick = () => openEditor(-1);
document.getElementById('btn-back').onclick = () => showView('list');

// --- 外觀設定相關邏輯 (原本功能還原) ---
function updateSandbox() {
  const bgColor = document.getElementById('cfg-bg-color').value;
  const activeBg = document.getElementById('cfg-active-bg').value;
  const fSize = document.getElementById('cfg-font-size').value + 'px';
  const sSize = document.getElementById('cfg-sub-font-size').value + 'px';

  document.getElementById('bg-hex').innerText = bgColor.toUpperCase();
  document.getElementById('active-hex').innerText = activeBg.toUpperCase();

  const menu = document.getElementById('sandbox-menu');
  const activeItem = document.getElementById('sb-active');
  menu.style.backgroundColor = bgColor;
  activeItem.style.backgroundColor = activeBg;
  activeItem.style.color = '#ffffff';

  menu.querySelectorAll('.sb-item:not(#sb-active)').forEach(item => {
    item.style.backgroundColor = bgColor;
    item.style.color = '#3c4043';
  });

  document.querySelectorAll('.sb-t').forEach(e => e.style.fontSize = fSize);
  document.querySelectorAll('.sb-s').forEach(e => e.style.fontSize = sSize);
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

document.getElementById('btn-save-config').onclick = () => {
  const config = {
    bgColor: document.getElementById('cfg-bg-color').value,
    activeBg: document.getElementById('cfg-active-bg').value,
    fontSize: document.getElementById('cfg-font-size').value,
    subFontSize: document.getElementById('cfg-sub-font-size').value
  };
  chrome.storage.local.set({ menuConfig: config }, () => alert('設定已儲存！'));
};

document.getElementById('btn-reset-config').onclick = () => {
  if(confirm('恢復預設值？')) {
    chrome.storage.local.set({ menuConfig: DEFAULT_MENU_CONFIG }, () => applyConfigToUI(DEFAULT_MENU_CONFIG));
  }
};

init();
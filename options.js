const CONFIG = {
  identities: { title: "身份", desc: "設定 AI 扮演的角色身份，預設為空值", hasShortcut: false },
  events: { title: "指令", desc: "管理快捷指令範本 (輸入 / 呼叫)", hasShortcut: true },
  styles: { title: "風格", desc: "設定輸出的語氣，預設為空值", hasShortcut: false }
};

let currentType = 'identities';
let allData = { identities: [], events: [], styles: [] };
let editIndex = -1;

function init() {
  chrome.storage.local.get({
    identities: [],
    events: [],
    styles: [],
    menuConfig: { bgColor: '#ffffff', activeBg: '#1a73e8', fontSize: 18, subFontSize: 13 }
  }, (data) => {
    allData = { identities: data.identities, events: data.events, styles: data.styles };
    renderTable();
  });
}

// 側邊欄縮合切換
document.getElementById('prompt-menu-toggle').onclick = function() {
  document.getElementById('prompt-group').classList.toggle('collapsed');
};

// 導覽點擊事件
document.querySelectorAll('.nav-item').forEach(nav => {
  nav.onclick = (e) => {
    if (nav.id === 'prompt-menu-toggle') return;

    const target = nav.getAttribute('data-target');
    const type = nav.getAttribute('data-type');

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    nav.classList.add('active');

    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(target).classList.add('active');

    if (type) {
      currentType = type;
      showView('list');
      renderTable();
    }
    e.stopPropagation();
  };
});

function renderTable() {
  const tbody = document.getElementById('data-list-body');
  const thead = document.getElementById('table-head');
  const conf = CONFIG[currentType];

  document.getElementById('page-title').innerText = conf.title;
  document.getElementById('page-desc').innerText = conf.desc;

  thead.innerHTML = `<th>名稱</th>${conf.hasShortcut ? '<th>代號</th>' : ''}<th>內容</th><th style="text-align:right;">操作</th>`;
  tbody.innerHTML = '';

  allData[currentType].forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${item.label}</b></td>
      ${conf.hasShortcut ? `<td><code>/${item.shortcut || ''}</code></td>` : ''}
      <td><span class="text-truncate">${item.text}</span></td>
      <td style="text-align:right;">
        <button class="btn-edit" onclick="openEditor(${index})">編輯</button>
        <button class="btn-del" onclick="deleteItem(${index})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.openEditor = (index = -1) => {
  editIndex = index;
  const isNew = index === -1;
  const item = !isNew ? allData[currentType][index] : { label: '', text: '', shortcut: '' };

  document.getElementById('edit-label').value = item.label;
  document.getElementById('edit-text').value = item.text;
  document.getElementById('edit-shortcut').value = item.shortcut || '';
  showView('editor');
};

document.getElementById('btn-save').onclick = () => {
  const label = document.getElementById('edit-label').value.trim();
  const text = document.getElementById('edit-text').value.trim();
  const shortcut = document.getElementById('edit-shortcut').value.trim();

  if (!label || !text) return alert('請完整填寫名稱與內容');

  const newItem = { label, text };
  if (CONFIG[currentType].hasShortcut) newItem.shortcut = shortcut;

  if (editIndex > -1) allData[currentType][editIndex] = newItem;
  else allData[currentType].push(newItem);

  chrome.storage.local.set({ [currentType]: allData[currentType] }, () => {
    showView('list');
    renderTable();
  });
};

window.deleteItem = (index) => {
  if (confirm('確定要刪除嗎？')) {
    allData[currentType].splice(index, 1);
    chrome.storage.local.set({ [currentType]: allData[currentType] }, renderTable);
  }
};

function showView(view) {
  const isList = view === 'list';
  document.getElementById('list-view').style.display = isList ? 'block' : 'none';
  document.getElementById('editor-view').style.display = isList ? 'none' : 'block';
  document.getElementById('group-shortcut').style.display = (!isList && CONFIG[currentType].hasShortcut) ? 'block' : 'none';
}

document.getElementById('btn-new').onclick = () => openEditor(-1);
document.getElementById('btn-back').onclick = () => showView('list');

init();
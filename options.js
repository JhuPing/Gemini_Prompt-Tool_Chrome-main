let allData = [];
let editIndex = -1;

const DEFAULT_CONFIG = {
  bgColor: '#ffffff',
  activeBg: '#1a73e8',
  fontSize: 18,
  subFontSize: 13
};

function init() {
  chrome.storage.local.get({
    mySnippets: [],
    menuConfig: DEFAULT_CONFIG
  }, (data) => {
    allData = data.mySnippets;
    renderTable();
    applyConfigToUI(data.menuConfig);
  });
}

function renderTable() {
  const tbody = document.getElementById('prompt-list-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  allData.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${item.label}</b></td>
      <td><code>${item.shortcut ? '/' + item.shortcut : ''}</code></td>
      <td><span class="text-truncate">${item.text}</span></td>
      <td style="text-align: right;">
        <button class="btn-edit">編輯</button>
        <button class="btn-del">刪除</button>
      </td>
    `;
    tr.querySelector('.btn-edit').onclick = () => editItem(index);
    tr.querySelector('.btn-del').onclick = () => deleteItem(index);
    tbody.appendChild(tr);
  });
}

/**
 * 核心修正：沙盒預覽連動
 * 解決背景色只改外框、不改內容的問題
 */
function updateSandbox() {
  const bgColor = document.getElementById('cfg-bg-color').value;
  const activeBg = document.getElementById('cfg-active-bg').value;
  const fSize = document.getElementById('cfg-font-size').value + 'px';
  const sSize = document.getElementById('cfg-sub-font-size').value + 'px';

  // 更新 Hex 文字顯示
  document.getElementById('bg-hex').innerText = bgColor.toUpperCase();
  document.getElementById('active-hex').innerText = activeBg.toUpperCase();

  const menu = document.getElementById('sandbox-menu');
  const activeItem = document.getElementById('sb-active');
  
  // 1. 設定整體選單背景
  menu.style.backgroundColor = bgColor;

  // 2. 設定選中項目的背景與文字
  activeItem.style.backgroundColor = activeBg;
  activeItem.style.color = '#ffffff';

  // 3. 處理「未選中項目」：強制讓它的背景跟隨選單背景色，避免被 HTML 內建的白色蓋住
  const normalItems = menu.querySelectorAll('.sb-item:not(#sb-active)');
  normalItems.forEach(item => {
    item.style.backgroundColor = bgColor;
    item.style.color = '#3c4043'; // 預設深色文字
  });

  // 4. 更新字體大小
  document.querySelectorAll('.sb-t').forEach(e => e.style.fontSize = fSize);
  document.querySelectorAll('.sb-s').forEach(e => e.style.fontSize = sSize);
}

function editItem(index) {
  editIndex = index;
  const item = allData[index];
  document.getElementById('editor-title').innerText = "編輯提示詞內容";
  document.getElementById('edit-label').value = item.label || '';
  document.getElementById('edit-shortcut').value = item.shortcut || '';
  document.getElementById('edit-text').value = item.text || '';
  
  // 顯示編輯視圖
  document.getElementById('list-view').style.display = 'none';
  document.getElementById('editor-view').style.display = 'block';
}

document.getElementById('btn-new').onclick = () => {
  editIndex = -1;
  document.getElementById('editor-title').innerText = "新增提示詞指令";
  document.getElementById('edit-label').value = '';
  document.getElementById('edit-shortcut').value = '';
  document.getElementById('edit-text').value = '';
  
  document.getElementById('list-view').style.display = 'none';
  document.getElementById('editor-view').style.display = 'block';
};

document.getElementById('btn-back').onclick = () => {
  document.getElementById('list-view').style.display = 'block';
  document.getElementById('editor-view').style.display = 'none';
};

document.getElementById('btn-save').onclick = () => {
  const label = document.getElementById('edit-label').value.trim();
  const shortcut = document.getElementById('edit-shortcut').value.trim();
  const text = document.getElementById('edit-text').value.trim();

  if (!label || !text) { alert('名稱與內容不能為空！'); return; }

  const newSnippet = { label, shortcut, text };
  if (editIndex > -1) allData[editIndex] = newSnippet;
  else allData.push(newSnippet);

  chrome.storage.local.set({ mySnippets: allData }, () => {
    document.getElementById('list-view').style.display = 'block';
    document.getElementById('editor-view').style.display = 'none';
    renderTable();
  });
}

function deleteItem(index) {
  if (confirm('確定要刪除這筆提示詞嗎？')) {
    allData.splice(index, 1);
    chrome.storage.local.set({ mySnippets: allData }, renderTable);
  }
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
    chrome.storage.local.set({ menuConfig: DEFAULT_CONFIG }, () => applyConfigToUI(DEFAULT_CONFIG));
  }
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.onclick = () => {
    document.querySelectorAll('.nav-item, .section').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    
    const target = item.getAttribute('data-target');
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.getElementById(target).style.display = 'block';
    setTimeout(() => document.getElementById(target).classList.add('active'), 10);
    
    // 如果回到清單頁，確保顯示 list-view 隱藏 editor-view
    if (target === 'prompt-section') {
      document.getElementById('list-view').style.display = 'block';
      document.getElementById('editor-view').style.display = 'none';
    }
  };
});

init();
const CONFIG = {
  identities: { title: "身份", desc: "設定 AI 扮演的角色背景，決定對話的專業領域與立場。" },
  events:     { title: "指令", desc: "管理核心任務邏輯，定義 AI 執行動作的標準作業流程。" },
  styles:     { title: "風格", desc: "調整輸出的語氣與視覺格式，確保結果符合特定使用情境。" }
};

const DEFAULT_MENU_CONFIG = {
  bgColor:     '#ffffff',
  activeBg:    '#1a73e8',
  labelColor:  '#1a1c20',
  textColor:   '#70757a',
  fontSize:    18,
  subFontSize: 13
};

let currentType = 'identities';
let allData = { identities: [], events: [], styles: [] };
let editIndex = -1;

// ── 工具函式 ──
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Sidebar 折疊 & 導覽點擊 ──
document.querySelectorAll('.nav-item, .sub-item').forEach(item => {
  item.onclick = function (e) {
    // 折疊功能：只有 prompt-menu-toggle 才執行
    if (this.id === 'prompt-menu-toggle') {
      e.stopPropagation();
      const submenu = document.getElementById('prompt-submenu');
      const arrow   = document.getElementById('prompt-arrow');
      const isCollapsed = submenu.style.maxHeight === '0px';
      submenu.style.maxHeight = isCollapsed ? '500px' : '0px';
      arrow.style.transform   = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
      return;
    }
    // 導覽邏輯：其他項目
    document.querySelectorAll('.nav-item, .sub-item').forEach(el => el.classList.remove('active'));
    this.classList.add('active');
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    const target = this.getAttribute('data-target');
    const targetSec = document.getElementById(target);
    if (targetSec) targetSec.classList.add('active');
    const type = this.getAttribute('data-type');
    if (type) { currentType = type; showView('list'); renderTable(); }
  };
});

// ── 表格渲染 ──
function renderTable() {
  const tbody = document.getElementById('data-list-body');
  document.getElementById('page-title').innerText     = CONFIG[currentType].title;
  document.getElementById('page-desc').innerText      = CONFIG[currentType].desc;
  document.getElementById('list-card-title').innerText = '清單';
  tbody.innerHTML = '';

  const items = allData[currentType] || [];

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3">
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>尚未建立任何${CONFIG[currentType].title}，點擊右上角「新增」開始建立。</p>
      </div>
    </td></tr>`;
    return;
  }

  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="cell-label">${item.label}</span></td>
      <td><div class="cell-text">${item.text}</div></td>
      <td style="text-align:right;">
        <button class="btn-action-move" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button class="btn-action-move" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="btn-action-edit">編輯</button>
        <button class="btn-action-del">刪除</button>
      </td>`;
    tr.querySelectorAll('.btn-action-move')[0].onclick = () => moveItem(index, -1);
    tr.querySelectorAll('.btn-action-move')[1].onclick = () => moveItem(index,  1);
    tr.querySelector('.btn-action-edit').onclick = () => openEditor(index);
    tr.querySelector('.btn-action-del').onclick  = () => deleteItem(index);
    tbody.appendChild(tr);
  });
}

// ── 編輯器 ──
function openEditor(index = -1) {
  editIndex = index;
  const item = index > -1 ? allData[currentType][index] : { label: '', text: '' };
  document.getElementById('editor-title').innerText = index > -1 ? '編輯' : '新增';
  document.getElementById('edit-label').value = item.label;
  document.getElementById('edit-text').value  = item.text;
  showView('editor');
}

document.getElementById('btn-save').onclick = () => {
  const label = document.getElementById('edit-label').value.trim();
  const text  = document.getElementById('edit-text').value.trim();
  if (!label || !text) return alert('名稱與內容不可為空');
  if (editIndex > -1) allData[currentType][editIndex] = { label, text };
  else allData[currentType].push({ label, text });
  chrome.storage.local.set({ [currentType]: allData[currentType] }, () => { showView('list'); renderTable(); });
};

function deleteItem(index) {
  if (confirm('確定要刪除這個項目嗎？')) {
    allData[currentType].splice(index, 1);
    chrome.storage.local.set({ [currentType]: allData[currentType] }, renderTable);
  }
}

function moveItem(index, direction) {
  const items = allData[currentType];
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= items.length) return;
  [items[index], items[newIndex]] = [items[newIndex], items[index]];
  chrome.storage.local.set({ [currentType]: items }, renderTable);
}

// ── 外觀預覽 ──
function updateSandbox() {
  const bg         = document.getElementById('cfg-bg-color').value    || DEFAULT_MENU_CONFIG.bgColor;
  const active     = document.getElementById('cfg-active-bg').value   || DEFAULT_MENU_CONFIG.activeBg;
  const labelColor = document.getElementById('cfg-label-color').value || DEFAULT_MENU_CONFIG.labelColor;
  const textColor  = document.getElementById('cfg-text-color').value  || DEFAULT_MENU_CONFIG.textColor;
  const fSize      = (document.getElementById('cfg-font-size').value     || DEFAULT_MENU_CONFIG.fontSize)    + 'px';
  const sSize      = (document.getElementById('cfg-sub-font-size').value || DEFAULT_MENU_CONFIG.subFontSize) + 'px';

  // 更新 hex 顯示（安全：只在元素存在時操作）
  const bgHexEl     = document.getElementById('bg-hex');
  const activeHexEl = document.getElementById('active-hex');
  const labelHexEl  = document.getElementById('label-hex');
  const textHexEl   = document.getElementById('text-hex');
  if (bgHexEl)     bgHexEl.innerText     = bg.toUpperCase();
  if (activeHexEl) activeHexEl.innerText = active.toUpperCase();
  if (labelHexEl)  labelHexEl.innerText  = labelColor.toUpperCase();
  if (textHexEl)   textHexEl.innerText   = textColor.toUpperCase();

  // 預覽選單背景
  const sandboxMenu = document.getElementById('sandbox-menu');
  if (sandboxMenu) sandboxMenu.style.backgroundColor = bg;

  // 選中項目：背景主題色，文字白色
  const activeItem = document.getElementById('sb-active-item');
  if (activeItem) {
    activeItem.style.backgroundColor = active;
    const sbT = activeItem.querySelector('.sb-t');
    const sbS = activeItem.querySelector('.sb-s');
    if (sbT) { sbT.style.fontSize = fSize; sbT.style.color = '#fff'; }
    if (sbS) { sbS.style.fontSize = sSize; sbS.style.color = 'rgba(255,255,255,0.85)'; }
  }

  // 一般項目：套用使用者文字色設定
  const normalItem = document.getElementById('sb-normal-item');
  if (normalItem) {
    normalItem.style.backgroundColor = bg;
    const sbT2 = normalItem.querySelector('.sb-t2');
    const sbS2 = normalItem.querySelector('.sb-s2');
    if (sbT2) { sbT2.style.fontSize = fSize; sbT2.style.color = labelColor; }
    if (sbS2) { sbS2.style.fontSize = sSize; sbS2.style.color = textColor; }
  }

  // 預覽 Tag
  const previewTag = document.getElementById('sb-preview-tag');
  if (previewTag) {
    previewTag.style.borderColor     = active;
    previewTag.style.color           = active;
    previewTag.style.backgroundColor = hexToRgba(active, 0.1);
  }
}

// ── 儲存外觀設定 ──
document.getElementById('btn-save-config').onclick = () => {
  const config = {
    bgColor:     document.getElementById('cfg-bg-color').value,
    activeBg:    document.getElementById('cfg-active-bg').value,
    labelColor:  document.getElementById('cfg-label-color').value,
    textColor:   document.getElementById('cfg-text-color').value,
    fontSize:    document.getElementById('cfg-font-size').value,
    subFontSize: document.getElementById('cfg-sub-font-size').value
  };
  chrome.storage.local.set({ menuConfig: config }, () => alert('設定儲存成功！'));
};

// ── 還原預設 ──
document.getElementById('btn-reset-config').onclick = () => {
  if (confirm('確定要還原所有外觀設定為預設值嗎？')) {
    document.getElementById('cfg-bg-color').value      = DEFAULT_MENU_CONFIG.bgColor;
    document.getElementById('cfg-active-bg').value     = DEFAULT_MENU_CONFIG.activeBg;
    document.getElementById('cfg-label-color').value   = DEFAULT_MENU_CONFIG.labelColor;
    document.getElementById('cfg-text-color').value    = DEFAULT_MENU_CONFIG.textColor;
    document.getElementById('cfg-font-size').value     = DEFAULT_MENU_CONFIG.fontSize;
    document.getElementById('cfg-sub-font-size').value = DEFAULT_MENU_CONFIG.subFontSize;
    updateSandbox();
  }
};

// ── 切換 list / editor 視圖 ──
function showView(view) {
  document.getElementById('list-view').style.display   = view === 'list'   ? 'block' : 'none';
  document.getElementById('editor-view').style.display = view === 'editor' ? 'block' : 'none';
}

// ── 初始化（所有事件綁定在 storage 回調完成後才執行 updateSandbox）──
function init() {
  document.getElementById('prompt-submenu').style.maxHeight = '500px';

  chrome.storage.local.get(
    { identities: [], events: [], styles: [], menuConfig: DEFAULT_MENU_CONFIG },
    (data) => {
      // 補齊舊版本缺少的欄位
      const cfg = Object.assign({}, DEFAULT_MENU_CONFIG, data.menuConfig);

      allData = { identities: data.identities, events: data.events, styles: data.styles };

      document.getElementById('cfg-bg-color').value      = cfg.bgColor;
      document.getElementById('cfg-active-bg').value     = cfg.activeBg;
      document.getElementById('cfg-label-color').value   = cfg.labelColor;
      document.getElementById('cfg-text-color').value    = cfg.textColor;
      document.getElementById('cfg-font-size').value     = cfg.fontSize;
      document.getElementById('cfg-sub-font-size').value = cfg.subFontSize;

      // 等所有欄位填入完畢，再綁定 oninput 並執行一次 sandbox 更新
      ['cfg-bg-color', 'cfg-active-bg', 'cfg-label-color', 'cfg-text-color', 'cfg-font-size', 'cfg-sub-font-size'].forEach(id => {
        document.getElementById(id).oninput = updateSandbox;
      });

      renderTable();
      updateSandbox();
    }
  );
}

document.getElementById('btn-new').onclick  = () => openEditor(-1);
document.getElementById('btn-back').onclick = () => showView('list');

init();
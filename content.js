// === 以下區塊是處理：核心變數與選單狀態 ===
let selectedIndex = 0;
let menu = null;
let allSnippets = [];
let filteredSnippets = [];
let currentMenuType = 'events';

let activeIdentity = "", activeIdentityLabel = ""; 
let activePromptText = "", activePromptLabel = "";
let activeStyle = "", activeStyleLabel = "";

// === 以下區塊是處理：動態外觀樣式注入 ===
function injectStyles() {
  chrome.storage.local.get({ menuConfig: { bgColor: '#ffffff', activeBg: '#1a73e8', fontSize: 18, subFontSize: 13 } }, (data) => {
    const cfg = data.menuConfig;
    let style = document.getElementById('ai-helper-style');
    if (!style) { style = document.createElement('style'); style.id = 'ai-helper-style'; document.head.appendChild(style); }
    
    style.innerHTML = `
      .ai-helper-container { display: flex; gap: 10px; margin: 12px; flex-wrap: wrap; align-items: center; }
      .prompt-tag-slot {
        display: flex; align-items: center; justify-content: space-between;
        width: 160px; height: 36px; padding: 0 12px; border-radius: 10px;
        border: 1.5px dashed #dadce0; font-size: 13px; cursor: pointer; background: #fff; color: #5f6368;
      }
      .prompt-tag-slot.active { border-style: solid; background: ${cfg.activeBg}1A; color: ${cfg.activeBg}; border-color: ${cfg.activeBg}; font-weight: bold; }
      .ai-search-menu {
        position: fixed; border: 1px solid #dadce0; z-index: 1000000; width: 320px; 
        background: ${cfg.bgColor}; border-radius: 12px; box-shadow: 0 -8px 30px rgba(0,0,0,0.2);
      }
      .menu-item.selected { background-color: ${cfg.activeBg} !important; color: #fff !important; }
      .menu-item.selected * { color: #fff !important; }
      .menu-item-label { font-weight: bold; font-size: ${cfg.fontSize}px; color: ${cfg.activeBg}; }
      .menu-item-text { font-size: ${cfg.subFontSize}px; color: #70757a; }
      .menu-item { padding: 14px 18px; cursor: pointer; border-bottom: 1px solid #f1f3f4; }
    `;
  });
}

// === 以下區塊是處理：Tag UI 更新與點擊事件綁定 ===
function updateTagUI() {
  const inputArea = document.querySelector('div[contenteditable="true"]');
  if (!inputArea) return;
  let container = document.getElementById('ai-helper-slots');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ai-helper-slots';
    container.className = 'ai-helper-container';
    const targetParent = inputArea.closest('.input-area-container') || inputArea.parentElement;
    targetParent.prepend(container);
  }
  
  const slots = [
    { key: 'identities', display: activeIdentityLabel ? `身份：${activeIdentityLabel}` : '設定身份', val: activeIdentity },
    { key: 'events', display: activePromptLabel ? `指令：${activePromptLabel}` : '設定指令', val: activePromptText },
    { key: 'styles', display: activeStyleLabel ? `風格：${activeStyleLabel}` : '設定風格', val: activeStyle }
  ];
  
  container.innerHTML = slots.map(s => `
    <div class="prompt-tag-slot ${s.val ? 'active' : ''}" data-type="${s.key}">
      <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.display}</span>
      ${s.val ? `<span class="tag-close" data-clear="${s.key}" style="margin-left:8px;">✕</span>` : ''}
    </div>
  `).join('') + `<button id="btn-reset-gemini" style="height:36px; padding:0 12px; border-radius:10px; cursor:pointer; background:#f1f3f4; border:1px solid #dadce0; font-size:13px;">清除記憶</button>`;

  container.querySelectorAll('.prompt-tag-slot').forEach(el => {
    el.onclick = (e) => {
      if (e.target.dataset.clear) { clearSlot(e.target.dataset.clear); } 
      else { triggerSearchMenu(el.dataset.type, el); }
    };
  });
  document.getElementById('btn-reset-gemini').onclick = resetGeminiContext;
}

// === 以下區塊是處理：點擊 Tag 後開啟搜尋選單 ===
function triggerSearchMenu(type, targetEl) {
  currentMenuType = type;
  chrome.storage.local.get([type], (data) => {
    allSnippets = data[type] || [];
    filteredSnippets = [...allSnippets];
    showSearchMenu(targetEl);
  });
}

function showSearchMenu(el) {
  if (menu) menu.remove();
  menu = document.createElement('div');
  menu.className = 'ai-search-menu';
  const rect = el.getBoundingClientRect();
  menu.style.left = `${rect.left}px`;
  menu.style.bottom = `${window.innerHeight - rect.top + 8}px`;
  menu.innerHTML = `<div style="padding:10px; background:#f8f9fa; border-bottom:1px solid #eee;">
    <input type="text" id="ai-search-input" placeholder="搜尋..." style="width:100%; padding:8px; border-radius:6px; border:1px solid #ddd; outline:none;">
  </div><div id="ai-menu-list" style="max-height:250px; overflow-y:auto;"></div>`;
  document.body.appendChild(menu);
  
  const searchInput = document.getElementById('ai-search-input');
  searchInput.focus();
  searchInput.oninput = (e) => {
    const q = e.target.value.toLowerCase();
    filteredSnippets = allSnippets.filter(s => s.label.toLowerCase().includes(q) || s.text.toLowerCase().includes(q));
    renderList();
  };
  renderList();
}

function renderList() {
  const list = document.getElementById('ai-menu-list');
  list.innerHTML = filteredSnippets.map((s, i) => `
    <div class="menu-item ${i === selectedIndex ? 'selected' : ''}" data-idx="${i}">
      <div class="menu-item-label">${s.label}</div>
      <div class="menu-item-text">${s.text}</div>
    </div>
  `).join('');
  list.querySelectorAll('.menu-item').forEach(el => {
    el.onclick = () => selectItem(filteredSnippets[el.dataset.idx]);
  });
}

function selectItem(selected) {
  if (currentMenuType === 'identities') { activeIdentity = selected.text; activeIdentityLabel = selected.label; }
  else if (currentMenuType === 'events') { activePromptText = selected.text; activePromptLabel = selected.label; }
  else if (currentMenuType === 'styles') { activeStyle = selected.text; activeStyleLabel = selected.label; }
  if (menu) menu.remove();
  menu = null;
  updateTagUI();
}

function clearSlot(type) {
  if (type === 'identities') { activeIdentity = ""; activeIdentityLabel = ""; }
  else if (type === 'events') { activePromptText = ""; activePromptLabel = ""; }
  else if (type === 'styles') { activeStyle = ""; activeStyleLabel = ""; }
  updateTagUI();
}

function resetGeminiContext() {
  const input = document.querySelector('div[contenteditable="true"]');
  if (input) {
    input.innerText = `### 任務重置 ###\n請清除目前的上下文。接下來我將提供新的主題，請僅根據新提供的資料進行回覆。`;
    activeIdentity = ""; activePromptText = ""; activeStyle = "";
    updateTagUI();
    setTimeout(() => {
      const btn = document.querySelector('button[aria-label*="發送"], button[aria-label*="Send"]');
      if (btn) btn.click();
    }, 100);
  }
}

// === 以下區塊是處理：Enter 發送時組合提示詞 ===
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !menu) {
    const field = e.target;
    if (field.isContentEditable && (activeIdentity || activePromptText || activeStyle)) {
      const content = field.innerText.trim();
      if (!content) return;
      e.preventDefault();
      field.innerText = `身份：${activeIdentity || "未指定"}\n指令：${activePromptText || "未指定"}\n風格：${activeStyle || "未指定"}\n----------\n內容：${content}`;
      setTimeout(() => {
        const btn = document.querySelector('button[aria-label*="發送"], button[aria-label*="Send"]');
        if (btn) { btn.click(); updateTagUI(); }
      }, 50);
    }
  }
}, true);

document.addEventListener('click', (e) => { if (menu && !menu.contains(e.target) && !e.target.closest('.prompt-tag-slot')) { menu.remove(); menu = null; } });
injectStyles();
setInterval(updateTagUI, 1000);
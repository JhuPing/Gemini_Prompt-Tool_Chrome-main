let selectedIndex = 0;
let menu = null;
let allSnippets = [];
let filteredSnippets = [];
let currentMenuType = 'events';

let activeIdentity = "";
let activeIdentityLabel = ""; 
let activePromptLabel = "";
let activePromptText = "";
let activeStyle = "";
let activeStyleLabel = "";

// --- 1. 注入 CSS ---
const style = document.createElement('style');
style.innerHTML = `
  .ai-helper-container { display: flex; gap: 10px; margin: 12px; flex-wrap: wrap; align-items: center; }
  .prompt-tag-slot {
    display: flex; align-items: center; justify-content: space-between;
    width: 160px; height: 36px; padding: 0 12px; border-radius: 10px;
    border: 1.5px dashed #dadce0; font-size: 13px; cursor: pointer; background: #fff; color: #5f6368;
    box-sizing: border-box; transition: all 0.2s; position: relative;
  }
  .prompt-tag-slot.active { border-style: solid; background: #e8f0fe; color: #1a73e8; border-color: #1a73e8; font-weight: bold; }
  .tag-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: left; }
  .tag-close { cursor: pointer; margin-left: 6px; font-size: 16px; opacity: 0.7; }
  .tag-close:hover { opacity: 1; color: #d93025; }
  
  .ai-search-menu {
    position: fixed; border: 1px solid #dadce0; z-index: 1000000 !important; width: 320px; 
    background: #fff; border-radius: 12px; box-shadow: 0 -8px 30px rgba(0,0,0,0.2); overflow: hidden;
    display: flex; flex-direction: column;
  }
  .menu-search-box { padding: 12px; border-bottom: 1px solid #f1f3f4; background: #f8f9fa; }
  .menu-search-input {
    width: 100%; padding: 10px 12px; border: 1.5px solid #dadce0; border-radius: 8px;
    font-size: 14px; outline: none; box-sizing: border-box;
  }
  .menu-search-input:focus { border-color: #4285f4; }
  .menu-list-container { max-height: 250px; overflow-y: auto; }
  .menu-item { padding: 14px 18px; cursor: pointer; border-bottom: 1px solid #f1f3f4; transition: background 0.2s; }
  .menu-item.selected { background-color: #f1f3f4; }
  .menu-item-label { font-weight: bold; font-size: 14px; color: #1a73e8; margin-bottom: 4px; }
  .menu-item-text { font-size: 12px; color: #70757a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
document.head.appendChild(style);

// --- 2. UI 渲染 ---
function updateTagUI() {
  const inputArea = document.querySelector('div[contenteditable="true"]');
  if (!inputArea) return;
  
  let container = document.getElementById('ai-helper-slots');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ai-helper-slots';
    container.className = 'ai-helper-container';
    const wrapper = inputArea.closest('.input-area-container') || inputArea.parentElement;
    wrapper.prepend(container);
  }
  
  const slots = [
    { key: 'identities', label: '身份', val: activeIdentity, display: activeIdentityLabel ? `身份：${activeIdentityLabel}` : '點擊設定身份' },
    { key: 'events', label: '指令', val: activePromptText, display: activePromptLabel ? `指令：${activePromptLabel}` : '點擊設定指令' },
    { key: 'styles', label: '風格', val: activeStyle, display: activeStyleLabel ? `風格：${activeStyleLabel}` : '點擊設定風格' }
  ];
  
  container.innerHTML = slots.map(s => `
    <div class="prompt-tag-slot ${s.val ? 'active' : ''}" data-type="${s.key}">
      <span class="tag-text">${s.display}</span>
      ${s.val ? `<span class="tag-close" data-clear="${s.key}">✕</span>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.prompt-tag-slot').forEach(el => {
    el.onclick = (e) => {
      const clearKey = e.target.getAttribute('data-clear');
      if (clearKey) { e.stopPropagation(); clearSlot(clearKey); } 
      else { triggerSearchMenu(el.getAttribute('data-type'), el); }
    };
  });
}

// --- 3. 選單控制 ---
function triggerSearchMenu(type, targetEl) {
  currentMenuType = type;
  chrome.storage.local.get([type], (data) => {
    allSnippets = data[type] || [];
    filteredSnippets = [...allSnippets];
    showSearchMenu(targetEl);
  });
}

function showSearchMenu(el) {
  removeMenu();
  menu = document.createElement('div');
  menu.className = 'ai-search-menu';
  
  const rect = el.getBoundingClientRect();
  let leftPos = rect.left;
  if (leftPos + 320 > window.innerWidth) leftPos = window.innerWidth - 340;
  
  menu.style.left = `${leftPos}px`;
  menu.style.bottom = `${window.innerHeight - rect.top + 8}px`;

  menu.innerHTML = `
    <div class="menu-search-box">
      <input type="text" class="menu-search-input" placeholder="搜尋名稱或內容..." id="ai-search-input">
    </div>
    <div class="menu-list-container" id="ai-menu-list"></div>
  `;
  document.body.appendChild(menu);

  const searchInput = document.getElementById('ai-search-input');
  searchInput.focus();
  
  searchInput.oninput = (e) => {
    const query = e.target.value.toLowerCase();
    filteredSnippets = allSnippets.filter(s => 
      s.label.toLowerCase().includes(query) || s.text.toLowerCase().includes(query)
    );
    selectedIndex = 0;
    renderList();
  };
  renderList();
}

function renderList() {
  const listContainer = document.getElementById('ai-menu-list');
  if (!listContainer) return;
  listContainer.innerHTML = filteredSnippets.length ? '' : '<div style="padding:20px;color:#999;font-size:13px;text-align:center;">無相符項目</div>';

  filteredSnippets.forEach((s, i) => {
    const itemEl = document.createElement('div');
    itemEl.className = `menu-item ${i === selectedIndex ? 'selected' : ''}`;
    itemEl.innerHTML = `
      <div class="menu-item-label">${s.label}</div>
      <div class="menu-item-text">${s.text}</div>
    `;
    itemEl.onclick = () => selectItem(s);
    listContainer.appendChild(itemEl);
    if (i === selectedIndex) itemEl.scrollIntoView({ block: 'nearest' });
  });
}

function selectItem(selected) {
  if (currentMenuType === 'identities') { activeIdentity = selected.text; activeIdentityLabel = selected.label; }
  if (currentMenuType === 'events') { activePromptText = selected.text; activePromptLabel = selected.label; }
  if (currentMenuType === 'styles') { activeStyle = selected.text; activeStyleLabel = selected.label; }
  removeMenu();
  updateTagUI();
}

function clearSlot(type) {
  if (type === 'identities') { activeIdentity = ""; activeIdentityLabel = ""; }
  if (type === 'events') { activePromptText = ""; activePromptLabel = ""; }
  if (type === 'styles') { activeStyle = ""; activeStyleLabel = ""; }
  updateTagUI();
}

function removeMenu() { if (menu) { menu.remove(); menu = null; selectedIndex = 0; } }

// --- 4. 訊息發送邏輯 (調整為您要求的精簡格式) ---
document.addEventListener('keydown', (e) => {
  if (e.isComposing || e.keyCode === 229) return;
  if (menu) {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = (selectedIndex + 1) % filteredSnippets.length; renderList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = (selectedIndex - 1 + filteredSnippets.length) % filteredSnippets.length; renderList(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filteredSnippets[selectedIndex]) selectItem(filteredSnippets[selectedIndex]); }
    else if (e.key === 'Escape') { removeMenu(); }
    return;
  }
  
  if (e.key === 'Enter' && !e.shiftKey) {
    const field = e.target;
    if (field.isContentEditable && (activeIdentity || activePromptText || activeStyle)) {
      const userInput = field.innerText.trim();
      if (!userInput) return;
      e.preventDefault(); e.stopImmediatePropagation();
      
      // 根據您的需求更新組合格式
      const finalMessage = `身份：${activeIdentity || "（未指定）"}
指令：${activePromptText || "（未指定）"}
回覆風格：${activeStyle || "（未指定）"}
------------------------------
要處理的內容：
${userInput}`;

      field.innerText = finalMessage;
      
      setTimeout(() => {
        const sendBtn = document.querySelector('button[aria-label*="發送"], button[aria-label*="Send"], button[aria-label*="傳送"]');
        if (sendBtn) {
          sendBtn.click();
          updateTagUI(); 
        }
      }, 50);
    }
  }
}, true);

document.addEventListener('click', (e) => {
  if (menu && !menu.contains(e.target) && !e.target.closest('.prompt-tag-slot')) removeMenu();
});

setInterval(updateTagUI, 2000);
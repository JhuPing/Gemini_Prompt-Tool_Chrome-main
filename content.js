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

const style = document.createElement('style');
style.innerHTML = `
  .ai-helper-container { display: flex; gap: 10px; margin: 12px; flex-wrap: wrap; align-items: center; z-index: 10; }
  .prompt-tag-slot {
    display: flex; align-items: center; justify-content: space-between;
    width: 160px; height: 36px; padding: 0 12px; border-radius: 10px;
    border: 1.5px dashed #dadce0; font-size: 13px; cursor: pointer; background: #fff; color: #5f6368;
    box-sizing: border-box; transition: all 0.2s; position: relative;
  }
  .prompt-tag-slot.active { border-style: solid; background: #e8f0fe; color: #1a73e8; border-color: #1a73e8; font-weight: bold; }
  .reset-memory-btn {
    display: flex; align-items: center; justify-content: center;
    height: 36px; padding: 0 15px; border-radius: 10px;
    background: #f1f3f4; color: #3c4043; font-size: 13px; font-weight: 600;
    cursor: pointer; border: 1px solid #dadce0;
  }
  .reset-memory-btn:hover { background: #e8e8e8; border-color: #3c4043; }
  .tag-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: left; }
  .tag-close { cursor: pointer; margin-left: 6px; font-size: 16px; opacity: 0.7; }
  .ai-search-menu {
    position: fixed; border: 1px solid #dadce0; z-index: 1000000 !important; width: 320px; 
    background: #fff; border-radius: 12px; box-shadow: 0 -8px 30px rgba(0,0,0,0.2); overflow: hidden;
    display: flex; flex-direction: column;
  }
  .menu-search-box { padding: 12px; border-bottom: 1px solid #f1f3f4; background: #f8f9fa; }
  .menu-search-input { width: 100%; padding: 10px 12px; border: 1.5px solid #dadce0; border-radius: 8px; font-size: 14px; outline: none; box-sizing: border-box; }
  .menu-list-container { max-height: 250px; overflow-y: auto; }
  .menu-item { padding: 14px 18px; cursor: pointer; border-bottom: 1px solid #f1f3f4; }
  .menu-item.selected { background-color: #f1f3f4; }
  .menu-item-label { font-weight: bold; font-size: 14px; color: #1a73e8; margin-bottom: 4px; }
  .menu-item-text { font-size: 12px; color: #70757a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
document.head.appendChild(style);

function updateTagUI() {
  const inputArea = document.querySelector('div[contenteditable="true"]');
  if (!inputArea) return;
  let container = document.getElementById('ai-helper-slots');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ai-helper-slots';
    container.className = 'ai-helper-container';
  }
  const targetParent = inputArea.closest('.input-area-container') || inputArea.parentElement;
  if (container.parentElement !== targetParent) targetParent.prepend(container);
  
  const slots = [
    { key: 'identities', label: '身份', val: activeIdentity, display: activeIdentityLabel ? `身份：${activeIdentityLabel}` : '設定身份' },
    { key: 'events', label: '指令', val: activePromptText, display: activePromptLabel ? `指令：${activePromptLabel}` : '設定指令' },
    { key: 'styles', label: '風格', val: activeStyle, display: activeStyleLabel ? `風格：${activeStyleLabel}` : '設定風格' }
  ];
  
  let html = slots.map(s => `
    <div class="prompt-tag-slot ${s.val ? 'active' : ''}" data-type="${s.key}">
      <span class="tag-text">${s.display}</span>
      ${s.val ? `<span class="tag-close" data-clear="${s.key}">✕</span>` : ''}
    </div>
  `).join('');
  html += `<div class="reset-memory-btn" id="btn-reset-gemini">清除 Gemini 記憶</div>`;
  container.innerHTML = html;

  container.querySelectorAll('.prompt-tag-slot').forEach(el => {
    el.onclick = (e) => {
      if (e.target.dataset.clear) { e.stopPropagation(); clearSlot(e.target.dataset.clear); } 
      else { triggerSearchMenu(el.dataset.type, el); }
    };
  });
  document.getElementById('btn-reset-gemini').onclick = resetGeminiContext;
}

function resetGeminiContext() {
  const inputArea = document.querySelector('div[contenteditable="true"]');
  if (!inputArea) return;
  inputArea.innerText = `### 任務重置 ###\n請清除目前的上下文（Context）緩存。接下來我將提供新的主題，請僅根據新提供的資料進行回覆，嚴禁受前文干擾。`;
  activeIdentity = ""; activeIdentityLabel = ""; activePromptText = ""; activePromptLabel = ""; activeStyle = ""; activeStyleLabel = "";
  setTimeout(() => {
    const sendBtn = document.querySelector('button[aria-label*="發送"], button[aria-label*="Send"], button[aria-label*="傳送"]');
    if (sendBtn) { sendBtn.click(); updateTagUI(); }
  }, 100);
}

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
  menu.innerHTML = `<div class="menu-search-box"><input type="text" class="menu-search-input" placeholder="搜尋..." id="ai-search-input"></div><div class="menu-list-container" id="ai-menu-list"></div>`;
  document.body.appendChild(menu);
  const searchInput = document.getElementById('ai-search-input');
  searchInput.focus();
  searchInput.oninput = (e) => {
    const query = e.target.value.toLowerCase();
    filteredSnippets = allSnippets.filter(s => s.label.toLowerCase().includes(query) || s.text.toLowerCase().includes(query));
    selectedIndex = 0;
    renderList();
  };
  renderList();
}

function renderList() {
  const listContainer = document.getElementById('ai-menu-list');
  if (!listContainer) return;
  listContainer.innerHTML = filteredSnippets.length ? '' : '<div style="padding:20px;color:#999;text-align:center;">無項目</div>';
  filteredSnippets.forEach((s, i) => {
    const itemEl = document.createElement('div');
    itemEl.className = `menu-item ${i === selectedIndex ? 'selected' : ''}`;
    itemEl.innerHTML = `<div class="menu-item-label">${s.label}</div><div class="menu-item-text">${s.text}</div>`;
    itemEl.onclick = () => selectItem(s);
    listContainer.appendChild(itemEl);
  });
}

function selectItem(selected) {
  if (currentMenuType === 'identities') { activeIdentity = selected.text; activeIdentityLabel = selected.label; }
  if (currentMenuType === 'events') { activePromptText = selected.text; activePromptLabel = selected.label; }
  if (currentMenuType === 'styles') { activeStyle = selected.text; activeStyleLabel = selected.label; }
  removeMenu(); updateTagUI();
}

function clearSlot(type) {
  if (type === 'identities') { activeIdentity = ""; activeIdentityLabel = ""; }
  if (type === 'events') { activePromptText = ""; activePromptLabel = ""; }
  if (type === 'styles') { activeStyle = ""; activeStyleLabel = ""; }
  updateTagUI();
}

function removeMenu() { if (menu) { menu.remove(); menu = null; selectedIndex = 0; } }

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
      field.innerText = `身份：${activeIdentity || "未指定"}\n指令：${activePromptText || "未指定"}\n風格：${activeStyle || "未指定"}\n----------\n處理內容：${userInput}`;
      setTimeout(() => {
        const sendBtn = document.querySelector('button[aria-label*="發送"], button[aria-label*="Send"], button[aria-label*="傳送"]');
        if (sendBtn) { sendBtn.click(); updateTagUI(); }
      }, 50);
    }
  }
}, true);

document.addEventListener('click', (e) => { if (menu && !menu.contains(e.target) && !e.target.closest('.prompt-tag-slot')) removeMenu(); });
setInterval(updateTagUI, 1000);
let selectedIndex = 0;
let menu = null;
let allSnippets = []; // 儲存當前分類的所有資料
let filteredSnippets = []; // 儲存搜尋過濾後的資料
let currentMenuType = 'events';

let activeIdentity = "";
let activePromptLabel = "";
let activePromptText = "";
let activeStyle = "";

// --- 1. 注入 CSS (增加搜尋框樣式) ---
const style = document.createElement('style');
style.innerHTML = `
  .ai-helper-container { display: flex; gap: 8px; margin: 8px 12px; flex-wrap: wrap; }
  .prompt-tag-slot {
    display: flex; align-items: center; padding: 6px 14px; border-radius: 20px;
    border: 1.5px dashed #dadce0; font-size: 13px; cursor: pointer; background: #fff; color: #5f6368; gap: 6px;
  }
  .prompt-tag-slot.active { border-style: solid; background: #e8f0fe; color: #1a73e8; border-color: #1a73e8; font-weight: bold; }
  .tag-close { cursor: pointer; margin-left: 4px; font-size: 14px; }
  
  /* 搜尋選單樣式 */
  .ai-search-menu {
    position: fixed; border: 1px solid #dadce0; z-index: 10000; width: 320px; 
    background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); overflow: hidden;
  }
  .menu-search-box { padding: 12px; border-bottom: 1px solid #f1f3f4; background: #f8f9fa; }
  .menu-search-input {
    width: 100%; padding: 8px 12px; border: 1px solid #dadce0; border-radius: 6px;
    font-size: 14px; outline: none; transition: border-color 0.2s;
  }
  .menu-search-input:focus { border-color: #4285f4; }
  .menu-list-container { max-height: 300px; overflow-y: auto; }
  .menu-item { padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f1f3f4; transition: background 0.2s; }
  .menu-item.selected { background-color: #e8f0fe; }
  .menu-item-label { font-weight: bold; font-size: 14px; color: #3c4043; margin-bottom: 2px; }
  .menu-item-text { font-size: 12px; color: #70757a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
document.head.appendChild(style);

// --- 2. UI 渲染 (槽位) ---
function updateTagUI() {
  const inputArea = document.querySelector('div[contenteditable="true"]');
  if (!inputArea) return;
  let container = document.getElementById('ai-helper-slots');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ai-helper-slots';
    container.className = 'ai-helper-container';
    inputArea.parentElement.prepend(container);
  }
  const slots = [
    { key: 'identities', label: '身份', val: activeIdentity, display: activeIdentity ? `身份：${activeIdentity.substring(0,6)}...` : '+ 身份' },
    { key: 'events', label: '指令', val: activePromptText, display: activePromptLabel ? `指令：${activePromptLabel}` : '+ 指令' },
    { key: 'styles', label: '風格', val: activeStyle, display: activeStyle ? `風格：${activeStyle.substring(0,6)}...` : '+ 風格' }
  ];
  container.innerHTML = slots.map(s => `
    <div class="prompt-tag-slot ${s.val ? 'active' : ''}" data-type="${s.key}">
      <span>${s.display}</span>
      ${s.val ? `<span class="tag-close" data-clear="${s.key}">✕</span>` : ''}
    </div>
  `).join('');
  container.querySelectorAll('.prompt-tag-slot').forEach(el => {
    el.onclick = (e) => {
      const clearKey = e.target.getAttribute('data-clear');
      if (clearKey) { clearSlot(clearKey); } 
      else { triggerSearchMenu(el.getAttribute('data-type'), el); }
    };
  });
}

// --- 3. 搜尋選單核心邏輯 ---
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
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 8}px`;

  menu.innerHTML = `
    <div class="menu-search-box">
      <input type="text" class="menu-search-input" placeholder="搜尋名稱、內容或代碼..." id="ai-search-input">
    </div>
    <div class="menu-list-container" id="ai-menu-list"></div>
  `;
  document.body.appendChild(menu);

  const searchInput = document.getElementById('ai-search-input');
  searchInput.focus();
  
  // 監聽搜尋輸入
  searchInput.oninput = (e) => {
    const query = e.target.value.toLowerCase();
    filteredSnippets = allSnippets.filter(s => 
      s.label.toLowerCase().includes(query) || 
      s.text.toLowerCase().includes(query) || 
      (s.shortcut && s.shortcut.toLowerCase().includes(query))
    );
    selectedIndex = 0;
    renderList();
  };

  renderList();
}

function renderList() {
  const listContainer = document.getElementById('ai-menu-list');
  if (!listContainer) return;
  listContainer.innerHTML = filteredSnippets.length ? '' : '<div style="padding:15px;color:#999;font-size:13px;">找不到符合的項目</div>';

  filteredSnippets.forEach((s, i) => {
    const itemEl = document.createElement('div');
    itemEl.className = `menu-item ${i === selectedIndex ? 'selected' : ''}`;
    itemEl.innerHTML = `
      <div class="menu-item-label">${s.label} ${s.shortcut ? `<small style="color:#4285f4;">/${s.shortcut}</small>` : ''}</div>
      <div class="menu-item-text">${s.text}</div>
    `;
    itemEl.onclick = () => selectItem(s);
    listContainer.appendChild(itemEl);
    if (i === selectedIndex) itemEl.scrollIntoView({ block: 'nearest' });
  });
}

// --- 4. 輔助功能 (選擇、清除、送出) ---
function selectItem(selected) {
  if (currentMenuType === 'identities') activeIdentity = selected.text;
  if (currentMenuType === 'events') { activePromptText = selected.text; activePromptLabel = selected.label; }
  if (currentMenuType === 'styles') activeStyle = selected.text;
  removeMenu();
  updateTagUI();
}

function clearSlot(type) {
  if (type === 'identities') activeIdentity = "";
  if (type === 'events') { activePromptText = ""; activePromptLabel = ""; }
  if (type === 'styles') activeStyle = "";
  updateTagUI();
}

function removeMenu() { if (menu) { menu.remove(); menu = null; selectedIndex = 0; } }

// 鍵盤監聽
document.addEventListener('keydown', (e) => {
  if (e.isComposing || e.keyCode === 229) return;
  if (menu) {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = (selectedIndex + 1) % filteredSnippets.length; renderList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = (selectedIndex - 1 + filteredSnippets.length) % filteredSnippets.length; renderList(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filteredSnippets[selectedIndex]) selectItem(filteredSnippets[selectedIndex]); }
    else if (e.key === 'Escape') { removeMenu(); }
    return;
  }
  
  // Enter 大合體送出
  if (e.key === 'Enter' && !e.shiftKey) {
    const field = e.target;
    if (field.isContentEditable && (activeIdentity || activePromptText || activeStyle)) {
      const userInput = field.innerText.trim();
      if (!userInput) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const finalMessage = `【身份】\n${activeIdentity || "（未指定）"}\n\n【指令】\n${activePromptText || "（未指定）"}\n\n【風格】\n${activeStyle || "（未指定）"}\n\n【處理內容】\n${userInput}`;
      field.innerText = finalMessage;
      setTimeout(() => {
        const sendBtn = document.querySelector('button[aria-label*="發送"], button[aria-label*="Send"]');
        if (sendBtn) { sendBtn.click(); activePromptText = ""; activePromptLabel = ""; updateTagUI(); }
      }, 50);
    }
  }
}, true);

// 初始化
setTimeout(updateTagUI, 2000);
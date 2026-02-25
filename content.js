let selectedIndex = 0;
let menu = null;
let filteredSnippets = [];
let currentMenuType = 'all'; // 'all', 'identities', 'events', 'styles'

// 當前選中的內容狀態
let activeIdentity = "";
let activePromptLabel = ""; // 指令的名稱
let activePromptText = "";  // 指令的內容
let activeStyle = "";

// --- 1. 注入 CSS 樣式 ---
const style = document.createElement('style');
style.innerHTML = `
  .ai-helper-container {
    display: flex;
    gap: 8px;
    margin: 8px 12px;
    flex-wrap: wrap;
    font-family: sans-serif;
  }
  .prompt-tag-slot {
    display: flex;
    align-items: center;
    padding: 6px 12px;
    border-radius: 20px;
    border: 1.5px dashed #dadce0;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    background: #fff;
    color: #5f6368;
    gap: 6px;
  }
  .prompt-tag-slot:hover { border-color: #4285f4; background: #f8faff; }
  .prompt-tag-slot.active {
    border-style: solid;
    background: #e8f0fe;
    color: #1a73e8;
    border-color: #1a73e8;
    font-weight: bold;
  }
  .tag-close { cursor: pointer; margin-left: 4px; color: #5f6368; font-size: 14px; }
  .tag-close:hover { color: #d93025; }
`;
document.head.appendChild(style);

// --- 2. 介面渲染：三個 Tag 槽位 ---
function updateTagUI() {
  const inputArea = document.querySelector('div[contenteditable="true"]');
  if (!inputArea) return;

  let container = document.getElementById('ai-helper-slots');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ai-helper-slots';
    container.className = 'ai-helper-container';
    // 插入在輸入框父層的最前面
    inputArea.parentElement.prepend(container);
  }

  const slots = [
    { key: 'identities', label: '身份', val: activeIdentity, display: activeIdentity ? `身份：${activeIdentity.substring(0,8)}...` : '+ 身份' },
    { key: 'events', label: '指令', val: activePromptText, display: activePromptLabel ? `指令：${activePromptLabel}` : '+ 指令' },
    { key: 'styles', label: '風格', val: activeStyle, display: activeStyle ? `風格：${activeStyle.substring(0,8)}...` : '+ 風格' }
  ];

  container.innerHTML = slots.map(s => `
    <div class="prompt-tag-slot ${s.val ? 'active' : ''}" data-type="${s.key}">
      <span class="tag-text">${s.display}</span>
      ${s.val ? `<span class="tag-close" data-clear="${s.key}">✕</span>` : ''}
    </div>
  `).join('');

  // 綁定點擊事件
  container.querySelectorAll('.prompt-tag-slot').forEach(el => {
    el.onclick = (e) => {
      const clearKey = e.target.getAttribute('data-clear');
      if (clearKey) {
        clearSlot(clearKey);
      } else {
        const type = el.getAttribute('data-type');
        triggerMenuByCategory(type, el);
      }
    };
  });
}

function clearSlot(type) {
  if (type === 'identities') activeIdentity = "";
  if (type === 'events') { activePromptText = ""; activePromptLabel = ""; }
  if (type === 'styles') activeStyle = "";
  updateTagUI();
}

// --- 3. 選單邏輯 ---
function triggerMenuByCategory(type, targetEl) {
  currentMenuType = type;
  chrome.storage.local.get([type], (data) => {
    filteredSnippets = data[type] || [];
    if (filteredSnippets.length > 0) {
      showMenuAtElement(targetEl);
      renderMenuItems();
    }
  });
}

function renderMenuItems() {
  if (!menu) return;
  menu.innerHTML = '';
  chrome.storage.local.get('menuConfig', (data) => {
    const cfg = data.menuConfig || { bgColor: '#ffffff', activeBg: '#1a73e8', fontSize: 16, subFontSize: 12 };
    menu.style.backgroundColor = cfg.bgColor;

    filteredSnippets.forEach((s, i) => {
      const div = document.createElement('div');
      const isActive = i === selectedIndex;
      div.style.cssText = `padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #eee; background-color: ${isActive ? cfg.activeBg : 'transparent'}; color: ${isActive ? '#fff' : '#333'};`;
      div.innerHTML = `
        <div style="font-size: ${cfg.fontSize}px; font-weight: bold;">${s.label}</div>
        <div style="font-size: ${cfg.subFontSize}px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.text}</div>
      `;
      div.onclick = () => selectItem(s);
      menu.appendChild(div);
      if (isActive) div.scrollIntoView({ block: 'nearest' });
    });
  });
}

function selectItem(selected) {
  if (currentMenuType === 'identities') activeIdentity = selected.text;
  if (currentMenuType === 'events') { activePromptText = selected.text; activePromptLabel = selected.label; }
  if (currentMenuType === 'styles') activeStyle = selected.text;
  
  removeMenu();
  updateTagUI();
}

function showMenuAtElement(el) {
  removeMenu();
  menu = document.createElement('div');
  const rect = el.getBoundingClientRect();
  menu.style.cssText = `position: fixed; border: 1px solid #ccc; z-index: 10000; width: 300px; left: ${rect.left}px; top: ${rect.bottom + 5}px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow-y: auto; max-height: 300px;`;
  document.body.appendChild(menu);
}

function removeMenu() { if (menu) { menu.remove(); menu = null; selectedIndex = 0; } }

// --- 4. 監聽輸入與 Enter 送出 ---
document.addEventListener('keydown', (e) => {
  // IME 處理
  if (e.isComposing || e.keyCode === 229) return;

  if (menu) {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = (selectedIndex + 1) % filteredSnippets.length; renderMenuItems(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = (selectedIndex - 1 + filteredSnippets.length) % filteredSnippets.length; renderMenuItems(); }
    else if (e.key === 'Enter') { e.preventDefault(); selectItem(filteredSnippets[selectedIndex]); }
    else if (e.key === 'Escape') { removeMenu(); }
    return;
  }

  // 大合體發送邏輯
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
        if (sendBtn) {
          sendBtn.click();
          // 發送後清除「指令」，身份與風格通常會延用，所以不清除
          activePromptText = ""; activePromptLabel = "";
          updateTagUI();
        }
      }, 50);
    }
  }
}, true);

// 監聽 / 快捷鍵
document.addEventListener('input', (e) => {
  const text = e.target.innerText || "";
  if (text.endsWith('/')) {
    currentMenuType = 'events'; // 預設 / 搜尋指令
    chrome.storage.local.get(['events'], (data) => {
      filteredSnippets = data.events || [];
      showMenuAtElement(e.target);
      renderMenuItems();
    });
  }
  updateTagUI(); // 確保 UI 存在
}, true);

// 初始化渲染
setTimeout(updateTagUI, 2000); // 延遲確保 Gemini 載入完成
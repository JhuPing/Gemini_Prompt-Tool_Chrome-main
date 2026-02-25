// 保留原本的變數
let selectedIndex = 0;
let menu = null;
let filteredSnippets = [];

// --- 新增：狀態管理變數 (用於隱形標籤模式) ---
let activePromptText = "";  // 儲存真正的提示詞長文本
let activePromptLabel = ""; // 儲存顯示用的名稱

// --- 新增：注入 Tag 的 CSS 樣式 ---
const style = document.createElement('style');
style.innerHTML = `
  .prompt-tag-wrapper {
    display: none; 
    align-items: center;
    background-color: #f1f3f4; /* 灰色區塊背景 */
    padding: 6px 12px;
    margin: 8px 12px;
    border-radius: 8px;
    border: 1px solid #dadce0;
    width: fit-content;
    font-size: 13px;
    color: #1a73e8;
    font-weight: bold;
    gap: 8px;
  }
  .prompt-tag-close {
    cursor: pointer;
    color: #5f6368;
    font-size: 16px;
    line-height: 1;
  }
  .prompt-tag-close:hover { color: #d93025; }
`;
document.head.appendChild(style);

function renderItems() {
  if (!menu) return;
  menu.innerHTML = '';
  chrome.storage.local.get('menuConfig', (data) => {
    const cfg = data.menuConfig || { bgColor: '#ffffff', activeBg: '#1a73e8', fontSize: 18, subFontSize: 13 };
    menu.style.backgroundColor = cfg.bgColor;
    filteredSnippets.forEach((s, i) => {
      const div = document.createElement('div');
      const isActive = i === selectedIndex;
      div.innerHTML = `
        <div style="font-size: ${cfg.fontSize}px; font-weight: bold; margin-bottom: 4px;">${s.label}</div>
        <div style="font-size: ${cfg.subFontSize}px; opacity: 0.8; display: block;">${s.text}</div>
      `;
      div.style.cssText = `
        padding: 10px 20px; cursor: pointer; border-bottom: 1px solid #eee;
        background-color: ${isActive ? cfg.activeBg : 'transparent'} !important;
        color: ${isActive ? '#ffffff' : '#202124'} !important;
      `;
      div.onclick = () => insertText(document.activeElement);
      menu.appendChild(div);
      if (isActive) div.scrollIntoView({ block: 'nearest' });
    });
  });
}

document.addEventListener('keydown', (e) => {
  if (menu) {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = (selectedIndex + 1) % filteredSnippets.length; renderItems(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = (selectedIndex - 1 + filteredSnippets.length) % filteredSnippets.length; renderItems(); }
    // ... 在 keydown 事件監聽器內 ...
else if (e.key === 'Enter' && !e.shiftKey && activePromptText) {
    const field = e.target;
    if (field.isContentEditable || field.tagName === 'TEXTAREA') {
        e.preventDefault();
        e.stopPropagation();
        
        // 修正點：獲取使用者輸入時，確保不包含原本觸發選單的殘留字元
        let userInput = field.innerText || field.value;
        
        // 1. 建立最終訊息：提示詞在前，使用者輸入在後
        // 如果你希望「橘子」不要出現在最前面，確保合併順序正確
        const finalMessage = `${activePromptText}\n\n${userInput}`;
        
        // 2. 清空輸入框後再填入，避免重複出現
        if (field.isContentEditable) {
            field.innerText = ""; // 先清空
            field.innerText = finalMessage;
        } else {
            field.value = ""; // 先清空
            field.value = finalMessage;
        }

        // 3. 觸發送出
        setTimeout(() => {
            const sendBtn = document.querySelector('button[aria-label*="發送"], button[aria-label*="Send"], button[aria-label*="傳送"]');
            if (sendBtn) sendBtn.click();
            
            // 4. 送出後務必完整清空狀態與 UI
            activePromptText = "";
            activePromptLabel = "";
            updateTagUI();
        }, 50);
    }
}
    else if (e.key === 'Escape') { removeMenu(); }
  } 
  // --- 新增：攔截送出動作並合併訊息 ---
  else if (e.key === 'Enter' && !e.shiftKey && activePromptText) {
    const field = e.target;
    // 只有當焦點在輸入框時才處理
    if (field.isContentEditable || field.tagName === 'TEXTAREA') {
      e.preventDefault();
      e.stopPropagation();
      
      const userInput = field.innerText || field.value;
      // 1. 執行合併：提示詞 + 兩個換行 + 使用者輸入
      const finalMessage = `${activePromptText}\n\n${userInput}`;
      
      // 2. 填回輸入框
      if (field.isContentEditable) {
        field.innerText = finalMessage;
      } else {
        field.value = finalMessage;
      }

      // 3. 觸發送出 (尋找 Gemini 的送出按鈕)
      setTimeout(() => {
        const sendBtn = document.querySelector('button[aria-label*="發送"], button[aria-label*="Send"], button[aria-label*="傳送"]');
        if (sendBtn) sendBtn.click();
        
        // 4. 清空狀態
        activePromptText = "";
        activePromptLabel = "";
        updateTagUI();
      }, 50);
    }
  }
}, true);

document.addEventListener('input', (e) => {
  const text = e.target.innerText || e.target.value || "";
  const lastSlashIndex = text.lastIndexOf('/');
  if (lastSlashIndex !== -1) {
    const query = text.slice(lastSlashIndex + 1).toLowerCase().trim();
    chrome.storage.local.get({mySnippets: []}, (data) => {
      filteredSnippets = data.mySnippets.filter(s => 
        s.label.toLowerCase().includes(query) || (s.shortcut && s.shortcut.toLowerCase().includes(query))
      );
      if (filteredSnippets.length > 0) { showMenuOnTop(e.target); renderItems(); } else { removeMenu(); }
    });
  } else { removeMenu(); }
}, true);

function showMenuOnTop(parent) {
  if (menu) return;
  menu = document.createElement('div');
  const rect = parent.getBoundingClientRect();
  menu.style.cssText = `position: fixed; border: 2px solid #1a73e8; z-index: 1000000; width: ${rect.width}px; left: ${rect.left}px; bottom: ${window.innerHeight - rect.top + 10}px; border-radius: 12px 12px 0 0; box-shadow: 0 -8px 20px rgba(0,0,0,0.2); overflow: hidden; display: flex; flex-direction: column; max-height: 400px;`;
  document.body.appendChild(menu);
}

// --- 修改核心邏輯：insertText 改為顯示標籤而非填入全文 ---
function insertText(field) {
  const selected = filteredSnippets[selectedIndex];
  activePromptText = selected.text;   // 儲存提示詞全文
  activePromptLabel = selected.label; // 儲存名稱

  const val = field.innerText || field.value;
  const lastSlashIndex = val.lastIndexOf('/');
  
  // 移除原本的 "/" 指令文字
  const prefix = val.slice(0, lastSlashIndex);

  if (field.isContentEditable) {
    field.innerText = prefix;
    
    // 保留原本的「核心修正：將游標移至末尾」
    field.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(field);
    range.collapse(false); 
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    field.value = prefix;
    field.focus();
    field.selectionStart = field.selectionEnd = prefix.length;
  }

  // 保留原本的「觸發輸入事件以確保 Gemini 的 UI 偵測到內容更動」
  field.dispatchEvent(new Event('input', { bubbles: true }));
  
  // 更新 Tag UI 顯示
  updateTagUI();
  removeMenu();
}

// --- 新增：處理標籤 UI 的顯示與建立 ---
function updateTagUI() {
  let tagWrapper = document.getElementById('my-tag-wrapper');
  
  if (!tagWrapper) {
    // 找到輸入框，並將 Tag 容器掛載在輸入框內部底部 (灰色範圍)
    const inputArea = document.querySelector('div[contenteditable="true"]');
    if (inputArea) {
      tagWrapper = document.createElement('div');
      tagWrapper.id = 'my-tag-wrapper';
      tagWrapper.className = 'prompt-tag-wrapper';
      tagWrapper.innerHTML = `<span id="tag-label"></span><span class="prompt-tag-close">✕</span>`;
      
      // 插入到輸入框的後面
      inputArea.parentElement.appendChild(tagWrapper);
      
      // 綁定 X 按鈕取消事件
      tagWrapper.querySelector('.prompt-tag-close').onclick = () => {
        activePromptText = "";
        activePromptLabel = "";
        updateTagUI();
      };
    }
  }

  if (activePromptLabel && tagWrapper) {
    tagWrapper.style.display = 'flex';
    document.getElementById('tag-label').innerText = `已掛載指令：${activePromptLabel}`;
  } else if (tagWrapper) {
    tagWrapper.style.display = 'none';
  }
}

function removeMenu() { if (menu) { menu.remove(); menu = null; selectedIndex = 0; } }
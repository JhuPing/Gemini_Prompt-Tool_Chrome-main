let selectedIndex = 0;
let menu = null;
let filteredSnippets = [];

// --- 1. 狀態管理與 CSS 注入 ---
let activePromptText = "";
let activePromptLabel = "";

const style = document.createElement('style');
style.innerHTML = `
  .prompt-tag-wrapper {
    display: none; 
    align-items: center;
    background-color: #f1f3f4;
    padding: 6px 12px;
    margin: 8px 12px;
    border-radius: 8px;
    border: 1px solid #dadce0;
    width: fit-content;
    font-size: 13px;
    color: #1a73e8;
    font-weight: bold;
    gap: 8px;
    z-index: 10;
  }
  .prompt-tag-close { cursor: pointer; color: #5f6368; font-size: 16px; }
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

// --- 2. 核心邏輯：區分「選單 Enter」與「送出 Enter」 ---
document.addEventListener('keydown', (e) => {
  // 情況 A：選單開啟時，按下 Enter 僅執行選取
  if (menu) {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = (selectedIndex + 1) % filteredSnippets.length; renderItems(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = (selectedIndex - 1 + filteredSnippets.length) % filteredSnippets.length; renderItems(); }
    else if (e.key === 'Enter') { 
      e.preventDefault(); 
      e.stopImmediatePropagation(); // 強制停止事件傳遞，防止觸發 Gemini 送出
      insertText(document.activeElement); 
    }
    else if (e.key === 'Escape') { removeMenu(); }
    return; // 選單狀態下處理完畢，直接返回
  } 

  // 情況 B：平常輸入時，按下 Enter 進行合併送出
  if (e.key === 'Enter' && !e.shiftKey && activePromptText) {
    const field = e.target;
    if (field.isContentEditable) {
      e.preventDefault();
      e.stopImmediatePropagation();
      
      const userInput = field.innerText.trim();
      // 合併邏輯：提示詞在前，使用者內容在後
      const finalMessage = `${activePromptText}\n\n${userInput}`;
      
      // 清空並重新填入
      field.innerText = finalMessage;

      // 觸發送出按鈕
      setTimeout(() => {
        const sendBtn = document.querySelector('button[aria-label*="發送"], button[aria-label*="Send"], button[aria-label*="傳送"]');
        if (sendBtn) sendBtn.click();
        
        // 送出後清空狀態
        activePromptText = "";
        activePromptLabel = "";
        updateTagUI();
      }, 50);
    }
  }
}, true);

document.addEventListener('input', (e) => {
  const text = e.target.innerText || "";
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

// --- 3. 修改 insertText：只顯示 Tag，不填入文字 ---
function insertText(field) {
  const selected = filteredSnippets[selectedIndex];
  activePromptText = selected.text;
  activePromptLabel = selected.label;

  const val = field.innerText;
  const lastSlashIndex = val.lastIndexOf('/');
  const prefix = val.slice(0, lastSlashIndex);

  // 僅保留斜線前的內容，移除指令文字
  field.innerText = prefix;
  
  // 修正：移動游標至末尾
  field.focus();
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(field);
  range.collapse(false); 
  sel.removeAllRanges();
  sel.addRange(range);

  field.dispatchEvent(new Event('input', { bubbles: true }));
  updateTagUI();
  removeMenu();
}

function updateTagUI() {
  let tagWrapper = document.getElementById('my-tag-wrapper');
  const inputArea = document.querySelector('div[contenteditable="true"]');
  
  if (!tagWrapper && inputArea) {
    tagWrapper = document.createElement('div');
    tagWrapper.id = 'my-tag-wrapper';
    tagWrapper.className = 'prompt-tag-wrapper';
    tagWrapper.innerHTML = `<span id="tag-label"></span><span class="prompt-tag-close">✕</span>`;
    inputArea.parentElement.appendChild(tagWrapper);
    
    tagWrapper.querySelector('.prompt-tag-close').onclick = (e) => {
      e.stopPropagation();
      activePromptText = "";
      activePromptLabel = "";
      updateTagUI();
    };
  }

  if (activePromptLabel && tagWrapper) {
    tagWrapper.style.display = 'flex';
    document.getElementById('tag-label').innerText = `已掛載指令：${activePromptLabel}`;
  } else if (tagWrapper) {
    tagWrapper.style.display = 'none';
  }
}

function removeMenu() { if (menu) { menu.remove(); menu = null; selectedIndex = 0; } }
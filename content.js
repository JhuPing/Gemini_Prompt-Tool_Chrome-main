let selectedIndex = 0;
let menu = null;
let allSnippets = [];
let filteredSnippets = [];
let currentMenuType = 'events';
let activeIdentity = "", activeIdentityLabel = "";
let activePromptText = "", activePromptLabel = "";
let activeStyle = "", activeStyleLabel = "";

// ── 工具函式 ──
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── 樣式注入 ──
function injectStyles() {
  if (!chrome.runtime?.id) return;
  chrome.storage.local.get({
    menuConfig: {
      bgColor:     '#ffffff',
      activeBg:    '#1a73e8',
      labelColor:  '#1a1c20',
      textColor:   '#70757a',
      fontSize:    18,
      subFontSize: 13
    }
  }, (data) => {
    const cfg = data.menuConfig;
    const labelColor = cfg.labelColor  || '#1a1c20';
    const textColor  = cfg.textColor   || '#70757a';

    let style = document.getElementById('ai-helper-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'ai-helper-style';
      document.head.appendChild(style);
    }
    style.innerHTML = `
      .ai-helper-container {
        display: flex;
        gap: 10px;
        margin: 12px;
        flex-wrap: wrap;
        align-items: center;
      }
      .prompt-tag-slot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 160px;
        height: 36px;
        padding: 0 12px;
        border-radius: 10px;
        border: 1.5px dashed #dadce0;
        font-size: 13px;
        cursor: pointer;
        background: #fff;
        color: #5f6368;
        gap: 6px;
        white-space: nowrap;
        overflow: hidden;
      }
      .prompt-tag-slot.active {
        border-style: solid;
        background: ${hexToRgba(cfg.activeBg, 0.1)};
        color: ${cfg.activeBg};
        border-color: ${cfg.activeBg};
        font-weight: bold;
      }
      .ai-search-menu {
        position: fixed;
        border: 1px solid #dadce0;
        z-index: 1000000;
        width: 320px;
        background: ${cfg.bgColor};
        border-radius: 12px;
        box-shadow: 0 -8px 30px rgba(0,0,0,0.2);
        box-sizing: border-box;
        overflow: hidden;
      }
      .ai-search-menu-inner {
        padding: 10px;
        box-sizing: border-box;
      }
      .ai-search-input {
        width: 100%;
        padding: 8px 12px;
        border-radius: 6px;
        border: 1px solid #ddd;
        font-size: 14px;
        box-sizing: border-box;
        outline: none;
        font-family: inherit;
      }
      .ai-search-input:focus {
        border-color: ${cfg.activeBg};
      }
      .ai-menu-list {
        max-height: 250px;
        overflow-y: auto;
      }
      .menu-item {
        padding: 14px 18px;
        cursor: pointer;
        border-bottom: 1px solid #f1f3f4;
      }
      .menu-item:last-child {
        border-bottom: none;
      }
      .menu-item:hover {
        background: #f8f9fa;
      }
      .menu-item.selected {
        background-color: ${cfg.activeBg} !important;
      }
      .menu-item-label {
        font-weight: bold;
        font-size: ${cfg.fontSize}px;
        color: ${labelColor};
      }
      .menu-item.selected .menu-item-label {
        color: #fff !important;
      }
      .menu-item-text {
        font-size: ${cfg.subFontSize}px;
        color: ${textColor};
        margin-top: 2px;
      }
      .menu-item.selected .menu-item-text {
        color: rgba(255,255,255,0.85) !important;
      }
      .ai-pagination {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 10px;
        border-top: 1px solid #f1f3f4;
      }
      .ai-page-btn {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1px solid #dadce0;
        background: #fff;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        color: #5f6368;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }
      .ai-page-btn:hover:not(:disabled) {
        background: #f1f3f4;
        color: ${cfg.activeBg};
        border-color: ${cfg.activeBg};
      }
      .ai-page-btn:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .ai-page-info {
        font-size: 13px;
        color: #5f6368;
        min-width: 48px;
        text-align: center;
      }
    `;
  });
}

// ── Tag UI 更新 ──
function updateTagUI() {
  const inputArea = document.querySelector('div[contenteditable="true"]');
  if (!inputArea) return;

  let container = document.getElementById('ai-helper-slots');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ai-helper-slots';
    container.className = 'ai-helper-container';
    (inputArea.closest('.input-area-container') || inputArea.parentElement).prepend(container);
  }

  const slots = [
    { key: 'identities', display: activeIdentityLabel ? `身份：${activeIdentityLabel}` : '身份：未選擇', val: activeIdentity },
    { key: 'events',     display: activePromptLabel   ? `指令：${activePromptLabel}`   : '指令：未選擇', val: activePromptText },
    { key: 'styles',     display: activeStyleLabel    ? `風格：${activeStyleLabel}`    : '風格：未選擇', val: activeStyle }
  ];

  container.innerHTML = slots.map(s =>
    `<div class="prompt-tag-slot ${s.val ? 'active' : ''}" data-type="${s.key}">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.display}</span>
      ${s.val ? `<span data-clear="${s.key}" style="flex-shrink:0;">✕</span>` : ''}
    </div>`
  ).join('') +
  `<button id="btn-reset-gemini" style="height:36px;padding:0 12px;border-radius:10px;cursor:pointer;background:#f1f3f4;border:1px solid #dadce0;font-size:13px;white-space:nowrap;">清除記憶</button>`;

  document.getElementById('btn-reset-gemini').onclick = resetGeminiContext;
  container.querySelectorAll('.prompt-tag-slot').forEach(el => {
    el.onclick = (e) => e.target.dataset.clear ? clearSlot(e.target.dataset.clear) : triggerSearchMenu(el.dataset.type, el);
  });
}

// ── 搜尋選單 ──
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
  menu.style.left   = `${rect.left}px`;
  menu.style.bottom = `${window.innerHeight - rect.top + 8}px`;
  menu.innerHTML = `
    <div class="ai-search-menu-inner">
      <input type="text" class="ai-search-input" id="ai-search-input" placeholder="搜尋...">
    </div>
    <div class="ai-menu-list" id="ai-menu-list"></div>
    <div class="ai-pagination" id="ai-pagination"></div>
  `;
  document.body.appendChild(menu);
  selectedIndex = 0;
  currentPage = 0;
  document.getElementById('ai-search-input').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    filteredSnippets = allSnippets.filter(s =>
      s.label.toLowerCase().includes(q) || s.text.toLowerCase().includes(q)
    );
    selectedIndex = 0;
    currentPage = 0;
    renderList();
  };
  renderList();
  document.getElementById('ai-search-input').focus();
}

// ── 顯示用截斷（保留前後，中間以 ... 代替）──
function truncateDisplay(str, frontLen = 10, backLen = 10) {
  if (str.length <= frontLen + backLen + 3) return str;
  return str.slice(0, frontLen) + ' ... ' + str.slice(-backLen);
}

const PAGE_SIZE = 5;
let currentPage = 0;

function renderList() {
  const list = document.getElementById('ai-menu-list');
  const pagination = document.getElementById('ai-pagination');
  if (!list) return;

  const totalPages = Math.ceil(filteredSnippets.length / PAGE_SIZE);
  // 確保 currentPage 不超出範圍
  if (currentPage >= totalPages) currentPage = Math.max(0, totalPages - 1);

  const start = currentPage * PAGE_SIZE;
  const pageItems = filteredSnippets.slice(start, start + PAGE_SIZE);

  list.innerHTML = pageItems.map((s, i) => {
    const globalIdx = start + i;
    return `<div class="menu-item ${globalIdx === selectedIndex ? 'selected' : ''}" data-idx="${globalIdx}">
      <div class="menu-item-label">${truncateDisplay(s.label, 12, 8)}</div>
      <div class="menu-item-text">${truncateDisplay(s.text, 20, 15)}</div>
    </div>`;
  }).join('');

  list.querySelectorAll('.menu-item').forEach(el => {
    el.onclick = () => selectItem(filteredSnippets[el.dataset.idx]);
  });

  // 分頁導覽（只有超過一頁才顯示）
  if (pagination) {
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      pagination.style.display = 'none';
    } else {
      pagination.style.display = 'flex';
      pagination.innerHTML = `
        <button class="ai-page-btn" id="ai-page-prev" ${currentPage === 0 ? 'disabled' : ''}>&#8249;</button>
        <span class="ai-page-info">${currentPage + 1} / ${totalPages}</span>
        <button class="ai-page-btn" id="ai-page-next" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>&#8250;</button>
      `;
      document.getElementById('ai-page-prev').onclick = (e) => { e.stopPropagation(); currentPage--; renderList(); };
      document.getElementById('ai-page-next').onclick = (e) => { e.stopPropagation(); currentPage++; renderList(); };
    }
  }
}

function selectItem(selected) {
  if (!selected) return;
  if (currentMenuType === 'identities') { activeIdentity   = selected.text; activeIdentityLabel = selected.label; }
  else if (currentMenuType === 'events') { activePromptText = selected.text; activePromptLabel   = selected.label; }
  else if (currentMenuType === 'styles') { activeStyle      = selected.text; activeStyleLabel    = selected.label; }
  if (menu) { menu.remove(); menu = null; }
  updateTagUI();
}

function clearSlot(type) {
  if (type === 'identities') { activeIdentity   = ""; activeIdentityLabel = ""; }
  else if (type === 'events') { activePromptText = ""; activePromptLabel   = ""; }
  else if (type === 'styles') { activeStyle      = ""; activeStyleLabel    = ""; }
  updateTagUI();
}

// ── 安全寫入 contenteditable（讓 Gemini React 框架偵測到變更）──
function setFieldValue(field, text) {
  field.focus();
  // 全選後用 insertText 寫入，框架才能感知
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, text);
}

// ── 自動提交 ──
let isSubmitting = false;
function autoSubmit(callback) {
  // 等框架感知 setFieldValue 的內容變更後再送出（250ms 比 150ms 更穩）
  setTimeout(() => {
    // 涵蓋繁中、簡中、英文、日文等不同語系的 aria-label
    const btn = document.querySelector(
      'button[aria-label="傳送訊息"], button[aria-label="Send message"], button[aria-label="发送消息"], button[aria-label="送信"]'
    );
    if (btn && !btn.disabled) {
      isSubmitting = true;
      btn.click();
      // 送出後清空輸入框，避免合併內容殘留顯示
      const field = document.querySelector('div[contenteditable="true"]');
      if (field) {
        field.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
      }
      if (callback) callback();
      setTimeout(() => { isSubmitting = false; }, 500);
    } else {
      // 找不到按鈕或按鈕仍 disabled：fallback 用 Enter 事件觸發
      const field = document.querySelector('div[contenteditable="true"]');
      if (field) {
        field.focus();
        const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
        const enterUp   = new KeyboardEvent('keyup',   { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
        isSubmitting = true;
        field.dispatchEvent(enterDown);
        field.dispatchEvent(enterUp);
        if (callback) callback();
        setTimeout(() => { isSubmitting = false; }, 500);
      }
    }
  }, 250);
}

// ── 清除記憶 ──
function resetGeminiContext() {
  const input = document.querySelector('div[contenteditable="true"]');
  if (!input) return;

  // 先清空所有已選擇的狀態
  activeIdentity = ""; activeIdentityLabel = "";
  activePromptText = ""; activePromptLabel = "";
  activeStyle = ""; activeStyleLabel = "";
  updateTagUI();

  // 寫入重置指令後等按鈕可用再送出
  setFieldValue(input, '### 任務重置 ### 請清除目前的上下文。接下來我將提供新的主題，請僅根據新提供的資料進行回覆。');
  setTimeout(() => autoSubmit(), 50);
}

// ── IME 組字狀態偵測（避免攔截中文注音/拼音確認的 Enter）──
let isComposing = false;
document.addEventListener('compositionstart', () => { isComposing = true; });
document.addEventListener('compositionend',   () => { isComposing = false; });

// ── Enter 鍵送出 ──
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !menu && !isComposing && !isSubmitting) {
    const field = e.target;
    if (field.isContentEditable && (activeIdentity || activePromptText || activeStyle)) {
      const content = field.innerText.trim();
      if (!content || content.includes('### 任務重置 ###')) return;
      e.preventDefault();

      // 只組合有選擇的項目，並用自然語言格式
      const parts = [];
      if (activeIdentity)   parts.push(`你是一位${activeIdentity}。`);
      if (activePromptText) parts.push(`請${activePromptText}。`);
      if (activeStyle)      parts.push(`請以${activeStyle}的方式回應。`);
      parts.push(content);
      const combined = parts.join('\n\n');

      // 用 execCommand 寫入組合內容，框架才能正確感知並啟用送出按鈕
      setFieldValue(field, combined);
      setTimeout(() => autoSubmit(updateTagUI), 50);
    }
  }
}, true);

// ── 點擊外部關閉選單 ──
document.addEventListener('click', (e) => {
  if (menu && !menu.contains(e.target) && !e.target.closest('.prompt-tag-slot')) {
    menu.remove();
    menu = null;
  }
});

// ── 啟動 ──
injectStyles();
setInterval(() => { if (chrome.runtime?.id) updateTagUI(); }, 1000);
// --- 前方代碼 (CSS, UI 渲染, 選單控制) 維持不變，僅針對訊息組合邏輯進行修正 ---

// --- 4. 訊息發送邏輯 (極致緊湊版) ---
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
      
      // 【核心修正】：移除所有多餘換行，讓結構緊貼
      const finalMessage = `身份：${activeIdentity || "未指定"}
指令：${activePromptText || "未指定"}
風格：${activeStyle || "未指定"}
----------
處理內容：${userInput}`;

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

// 點擊外部關閉選單與定時檢查 UI
document.addEventListener('click', (e) => {
  if (menu && !menu.contains(e.target) && !e.target.closest('.prompt-tag-slot')) removeMenu();
});

setInterval(updateTagUI, 2000);
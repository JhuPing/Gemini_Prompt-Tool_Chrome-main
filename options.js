/* 【配置區】正名為：身份、指令、風格 */
const CONFIG = {
  identities: { title: "身份", desc: "設定 AI 扮演的角色身份，預設為空值", hasShortcut: false },
  events: { title: "指令", desc: "管理您在對話中使用的快捷指令 (輸入 / 呼叫)", hasShortcut: true },
  styles: { title: "風格", desc: "設定 AI 輸出的語氣與風格，預設為空值", hasShortcut: false }
};

/* 【區塊：選單縮合邏輯】 */
const promptToggle = document.getElementById('prompt-menu-toggle');
const navWrapper = promptToggle.closest('.nav-group-wrapper');

promptToggle.onclick = (e) => {
  navWrapper.classList.toggle('collapsed');
};

/* 【區塊：導覽切換邏輯】 */
document.querySelectorAll('.nav-item').forEach(nav => {
  nav.onclick = (e) => {
    // 如果點到的是父選單標題，只執行縮合，不切換內容
    if (nav.id === 'prompt-menu-toggle') return;

    const target = nav.getAttribute('data-target');
    const type = nav.getAttribute('data-type');

    // 清除所有選中狀態
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    nav.classList.add('active');

    // 切換 Section
    document.querySelectorAll('.section').forEach(sec => {
      sec.style.display = 'none';
      sec.classList.remove('active');
    });
    
    const targetSec = document.getElementById(target);
    targetSec.style.display = 'block';
    setTimeout(() => targetSec.classList.add('active'), 10);

    // 處理提示詞分類渲染
    if (type) {
      currentType = type;
      showView('list');
      renderTable();
    }
    
    e.stopPropagation();
  };
});
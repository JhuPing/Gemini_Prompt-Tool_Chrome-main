let selectedIndex = 0;
let menu = null;
let filteredSnippets = [];

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
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); insertText(document.activeElement); }
    else if (e.key === 'Escape') { removeMenu(); }
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

function insertText(field) {
  const content = filteredSnippets[selectedIndex].text;
  const val = field.innerText || field.value;
  const lastSlashIndex = val.lastIndexOf('/');
  const newVal = val.slice(0, lastSlashIndex) + content;
  if (field.isContentEditable) field.innerText = newVal; else field.value = newVal;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  removeMenu();
}

function removeMenu() { if (menu) { menu.remove(); menu = null; selectedIndex = 0; } }
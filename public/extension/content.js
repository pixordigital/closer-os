(() => {
  const APP = "http://178.105.181.38:6002";
  let panel = null;
  let btn = null;

  function createToggle() {
    if (btn) return;
    btn = document.createElement("button");
    btn.id = "closer-coach-toggle";
    btn.textContent = "◉ Closer Coach";
    btn.onclick = togglePanel;
    document.body.appendChild(btn);
  }

  function togglePanel() {
    if (panel) { panel.remove(); panel = null; btn.textContent = "◉ Closer Coach"; return; }
    panel = document.createElement("div");
    panel.id = "closer-coach-panel";
    panel.innerHTML = `
      <div id="closer-coach-header">
        <span>Live Coach — Granola stealth invisível</span>
        <button id="closer-close">Fechar</button>
      </div>
      <iframe id="closer-coach-iframe" src="${APP}/live?embed=1" allow="microphone; camera; display-capture; autoplay"></iframe>
    `;
    document.body.appendChild(panel);
    panel.querySelector("#closer-close").onclick = () => { panel.remove(); panel = null; btn.textContent = "◉ Closer Coach"; };
    btn.textContent = "● Fechar Coach";
  }

  createToggle();
  // auto-inject on Meet/Zoom load
  setTimeout(createToggle, 2000);
})();

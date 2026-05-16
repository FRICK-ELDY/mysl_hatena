/**
 * 設定パネル（configPanel）を生成し、表示・非表示とフルスクリーン/ウィンドウ切替を提供する
 * @param {HTMLElement} container - ゲームコンテナ（フルスクリーン対象）
 * @returns {{ panelElement: HTMLElement, show: () => void, hide: () => void, toggle: () => void }}
 */
export function createConfigPanel(container) {
  const panel = document.createElement('div');
  panel.className = 'config-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', '表示設定');

  const title = document.createElement('div');
  title.className = 'config-panel-title';
  title.textContent = '表示モード';
  panel.appendChild(title);

  const buttonsWrap = document.createElement('div');
  buttonsWrap.className = 'config-panel-buttons';

  const btnFullscreen = document.createElement('button');
  btnFullscreen.type = 'button';
  btnFullscreen.className = 'config-panel-btn';
  btnFullscreen.textContent = 'フルスクリーン';

  const btnWindow = document.createElement('button');
  btnWindow.type = 'button';
  btnWindow.className = 'config-panel-btn';
  btnWindow.textContent = 'ウィンドウ';

  function updateActiveState() {
    const isFullscreen = !!document.fullscreenElement;
    btnFullscreen.classList.toggle('active', isFullscreen);
    btnWindow.classList.toggle('active', !isFullscreen);
  }

  btnFullscreen.addEventListener('click', async () => {
    if (document.fullscreenElement) return;
    await (container.requestFullscreen?.() || container.webkitRequestFullscreen?.());
    updateActiveState();
  });

  btnWindow.addEventListener('click', async () => {
    if (!document.fullscreenElement) return;
    await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
    updateActiveState();
  });

  buttonsWrap.append(btnFullscreen, btnWindow);
  panel.appendChild(buttonsWrap);
  container.appendChild(panel);

  // フルスクリーン変更時（ESC など）にボタン状態を同期
  container.addEventListener('fullscreenchange', updateActiveState);
  container.addEventListener('webkitfullscreenchange', updateActiveState);

  updateActiveState();

  function show() {
    panel.classList.add('is-open');
  }

  function hide() {
    panel.classList.remove('is-open');
  }

  function toggle() {
    panel.classList.toggle('is-open');
  }

  // パネル外クリックで閉じる（Canvas 上の歯車クリックは main.js で処理するため除外）
  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('is-open')) return;
    if (panel.contains(e.target)) return;
    if (e.target.id === 'game-canvas') return;
    hide();
  });

  return { panelElement: panel, show, hide, toggle };
}

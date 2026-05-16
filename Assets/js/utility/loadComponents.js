/**
 * コンポーネント（header, footer）を読み込んで挿入する
 */
async function loadComponent(elementId, path, options = {}) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    const html = await response.text();

    // game.html の場合は importmap を先に document に注入
    if (options.injectScripts) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const scripts = doc.querySelectorAll('script[data-game-importmap]');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        newScript.type = script.type;
        newScript.textContent = script.textContent;
        document.head.appendChild(newScript);
      });
      // importmap 以外の HTML を挿入
      const gameContent = doc.body.querySelector('#game-container');
      element.innerHTML = gameContent ? gameContent.outerHTML : '';
    } else {
      element.innerHTML = html;
    }
  } catch (err) {
    console.error(`Error loading component ${path}:`, err);
    element.innerHTML = `<!-- ${path} の読み込みに失敗しました -->`;
  }
}

function initTabs() {
  const tabLinks = document.querySelectorAll('.tab-link');
  const gameSection = document.getElementById('game');
  const conceptSection = document.getElementById('concept');

  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('href').slice(1);

      tabLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      if (target === 'game') {
        gameSection.classList.remove('hidden');
        conceptSection.classList.add('hidden');
      } else if (target === 'concept') {
        gameSection.classList.add('hidden');
        conceptSection.classList.remove('hidden');
      }
    });
  });

  // 初期状態: ゲームを表示
  const gameLink = document.querySelector('.tab-link[href="#game"]');
  if (gameLink) {
    gameLink.classList.add('active');
    conceptSection.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadComponent('header-placeholder', 'components/header.html');
  await loadComponent('footer-placeholder', 'components/footer.html');
  await loadComponent('game', 'components/game.html', { injectScripts: true });
  await loadComponent('concept', 'components/concept.html');
  initTabs();
  // ゲームコンポーネント読み込み後に Three.js を初期化
  await import('../main.js');
});

// 効果音（SE）の簡易ユーティリティ
// - 事前にカーソル移動音をプリロード
// - 音量は 0..100(%) を 0..1 に正規化して適用

let seVolume = 0.8; // 0.0..1.0
let bgmVolume = 0.05; // 0.0..1.0
let bgmAudio = null;
let messageLoopAudio = null;

const hoverBaseAudio = new Audio('Assets/sound/se/move_cursor_12.mp3');
hoverBaseAudio.preload = 'auto';
const clickBaseAudio = new Audio('Assets/sound/se/enter_31.mp3');
clickBaseAudio.preload = 'auto';

/**
 * SE音量をパーセントで設定（0..100）
 * @param {number} percent
 */
export function setSeVolumePercent(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  seVolume = clamped / 100;
  // メッセージループSEにも反映
  if (messageLoopAudio) {
    messageLoopAudio.volume = seVolume;
  }
}

/**
 * ホバー音を再生（同時再生に対応するため cloneNode を利用）
 */
export function playHover() {
  try {
    const a = hoverBaseAudio.cloneNode(true);
    a.volume = seVolume;
    a.currentTime = 0;
    // 再生エラーは握り潰してUI操作をブロックしない
    a.play().catch(() => {});
  } catch {
    // no-op
  }
}

/**
 * クリック音を再生（同時再生に対応するため cloneNode を利用）
 */
export function playClick() {
  try {
    const a = clickBaseAudio.cloneNode(true);
    a.volume = seVolume;
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {
    // no-op
  }
}

/**
 * BGM音量をパーセントで設定（0..100）
 * @param {number} percent
 */
export function setBgmVolumePercent(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  bgmVolume = clamped / 100;
  if (bgmAudio) {
    bgmAudio.volume = bgmVolume;
  }
}

/**
 * BGMを再生（既存のBGMは停止して差し替え）
 * @param {string} src
 * @param {{ loop?: boolean }} [options]
 */
export function playBgm(src, options = {}) {
  const { loop = true } = options;
  try {
    if (bgmAudio) {
      try { bgmAudio.pause(); } catch {}
    }
    bgmAudio = new Audio(src);
    bgmAudio.loop = loop;
    bgmAudio.preload = 'auto';
    bgmAudio.volume = bgmVolume;
    // 自動再生がブロックされる場合があるが、ここでは握り潰す
    bgmAudio.play().catch(() => {});
  } catch {
    // no-op
  }
}

/**
 * BGMを停止
 */
export function stopBgm() {
  if (bgmAudio) {
    try { bgmAudio.pause(); } catch {}
    bgmAudio = null;
  }
}

/**
 * BGMが再生中かどうか
 * @returns {boolean}
 */
export function isBgmPlaying() {
  return !!(bgmAudio && !bgmAudio.paused);
}

/**
 * メッセージ進行中に流すループSEを再生
 * @param {string} src
 * @param {{ loop?: boolean }} [options]
 */
export function playMessageLoop(src = 'Assets/sound/se/message_2.mp3', options = {}) {
  const { loop = true } = options;
  try {
    if (messageLoopAudio) {
      try { messageLoopAudio.pause(); } catch {}
    }
    messageLoopAudio = new Audio(src);
    messageLoopAudio.loop = loop;
    messageLoopAudio.preload = 'auto';
    messageLoopAudio.volume = seVolume;
    messageLoopAudio.play().catch(() => {});
  } catch {
    // no-op
  }
}

/**
 * メッセージ進行中のループSEを停止
 */
export function stopMessageLoop() {
  if (messageLoopAudio) {
    try { messageLoopAudio.pause(); } catch {}
    messageLoopAudio = null;
  }
}



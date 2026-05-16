import { SceneManager } from './scene/sceneManager.js';
import * as THREE from 'three';

/**
 * アプリケーションのエントリーポイント
 */
(function main() {
  // DOM要素の取得
  const canvas = document.getElementById('game-canvas');
  const container = document.getElementById('game-container');
  const overlay = document.getElementById('loading-overlay');
  const barFill = document.getElementById('loading-bar-fill');
  const percentEl = document.getElementById('loading-percent');

  // 要素の存在確認
  if (!canvas) {
    console.error('Canvas element not found: #game-canvas');
    return;
  }

  if (!container) {
    console.error('Container element not found: #game-container');
    return;
  }

  // ローディング表示ユーティリティ
  function setProgress(pct) {
    const clamped = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    if (barFill) barFill.style.width = `${clamped}%`;
    if (percentEl) percentEl.textContent = `${clamped}%`;
  }
  function showOverlay() {
    if (overlay) overlay.classList.remove('is-hidden');
  }
  function hideOverlay() {
    if (overlay) overlay.classList.add('is-hidden');
  }

  // Three.js のグローバルローダーで進捗を監視
  let loadingStarted = false;
  // 初期状態では非表示
  hideOverlay();
  // 一定時間以上かかった場合のみ表示（チラつき防止）
  const OVERLAY_SHOW_DELAY_MS = 600;
  let overlayDelayTimer = null;
  if (THREE && THREE.DefaultLoadingManager) {
    THREE.DefaultLoadingManager.onStart = function () {
      loadingStarted = true;
      if (overlayDelayTimer) clearTimeout(overlayDelayTimer);
      overlayDelayTimer = setTimeout(() => {
        showOverlay();
        setProgress(0);
      }, OVERLAY_SHOW_DELAY_MS);
    };
    THREE.DefaultLoadingManager.onProgress = function (_url, itemsLoaded, itemsTotal) {
      if (!loadingStarted) {
        loadingStarted = true;
        if (overlayDelayTimer) clearTimeout(overlayDelayTimer);
        overlayDelayTimer = setTimeout(() => {
          showOverlay();
        }, OVERLAY_SHOW_DELAY_MS);
      }
      const pct = itemsTotal > 0 ? (itemsLoaded / itemsTotal) * 100 : 100;
      setProgress(pct);
    };
    THREE.DefaultLoadingManager.onLoad = function () {
      if (overlayDelayTimer) {
        clearTimeout(overlayDelayTimer);
        overlayDelayTimer = null;
      }
      setProgress(100);
      // 即時に閉じる（見せない）
      hideOverlay();
    };
  }

  // シーンマネージャーの初期化
  const sceneManager = new SceneManager(canvas, container);

  // 初期シーンをタイトルに設定
  sceneManager.changeScene('title');

  // グローバルに公開（デバッグ用）
  if (typeof window !== 'undefined') {
    window.sceneManager = sceneManager;
  }
})();

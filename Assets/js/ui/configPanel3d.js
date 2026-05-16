import * as THREE from 'three';
import { getScaledSize } from './screenScale.js';

/** パネルベースサイズ（ベース解像度 1024×576 でのピクセル・横長） */
const BASE_PANEL_WIDTH = 480;
const BASE_PANEL_HEIGHT = 280;

/** ラベル開始 X（表示モード・SE・メッセージスピードの左端） */
const LABEL_LEFT = 28;
/** BGM ラベルの X（短いラベルのためわずかに右にずらす） */
const BGM_LABEL_LEFT = LABEL_LEFT + 12;
/** ラベル幅（表示モード・BGM 等の左側テキスト用） */
const LABEL_WIDTH = 140;
/** コンテンツ開始 X（ラベル右・ボタン・スライダー共通） */
const CONTENT_START_X = LABEL_LEFT + LABEL_WIDTH;
/** コンテンツ幅（ボタン2つ or スライダー＋数値まで。右端を揃える） */
const CONTENT_WIDTH = 240;
/** フルスクリーン・ウィンドウボタン間の余白 */
const BUTTON_GAP = 8;
/** 表示モードのボタン1つ幅（2つ＋間隔で CONTENT_WIDTH に収める） */
const DISPLAY_MODE_BUTTON_W = (CONTENT_WIDTH - BUTTON_GAP) / 2;
/** 数値表示をパネル右端に右揃えで表示する X 位置（右端） */
const SLIDER_VALUE_RIGHT_X = BASE_PANEL_WIDTH - 20;

/** 各セクションの Y 位置（ラベル・コントロール・区切り線・行中央） */
const LAYOUT = {
  titleLine: 42,
  displayModeButtons: 56,
  displayModeRowCenter: 72,
  displayModeLine: 94,
  bgmSlider: 112,
  bgmRowCenter: 122,
  bgmLine: 138,
  seSlider: 156,
  seRowCenter: 166,
  seLine: 182,
  messageSlider: 200,
  messageRowCenter: 210,
  messageLine: 226,
  backToTitleButton: 240,
};

/** タイトルに戻るボタンのサイズ */
const BACK_BUTTON_WIDTH = 140;
const BACK_BUTTON_HEIGHT = 28;

/** クリック可能な領域（ベース座標: 左上原点） */
const BUTTON_RECTS = [
  {
    id: 'fullscreen',
    x: CONTENT_START_X,
    y: LAYOUT.displayModeButtons,
    w: DISPLAY_MODE_BUTTON_W,
    h: 32,
  },
  {
    id: 'window',
    x: CONTENT_START_X + DISPLAY_MODE_BUTTON_W + BUTTON_GAP,
    y: LAYOUT.displayModeButtons,
    w: DISPLAY_MODE_BUTTON_W,
    h: 32,
  },
  { id: 'bgm_slider', x: CONTENT_START_X, y: LAYOUT.bgmSlider, w: CONTENT_WIDTH, h: 20 },
  { id: 'se_slider', x: CONTENT_START_X, y: LAYOUT.seSlider, w: CONTENT_WIDTH, h: 20 },
  {
    id: 'message_speed_slider',
    x: CONTENT_START_X,
    y: LAYOUT.messageSlider,
    w: CONTENT_WIDTH,
    h: 20,
  },
  {
    id: 'back_to_title',
    x: BASE_PANEL_WIDTH - BACK_BUTTON_WIDTH - 16,
    y: LAYOUT.backToTitleButton,
    w: BACK_BUTTON_WIDTH,
    h: BACK_BUTTON_HEIGHT,
  },
];

/** デフォルト設定状態 */
const DEFAULT_STATE = {
  displayMode: 'window',
  bgmVolume: 5,
  seVolume: 80,
  messageSpeed: 80,
};

/**
 * パネル用 Canvas テクスチャを描画する（解像度に応じてスケール）
 * @param {Object} state - 設定状態
 * @param {number} panelWidth - 表示幅（ピクセル）
 * @param {number} panelHeight - 表示高さ（ピクセル）
 * @returns {THREE.CanvasTexture}
 */
function drawPanelTexture(state, panelWidth, panelHeight) {
  const w = Math.round(panelWidth);
  const h = Math.round(panelHeight);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const scaleX = w / BASE_PANEL_WIDTH;
  const scaleY = h / BASE_PANEL_HEIGHT;
  ctx.scale(scaleX, scaleY);

  const isFullscreen = state.displayMode === 'fullscreen';

  ctx.font = '14px "Yu Gothic", "Meiryo", sans-serif';

  ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, 0, 0, BASE_PANEL_WIDTH, BASE_PANEL_HEIGHT, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e0e0e0';
  ctx.font = 'bold 16px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('設定', BASE_PANEL_WIDTH / 2, 16);
  drawSectionLine(ctx, LAYOUT.titleLine);

  ctx.font = '12px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#a0a0a0';
  ctx.textBaseline = 'middle';
  ctx.fillText('表示モード', LABEL_LEFT, LAYOUT.displayModeRowCenter);
  drawButton(
    ctx,
    CONTENT_START_X,
    LAYOUT.displayModeButtons,
    DISPLAY_MODE_BUTTON_W,
    32,
    'フルスクリーン',
    isFullscreen
  );
  drawButton(
    ctx,
    CONTENT_START_X + DISPLAY_MODE_BUTTON_W + BUTTON_GAP,
    LAYOUT.displayModeButtons,
    DISPLAY_MODE_BUTTON_W,
    32,
    'ウィンドウ',
    !isFullscreen
  );
  drawSectionLine(ctx, LAYOUT.displayModeLine);

  ctx.fillStyle = '#a0a0a0';
  ctx.fillText('BGM', BGM_LABEL_LEFT, LAYOUT.bgmRowCenter);
  drawSlider(
    ctx,
    CONTENT_START_X,
    LAYOUT.bgmSlider,
    CONTENT_WIDTH,
    20,
    state.bgmVolume
  );
  drawSliderValue(
    ctx,
    SLIDER_VALUE_RIGHT_X,
    LAYOUT.bgmSlider + 10,
    state.bgmVolume
  );
  drawSectionLine(ctx, LAYOUT.bgmLine);

  ctx.fillStyle = '#a0a0a0';
  ctx.fillText('SE', LABEL_LEFT, LAYOUT.seRowCenter);
  drawSlider(
    ctx,
    CONTENT_START_X,
    LAYOUT.seSlider,
    CONTENT_WIDTH,
    20,
    state.seVolume
  );
  drawSliderValue(
    ctx,
    SLIDER_VALUE_RIGHT_X,
    LAYOUT.seSlider + 10,
    state.seVolume
  );
  drawSectionLine(ctx, LAYOUT.seLine);

  ctx.fillStyle = '#a0a0a0';
  ctx.fillText('メッセージスピード', LABEL_LEFT, LAYOUT.messageRowCenter);
  drawSlider(
    ctx,
    CONTENT_START_X,
    LAYOUT.messageSlider,
    CONTENT_WIDTH,
    20,
    state.messageSpeed
  );
  drawSliderValue(
    ctx,
    SLIDER_VALUE_RIGHT_X,
    LAYOUT.messageSlider + 10,
    state.messageSpeed
  );
  drawSectionLine(ctx, LAYOUT.messageLine);

  // タイトルに戻るボタン（右下）
  drawBackToTitleButton(
    ctx,
    BASE_PANEL_WIDTH - BACK_BUTTON_WIDTH - 16,
    LAYOUT.backToTitleButton,
    BACK_BUTTON_WIDTH,
    BACK_BUTTON_HEIGHT
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** 各項目の下に引く区切り線（パネル幅いっぱい・左右に余白） */
function drawSectionLine(ctx, y) {
  const margin = 16;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(BASE_PANEL_WIDTH - margin, y);
  ctx.stroke();
}

function drawButton(ctx, x, y, w, h, label, active) {
  ctx.fillStyle = active ? 'rgba(232, 213, 183, 0.35)' : 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = active ? 'rgba(232, 213, 183, 0.8)' : 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = active ? '#e8d5b7' : '#e0e0e0';
  ctx.font = '12px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

/** スライダー描画（0〜100、トラック＋サム。数値は別途 drawSliderValue で描画） */
function drawSlider(ctx, x, y, w, h, valuePercent) {
  const value = Math.max(0, Math.min(100, valuePercent));
  const thumbRadius = 8;
  const trackPadding = 4;
  const trackY = y + h / 2;
  const trackLeft = x + trackPadding + thumbRadius;
  const trackRight = x + w - trackPadding - thumbRadius;
  const trackW = trackRight - trackLeft;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  const thumbX = trackLeft + (value / 100) * trackW;
  ctx.fillStyle = 'rgba(232, 213, 183, 0.9)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(thumbX, trackY, thumbRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** スライダー数値をパネル右端に右揃えで描画（x は右端の位置） */
function drawSliderValue(ctx, rightX, y, valuePercent) {
  const value = Math.round(Math.max(0, Math.min(100, valuePercent)));
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '12px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), rightX, y);
  ctx.textAlign = 'left';
}

/** タイトルに戻るボタンを描画 */
function drawBackToTitleButton(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(180, 100, 100, 0.3)';
  ctx.strokeStyle = 'rgba(255, 150, 150, 0.6)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffcccc';
  ctx.font = '12px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('タイトルに戻る', x + w / 2, y + h / 2);
}

/**
 * ヒット座標（パネルローカル -0.5〜0.5）からアクションを取得する
 * @param {THREE.Vector3} localPoint - パネルメッシュのローカル座標
 * @param {number} panelWidth - 現在のパネル幅（スケール後）
 * @param {number} panelHeight - 現在のパネル高さ（スケール後）
 * @returns {string|null} アクション ID または null
 */
/**
 * ヒット座標からアクションを取得。スライダーの場合は { id, value } を返す
 * @returns {string|{ id: string, value: number }|null}
 */
function getActionAtLocal(localPoint, panelWidth, panelHeight, basePanelW, basePanelH) {
  const u = (localPoint.x + 0.5);
  const v = (0.5 - localPoint.y);
  const px = u * panelWidth;
  const py = v * panelHeight;
  const scaleX = panelWidth / basePanelW;
  const scaleY = panelHeight / basePanelH;
  for (const rect of BUTTON_RECTS) {
    const rx = rect.x * scaleX;
    const ry = rect.y * scaleY;
    const rw = rect.w * scaleX;
    const rh = rect.h * scaleY;
    if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
      if (
        rect.id === 'bgm_slider' ||
        rect.id === 'se_slider' ||
        rect.id === 'message_speed_slider'
      ) {
        const t = (px - rx) / rw;
        const value = Math.round(Math.max(0, Math.min(100, t * 100)));
        return { id: rect.id, value };
      }
      return rect.id;
    }
  }
  return null;
}

/**
 * Three.js 上の設定パネル（オルソグラフィック UI レイヤー）
 * 一般的なゲーム設定項目: 表示モード, BGM/SE 音量, メッセージスピード
 * @param {HTMLElement} container - フルスクリーン対象コンテナ
 * @returns {{
 *   panelGroup: THREE.Group,
 *   mesh: THREE.Mesh,
 *   show: () => void,
 *   hide: () => void,
 *   toggle: () => void,
 *   update: (width: number, height: number) => void,
 *   getActionAt: (intersectionPoint: THREE.Vector3) => string|null,
 *   getState: () => Object,
 *   setState: (state: Object) => void,
 *   applyDisplayMode: (container: HTMLElement) => Promise<void>
 * }}
 */
export function createConfigPanel3d(container) {
  const state = { ...DEFAULT_STATE };
  let currentPanelWidth = BASE_PANEL_WIDTH;
  let currentPanelHeight = BASE_PANEL_HEIGHT;

  const panelGroup = new THREE.Group();
  panelGroup.visible = false;

  const geometry = new THREE.PlaneGeometry(1, 1);
  let material = new THREE.MeshBasicMaterial({
    map: drawPanelTexture(state, currentPanelWidth, currentPanelHeight),
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'configPanel3d';
  panelGroup.add(mesh);

  function redraw() {
    if (material.map) material.map.dispose();
    material.map = drawPanelTexture(state, currentPanelWidth, currentPanelHeight);
    material.map.needsUpdate = true;
  }

  function syncDisplayModeFromDocument() {
    state.displayMode = document.fullscreenElement ? 'fullscreen' : 'window';
    redraw();
  }

  if (container) {
    container.addEventListener('fullscreenchange', syncDisplayModeFromDocument);
    container.addEventListener('webkitfullscreenchange', syncDisplayModeFromDocument);
  }

  function show() {
    panelGroup.visible = true;
  }

  function hide() {
    panelGroup.visible = false;
  }

  function toggle() {
    panelGroup.visible = !panelGroup.visible;
  }

  /**
   * ワールド座標の交点をパネルローカルに変換し、アクションを返す
   * @param {THREE.Vector3} worldPoint - レイとメッシュの交点（ワールド座標）
   * @returns {string|{ id: string, value: number }|null}
   */
  function getActionAt(worldPoint) {
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const local = worldPoint.clone().applyMatrix4(inv);
    return getActionAtLocal(local, currentPanelWidth, currentPanelHeight, BASE_PANEL_WIDTH, BASE_PANEL_HEIGHT);
  }

  /**
   * ドラッグ用: パネル上のワールド座標からスライダー値（0〜100）を算出する
   * @param {THREE.Vector3} worldPoint - レイとメッシュの交点（ワールド座標）
   * @param {string} sliderId - 'bgm_slider' | 'se_slider' | 'message_speed_slider'
   * @returns {number} 0〜100
   */
  function getSliderValueFromPoint(worldPoint, sliderId) {
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const local = worldPoint.clone().applyMatrix4(inv);
    const u = (local.x + 0.5);
    const v = (0.5 - local.y);
    const px = u * currentPanelWidth;
    const scaleX = currentPanelWidth / BASE_PANEL_WIDTH;
    const rect = BUTTON_RECTS.find((r) => r.id === sliderId);
    if (!rect) return 0;
    const rx = rect.x * scaleX;
    const rw = rect.w * scaleX;
    const t = (px - rx) / rw;
    return Math.round(Math.max(0, Math.min(100, t * 100)));
  }

  function update(width, height) {
    panelGroup.position.set(0, 0, 0);
    const scaled = getScaledSize(BASE_PANEL_WIDTH, BASE_PANEL_HEIGHT, width, height);
    currentPanelWidth = scaled.width;
    currentPanelHeight = scaled.height;
    mesh.scale.set(currentPanelWidth, currentPanelHeight, 1);
    redraw();
  }

  async function applyDisplayMode(containerElement) {
    if (state.displayMode === 'fullscreen') {
      if (!document.fullscreenElement) {
        await (containerElement.requestFullscreen?.() || containerElement.webkitRequestFullscreen?.());
      }
    } else {
      if (document.fullscreenElement) {
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
      }
    }
    syncDisplayModeFromDocument();
  }

  return {
    panelGroup,
    mesh,
    show,
    hide,
    toggle,
    update,
    getActionAt,
    getSliderValueFromPoint,
    getState: () => ({ ...state }),
    setState: (s) => {
      Object.assign(state, s);
      redraw();
    },
    applyDisplayMode,
    syncDisplayModeFromDocument
  };
}

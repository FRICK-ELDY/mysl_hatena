import * as THREE from 'three';
import { scaleValue } from './screenScale.js';

/** 設定アイコンの Unicode（Material Symbols: settings = U+E8B8） */
const SETTINGS_ICON = '\uE8B8';
/** テクスチャ用キャンバス内のアイコンサイズ（px） */
const ICON_FONT_SIZE = 80;
/** Material Symbols のベースライン補正（円の中心に合わせるための Y オフセット・正で下方向） */
const ICON_CENTER_OFFSET_Y = 6;

/**
 * Google Fonts Icons（Material Symbols）で歯車アイコンの Canvas テクスチャを作成する
 * フォント読み込み完了後に描画する
 * @returns {Promise<THREE.CanvasTexture>}
 */
async function createGearTextureFromMaterialSymbols() {
  const fontSpec = `${ICON_FONT_SIZE}px "Material Symbols Outlined"`;
  await document.fonts.load(fontSpec);

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = fontSpec;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(SETTINGS_ICON, size / 2, size / 2 + ICON_CENTER_OFFSET_Y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Unity 風のアンカー・ピボット
 * アンカー: 画面内の基準点 (0=左/下, 1=右/上)
 * ピボット: 要素内の基準点 (0=左/下, 1=右/上)。この点がアンカー位置に来る
 */
const ANCHOR = { x: 1, y: 1 };   // 右上
const PIVOT = { x: 1, y: 1 };    // 要素の右上をアンカーに合わせる
/** ベース解像度でのマージン・ボタンサイズ（screenScale でスケールされる） */
const BASE_MARGIN_PX = 12;
const BASE_BUTTON_SIZE_PX = 40;

/**
 * Three.js Canvas 上に描画するコンフィグ（歯車）ボタン（オースオソグラフィック UI レイヤー）
 * 歯車アイコンは [Google Fonts Icons - Material Symbols](https://fonts.google.com/icons) を使用
 * @returns {Promise<{
 *   uiScene: THREE.Scene,
 *   orthoCamera: THREE.OrthographicCamera,
 *   mesh: THREE.Mesh,
 *   update: (width: number, height: number) => void
 * }>}
 */
export async function createConfigButton3d() {
  const texture = await createGearTextureFromMaterialSymbols();

  const uiScene = new THREE.Scene();

  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  orthoCamera.position.z = 1;
  orthoCamera.lookAt(0, 0, 0);

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'configButton3d';
  uiScene.add(mesh);

  /**
   * アンカー・ピボットに従い、解像度スケールで位置・サイズを更新する
   * @param {number} width - キャンバス幅（ピクセル）
   * @param {number} height - キャンバス高さ（ピクセル）
   */
  function update(width, height) {
    orthoCamera.left = -width / 2;
    orthoCamera.right = width / 2;
    orthoCamera.top = height / 2;
    orthoCamera.bottom = -height / 2;
    orthoCamera.updateProjectionMatrix();

    const marginPx = scaleValue(BASE_MARGIN_PX, width, height);
    const buttonSizePx = scaleValue(BASE_BUTTON_SIZE_PX, width, height);

    const halfW = width / 2;
    const halfH = height / 2;
    const anchorX = -halfW + width * ANCHOR.x + (ANCHOR.x === 0 ? marginPx : -marginPx);
    const anchorY = -halfH + height * ANCHOR.y + (ANCHOR.y === 0 ? marginPx : -marginPx);

    const pivotOffsetX = (PIVOT.x - 0.5) * buttonSizePx;
    const pivotOffsetY = (PIVOT.y - 0.5) * buttonSizePx;
    mesh.position.set(
      anchorX - pivotOffsetX,
      anchorY - pivotOffsetY,
      0
    );

    mesh.scale.set(buttonSizePx, buttonSizePx, 1);
  }

  return { uiScene, orthoCamera, mesh, update };
}

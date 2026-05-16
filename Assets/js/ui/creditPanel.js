import * as THREE from 'three';
import { getScaledSize } from './screenScale.js';

const BASE_PANEL_WIDTH = 520;
const BASE_PANEL_HEIGHT = 360;

const TITLE_Y = 28;
const CONTENT_START_Y = 64;
const LINE_HEIGHT = 26;
const LEFT_COL_X = 28;
const RIGHT_COL_X = 260;

const CLOSE_W = 96;
const CLOSE_H = 28;

const BUTTON_RECTS = [
  {
    id: 'close',
    x: BASE_PANEL_WIDTH - CLOSE_W - 16,
    y: BASE_PANEL_HEIGHT - CLOSE_H - 16,
    w: CLOSE_W,
    h: CLOSE_H,
  },
];

function drawPanelTexture(panelWidth, panelHeight) {
  const w = Math.round(panelWidth);
  const h = Math.round(panelHeight);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const scaleX = w / BASE_PANEL_WIDTH;
  const scaleY = h / BASE_PANEL_HEIGHT;
  ctx.scale(scaleX, scaleY);

  // Panel background
  ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, 0, 0, BASE_PANEL_WIDTH, BASE_PANEL_HEIGHT, 8);
  ctx.fill();
  ctx.stroke();

  // Title
  ctx.fillStyle = '#e0e0e0';
  ctx.font = 'bold 18px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('クレジット', BASE_PANEL_WIDTH / 2, TITLE_Y);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.moveTo(16, TITLE_Y + 18);
  ctx.lineTo(BASE_PANEL_WIDTH - 16, TITLE_Y + 18);
  ctx.stroke();

  // Content
  ctx.font = '14px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let y = CONTENT_START_Y;

  // Helper to draw one row (role, name)
  function row(role, name) {
    ctx.fillStyle = '#a0a0a0';
    ctx.fillText(role, LEFT_COL_X, y);
    ctx.fillStyle = '#e0e0e0';
    ctx.fillText(name, RIGHT_COL_X, y);
    y += LINE_HEIGHT;
  }

  row('プロデューサー', 'FRICK');
  row('ディレクター', 'FRICK');
  row('プログラマー', 'AI: Carsor');
  row('グラフィック', 'AI: Gemini');
  row('', 'AI: ComfyUI');
  row('ストーリー', 'AI: ChatGPT');
  row('サウンド', '効果音ラボ');
  row('', 'ユーフルカ');

  // Close button
  drawButton(ctx, BASE_PANEL_WIDTH - CLOSE_W - 16, BASE_PANEL_HEIGHT - CLOSE_H - 16, CLOSE_W, CLOSE_H, '閉じる');

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function drawButton(ctx, x, y, w, h, label) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '12px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
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
      return rect.id;
    }
  }
  return null;
}

export function createCreditPanel3d() {
  let currentPanelWidth = BASE_PANEL_WIDTH;
  let currentPanelHeight = BASE_PANEL_HEIGHT;

  const panelGroup = new THREE.Group();
  panelGroup.visible = false;

  const geometry = new THREE.PlaneGeometry(1, 1);
  let material = new THREE.MeshBasicMaterial({
    map: drawPanelTexture(currentPanelWidth, currentPanelHeight),
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'creditPanel3d';
  panelGroup.add(mesh);

  function redraw() {
    if (material.map) material.map.dispose();
    material.map = drawPanelTexture(currentPanelWidth, currentPanelHeight);
    material.map.needsUpdate = true;
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

  function getActionAt(worldPoint) {
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const local = worldPoint.clone().applyMatrix4(inv);
    return getActionAtLocal(local, currentPanelWidth, currentPanelHeight, BASE_PANEL_WIDTH, BASE_PANEL_HEIGHT);
  }

  function update(width, height) {
    panelGroup.position.set(0, 0, 0);
    const scaled = getScaledSize(BASE_PANEL_WIDTH, BASE_PANEL_HEIGHT, width, height);
    currentPanelWidth = scaled.width;
    currentPanelHeight = scaled.height;
    mesh.scale.set(currentPanelWidth, currentPanelHeight, 1);
    redraw();
  }

  return {
    panelGroup,
    mesh,
    show,
    hide,
    toggle,
    update,
    getActionAt
  };
}



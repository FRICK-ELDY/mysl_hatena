import * as THREE from 'three';
import { getScaledSize } from './screenScale.js';

const BASE_PANEL_WIDTH = 560;
const BASE_PANEL_HEIGHT = 380;

const TITLE_Y = 28;
const TABS_Y = 56;
const TAB_W = 120;
const TAB_H = 28;
const TAB_GAP = 10;

const LEFT_COL_X = 28;
const BUTTON_W = 96;
const BUTTON_H = 28;
const BUTTON_X = BASE_PANEL_WIDTH - BUTTON_W - 16;

const ROW_START_Y = 116;
const ROW_GAP = 36;
const ROLE_RIGHT_X = LEFT_COL_X + 80;

const CLOSE_W = 96;
const CLOSE_H = 28;

const BUTTON_RECTS_BASE = [
  { id: 'close', x: BASE_PANEL_WIDTH - CLOSE_W - 16, y: BASE_PANEL_HEIGHT - CLOSE_H - 16, w: CLOSE_W, h: CLOSE_H },
  { id: 'tab_story', x: (BASE_PANEL_WIDTH - (TAB_W * 2 + TAB_GAP)) / 2, y: TABS_Y, w: TAB_W, h: TAB_H },
  { id: 'tab_images', x: (BASE_PANEL_WIDTH - (TAB_W * 2 + TAB_GAP)) / 2 + TAB_W + TAB_GAP, y: TABS_Y, w: TAB_W, h: TAB_H },
  { id: 'row_intro_btn', x: BUTTON_X, y: ROW_START_Y + 0 * ROW_GAP - BUTTON_H / 2, w: BUTTON_W, h: BUTTON_H },
  { id: 'row_main_btn', x: BUTTON_X, y: ROW_START_Y + 1 * ROW_GAP - BUTTON_H / 2, w: BUTTON_W, h: BUTTON_H },
  { id: 'row_end1_btn', x: BUTTON_X, y: ROW_START_Y + 2 * ROW_GAP - BUTTON_H / 2, w: BUTTON_W, h: BUTTON_H },
  { id: 'row_end2_btn', x: BUTTON_X, y: ROW_START_Y + 3 * ROW_GAP - BUTTON_H / 2, w: BUTTON_W, h: BUTTON_H },
  { id: 'row_end3_btn', x: BUTTON_X, y: ROW_START_Y + 4 * ROW_GAP - BUTTON_H / 2, w: BUTTON_W, h: BUTTON_H },
];

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

function drawButton(ctx, x, y, w, h, label, active = false) {
  const prev = { textAlign: ctx.textAlign, textBaseline: ctx.textBaseline };
  ctx.save();
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
  ctx.restore();
  ctx.textAlign = prev.textAlign;
  ctx.textBaseline = prev.textBaseline;
}

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

  // Background
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
  ctx.fillText('ギャラリー', BASE_PANEL_WIDTH / 2, TITLE_Y);

  // Tabs
  drawButton(ctx, BUTTON_RECTS_BASE[1].x, BUTTON_RECTS_BASE[1].y, TAB_W, TAB_H, 'ストーリー', state.activeTab === 'story');
  drawButton(ctx, BUTTON_RECTS_BASE[2].x, BUTTON_RECTS_BASE[2].y, TAB_W, TAB_H, '画像', state.activeTab === 'images');

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.moveTo(16, TABS_Y + TAB_H + 8);
  ctx.lineTo(BASE_PANEL_WIDTH - 16, TABS_Y + TAB_H + 8);
  ctx.stroke();

  if (state.activeTab === 'story') {
    // Rows
    ctx.font = '14px "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const labels = ['intro', 'main', 'END1', 'END2', 'END3'];
    labels.forEach((label, i) => {
      const y = ROW_START_Y + i * ROW_GAP;
      ctx.fillStyle = '#a0a0a0';
      ctx.textAlign = 'right';
      ctx.fillText(label, ROLE_RIGHT_X, y);
      // Go button
      drawButton(ctx, BUTTON_X, y - BUTTON_H / 2, BUTTON_W, BUTTON_H, 'go', false);
    });
  } else {
    // Images tab placeholder
    ctx.font = '14px "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a0a0a0';
    ctx.fillText('なし', BASE_PANEL_WIDTH / 2, (BASE_PANEL_HEIGHT + (TABS_Y + TAB_H + 8)) / 2);
  }

  // Close button
  drawButton(ctx, BASE_PANEL_WIDTH - CLOSE_W - 16, BASE_PANEL_HEIGHT - CLOSE_H - 16, CLOSE_W, CLOSE_H, '閉じる');

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function createGalleryPanel3d() {
  const state = { activeTab: 'story' };
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
  mesh.name = 'galleryPanel3d';
  mesh.renderOrder = 1000;
  panelGroup.add(mesh);

  function redraw() {
    if (material.map) material.map.dispose();
    material.map = drawPanelTexture(state, currentPanelWidth, currentPanelHeight);
    material.map.needsUpdate = true;
  }

  function show() { panelGroup.visible = true; }
  function hide() { panelGroup.visible = false; }
  function toggle() { panelGroup.visible = !panelGroup.visible; }
  function setTab(tab) { state.activeTab = tab; redraw(); }

  function getActionAt(worldPoint) {
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const local = worldPoint.clone().applyMatrix4(inv);
    const u = (local.x + 0.5);
    const v = (0.5 - local.y);
    const px = u * currentPanelWidth;
    const py = v * currentPanelHeight;
    const scaleX = currentPanelWidth / BASE_PANEL_WIDTH;
    const scaleY = currentPanelHeight / BASE_PANEL_HEIGHT;
    for (const rect of BUTTON_RECTS_BASE) {
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
    getActionAt,
    setTab
  };
}



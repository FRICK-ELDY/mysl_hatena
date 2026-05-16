import * as THREE from 'three';
import { getFittedCanvasSize, BASE_RESOLUTION_W, BASE_RESOLUTION_H, getScaledSize, getScale } from '../ui/screenScale.js';
import { createConfigPanel3d } from '../ui/configPanel3d.js';
import { createConfigButton3d } from '../ui/configButton3d.js';
import { createParallaxBackground } from '../utility/parallaxBackground.js';
import { TextAnimation } from '../animate/textAnimation.js';
import { playHover, playClick, playBgm, stopBgm, isBgmPlaying, playMessageLoop, stopMessageLoop } from '../utility/sound.js';

export async function createEnd2Scene(canvas, container, onSceneChange, onConfigChange = null, initialConfigState = null) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const camera = new THREE.PerspectiveCamera(
    60,
    BASE_RESOLUTION_W / BASE_RESOLUTION_H,
    0.1,
    1000
  );
  camera.position.z = 5;

  const { width: initW, height: initH } = getFittedCanvasSize(container.clientWidth, container.clientHeight);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(initW, initH);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const {
    uiScene,
    orthoCamera,
    mesh: configButtonMesh,
    update: updateConfigButton
  } = await createConfigButton3d();

  const configPanel = createConfigPanel3d(container);
  uiScene.add(configPanel.panelGroup);
  if (configPanel.mesh) {
    configPanel.mesh.renderOrder = 50;
  } else {
    configPanel.panelGroup.renderOrder = 50;
  }

  // タイトルと同じパララックス背景
  const parallaxBg = await createParallaxBackground({
    imageUrl: 'Assets/texture/title_bg.png',
    maxShiftPxY: 0
  });
  uiScene.add(parallaxBg.mesh);
  parallaxBg.mesh.position.set(0, 0, -0.5);

  const initialSize = getFittedCanvasSize(container.clientWidth, container.clientHeight);
  if (initialConfigState) {
    configPanel.setState(initialConfigState);
  }
  configPanel.update(initialSize.width, initialSize.height);

  // ノベルUI（Three.js オルソ UI）
  const VN_BASE_WIDTH = 920;
  const VN_BASE_HEIGHT = 160;
  const VN_PADDING_L = 16;
  const VN_PADDING_R = 16;
  const VN_PADDING_T = 14;
  const VN_NAME_H = 26;

  const vnGroup = new THREE.Group();
  uiScene.add(vnGroup);
  const vnGeometry = new THREE.PlaneGeometry(1, 1);
  let vnMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
  const vnMesh = new THREE.Mesh(vnGeometry, vnMaterial);
  vnMesh.renderOrder = 10;
  vnGroup.add(vnMesh);

  function drawRoundedRect(ctx, x, y, w, h, r) {
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

  function drawNovelTexture(name, body, baseW, baseH) {
    const canvas = document.createElement('canvas');
    canvas.width = baseW;
    canvas.height = baseH;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(26, 26, 46, 0.86)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 0, 0, baseW, baseH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 18px "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8d5b7';
    ctx.fillText(String(name || ''), VN_PADDING_L, VN_PADDING_T + VN_NAME_H / 2);

    ctx.font = '20px "Yu Gothic", "Meiryo", sans-serif';
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const textX = VN_PADDING_L;
    const textY = VN_PADDING_T + VN_NAME_H + 6;
    const textW = baseW - VN_PADDING_L - VN_PADDING_R;
    const lineH = 34;
    const text = String(body || '');
    let cursorX = textX;
    let cursorY = textY;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const cw = ctx.measureText(ch).width;
      if (cursorX + cw > textX + textW || ch === '\n') {
        cursorX = textX;
        cursorY += lineH;
        if (ch === '\n') continue;
      }
      ctx.fillText(ch, cursorX, cursorY);
      cursorX += cw;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function redrawNovel(name, body) {
    if (vnMaterial.map) vnMaterial.map.dispose();
    vnMaterial.map = drawNovelTexture(name, body, VN_BASE_WIDTH, VN_BASE_HEIGHT);
    vnMaterial.needsUpdate = true;
  }

  function updateNovelLayout(width, height) {
    const scale = getScale(width, height);
    const scaledW = scale * VN_BASE_WIDTH;
    const scaledH = scale * VN_BASE_HEIGHT;
    vnMesh.scale.set(scaledW, scaledH, 1);
    const halfH = height / 2;
    const marginBottom = 16 * scale;
    vnMesh.position.set(0, -halfH + marginBottom + scaledH / 2, 0);
  }

  // 会話（シスターのみ）
  let vnSpeaker = 'シスター';
  let vnBody = '';
  const lines = [
    { name: 'シスター', text: '「END2」' }
  ];
  let lineCompleted = false;
  const textAnimation = new TextAnimation(
    (current) => { vnBody = current; redrawNovel(vnSpeaker, vnBody); },
    () => { stopMessageLoop(); lineCompleted = true; }
  );
  if (initialConfigState && typeof initialConfigState.messageSpeed === 'number') {
    textAnimation.setSpeed(initialConfigState.messageSpeed);
  }
  function showLine(index) {
    const line = lines[index];
    if (!line) return;
    vnSpeaker = line.name || '';
    vnBody = '';
    lineCompleted = false;
    redrawNovel(vnSpeaker, vnBody);
    textAnimation.start(line.text || '');
    playMessageLoop();
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function getPointerNDC(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  function handlePanelAction(action) {
    const id = typeof action === 'object' && action !== null ? action.id : action;
    const value = typeof action === 'object' && action !== null ? action.value : undefined;
    if (id === 'fullscreen') {
      configPanel.setState({ displayMode: 'fullscreen' });
      configPanel.applyDisplayMode(container);
      if (onConfigChange) onConfigChange(configPanel.getState());
    } else if (id === 'window') {
      configPanel.setState({ displayMode: 'window' });
      configPanel.applyDisplayMode(container);
      if (onConfigChange) onConfigChange(configPanel.getState());
    } else if (id === 'bgm_slider' && value !== undefined) {
      configPanel.setState({ bgmVolume: value });
      if (onConfigChange) onConfigChange(configPanel.getState());
    } else if (id === 'se_slider' && value !== undefined) {
      configPanel.setState({ seVolume: value });
      if (onConfigChange) onConfigChange(configPanel.getState());
    } else if (id === 'message_speed_slider' && value !== undefined) {
      configPanel.setState({ messageSpeed: value });
      if (onConfigChange) onConfigChange(configPanel.getState());
    } else if (id === 'back_to_title') {
      configPanel.hide();
      onSceneChange('title');
    }
  }

  let draggingSlider = null;
  let releasedAfterSliderDrag = false;
  let configButtonHovered = false;

  function onPointerDown(e) {
    if (e.button !== 0) return;
    if (!isBgmPlaying()) {
      playBgm('Assets/sound/bgm/Elven-Sanctuary_loop.ogg', { loop: true });
    }
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, orthoCamera);
    if (configPanel.panelGroup.visible) {
      const panelHits = raycaster.intersectObject(configPanel.mesh);
      if (panelHits.length > 0) {
        const action = configPanel.getActionAt(panelHits[0].point);
        if (action) {
          const id = typeof action === 'object' && action !== null ? action.id : action;
          if (id === 'bgm_slider' || id === 'se_slider' || id === 'message_speed_slider') {
            draggingSlider = id;
            releasedAfterSliderDrag = false;
            handlePanelAction(action);
          }
        }
      }
    }
  }

  function onPointerMove(e) {
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, orthoCamera);
    // パララックスの目標を更新
    parallaxBg.setPointerNdc(pointer.x, pointer.y);
    if (draggingSlider) {
      const panelHits = raycaster.intersectObject(configPanel.mesh);
      if (panelHits.length > 0) {
        const value = configPanel.getSliderValueFromPoint(panelHits[0].point, draggingSlider);
        if (draggingSlider === 'bgm_slider') {
          configPanel.setState({ bgmVolume: value });
          if (onConfigChange) onConfigChange(configPanel.getState());
        } else if (draggingSlider === 'se_slider') {
          configPanel.setState({ seVolume: value });
          if (onConfigChange) onConfigChange(configPanel.getState());
        } else if (draggingSlider === 'message_speed_slider') {
          configPanel.setState({ messageSpeed: value });
          if (onConfigChange) onConfigChange(configPanel.getState());
        }
      }
    }
    const overButton = raycaster.intersectObject(configButtonMesh).length > 0;
    if (overButton && !configButtonHovered) {
      playHover();
    }
    configButtonHovered = overButton;
    container.style.cursor = draggingSlider ? 'grabbing' : overButton ? 'pointer' : 'default';
  }

  function onPointerUp() {
    if (draggingSlider) releasedAfterSliderDrag = true;
    draggingSlider = null;
  }

  function onPointerLeave() {
    if (draggingSlider) releasedAfterSliderDrag = true;
    draggingSlider = null;
  }

  function onClick(e) {
    if (e.button !== 0) return;
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, orthoCamera);
    if (configPanel.panelGroup.visible) {
      if (draggingSlider) return;
      if (releasedAfterSliderDrag) {
        releasedAfterSliderDrag = false;
        return;
      }
      const panelHits = raycaster.intersectObject(configPanel.mesh);
      if (panelHits.length > 0) {
        const action = configPanel.getActionAt(panelHits[0].point);
        if (action) {
          const id = typeof action === 'object' && action !== null ? action.id : action;
          if (id !== 'bgm_slider' && id !== 'se_slider') {
            playClick();
            handlePanelAction(action);
          }
        }
        return;
      }
      configPanel.hide();
      playClick();
      return;
    }
    // ノベルパネルクリックでスキップ
    const vnHits = raycaster.intersectObject(vnMesh);
    if (vnHits.length > 0) {
      playClick();
      if (textAnimation.isPlaying()) {
        textAnimation.skip();
      } else if (lineCompleted) {
        onSceneChange('fin');
      }
      return;
    }
    const hitConfig = raycaster.intersectObject(configButtonMesh).length > 0;
    if (hitConfig) {
      configPanel.syncDisplayModeFromDocument();
      configPanel.toggle();
      playClick();
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('click', onClick);

  function onResize() {
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const { width, height } = getFittedCanvasSize(cw, ch);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    updateConfigButton(width, height);
    configPanel.update(width, height);
    orthoCamera.left = -width / 2;
    orthoCamera.right = width / 2;
    orthoCamera.top = height / 2;
    orthoCamera.bottom = -height / 2;
    orthoCamera.updateProjectionMatrix();
    updateNovelLayout(width, height);
    // 背景サイズ更新
    parallaxBg.updateSize(width, height);
  }

  container.addEventListener('fullscreenchange', onResize);
  container.addEventListener('webkitfullscreenchange', onResize);
  window.addEventListener('resize', onResize);
  onResize();

  let animationId = null;
  let prevTimeMs = performance.now();
  function animate() {
    animationId = requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.max(0, (now - prevTimeMs) / 1000);
    prevTimeMs = now;
    textAnimation.update(dt);
    // 背景パララックス更新
    parallaxBg.update(dt);
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(uiScene, orthoCamera);
    renderer.autoClear = true;
  }

  return {
    start() {
      playBgm('Assets/sound/bgm/Elven-Sanctuary_loop.ogg', { loop: true });
      showLine(0);
      animate();
    },
    stop() {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    dispose() {
      this.stop();
      stopBgm();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('click', onClick);
      container.removeEventListener('fullscreenchange', onResize);
      container.removeEventListener('webkitfullscreenchange', onResize);
      window.removeEventListener('resize', onResize);
      // 破棄
      vnGeometry.dispose();
      if (vnMaterial.map) vnMaterial.map.dispose();
      parallaxBg.dispose();
      configButtonMesh.geometry.dispose();
      configButtonMesh.material.dispose();
      configPanel.panelGroup.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      renderer.dispose();
    }
  };
}



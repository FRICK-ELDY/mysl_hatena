import * as THREE from 'three';
import { getFittedCanvasSize, BASE_RESOLUTION_W, BASE_RESOLUTION_H, getScaledSize } from '../ui/screenScale.js';
import { createConfigPanel3d } from '../ui/configPanel3d.js';
import { createConfigButton3d } from '../ui/configButton3d.js';
import { playHover, playClick, playBgm, stopBgm, isBgmPlaying } from '../utility/sound.js';
import { UiGlowParticles } from '../utility/uiGlowParticles.js';

export async function createFinScene(canvas, container, onSceneChange, onConfigChange = null, initialConfigState = null) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(60, BASE_RESOLUTION_W / BASE_RESOLUTION_H, 0.1, 1000);
  camera.position.z = 5;

  const { width: initW, height: initH } = getFittedCanvasSize(container.clientWidth, container.clientHeight);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(initW, initH);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const { uiScene, orthoCamera, mesh: configButtonMesh, update: updateConfigButton } = await createConfigButton3d();

  const configPanel = createConfigPanel3d(container);
  uiScene.add(configPanel.panelGroup);
  if (configPanel.mesh) configPanel.mesh.renderOrder = 50;
  else configPanel.panelGroup.renderOrder = 50;

  const initialSize = getFittedCanvasSize(container.clientWidth, container.clientHeight);
  if (initialConfigState) {
    configPanel.setState(initialConfigState);
  }
  configPanel.update(initialSize.width, initialSize.height);

  // FIN テクスチャ（ヒント文言なし）
  function makeFinTexture(finLabel, baseW, baseH) {
    const canvas = document.createElement('canvas');
    canvas.width = baseW;
    canvas.height = baseH;
    const ctx = canvas.getContext('2d');
    // 背景は透明（枠なし）
    ctx.fillStyle = '#e8d5b7';
    ctx.font = 'bold 72px "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(finLabel, baseW / 2, baseH / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  const finGeom = new THREE.PlaneGeometry(1, 1);
  const finMat = new THREE.MeshBasicMaterial({
    map: makeFinTexture('Thank you for playing!', 1024, 320),
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
  const finMesh = new THREE.Mesh(finGeom, finMat);
  finMesh.renderOrder = 20;
  uiScene.add(finMesh);

  // パーティクル（UI空間）
  const particles = new UiGlowParticles({
    count: 220,
    size: 3.0,          // ピクセルサイズ（sizeAttenuation: false）
    sizeAttenuation: false,
    color: 0xe8d5b7,
    z: -0.02,
    baseSpeedY: 0.05,
    randomSpeedY: 0.08,
    randomSpeedX: 0.05,
    distributionRatioX: 0.85,
    additive: true
  });
  uiScene.add(particles.points);

  function updateLayout(width, height) {
    const size = getScaledSize(1024, 320, width, height);
    finMesh.scale.set(size.width, size.height, 1);
    finMesh.position.set(0, 0, 0);
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
      return;
    }
    // 設定パネル非表示時はどこでもタイトルへ
    playClick();
    onSceneChange('title');
  }

  function onPointerMove(e) {
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, orthoCamera);
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
    if (overButton && !configButtonHovered) playHover();
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
    // タイトルへ遷移
    playClick();
    onSceneChange('title');
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
    updateLayout(width, height);
    particles.seedForAspect(width / height);
    // ピクセル座標系に拡張
    particles.points.scale.set(width / 2, height / 2, 1);
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
    particles.update(dt);
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
      finGeom.dispose();
      if (finMat.map) finMat.map.dispose();
      configButtonMesh.geometry.dispose();
      configButtonMesh.material.dispose();
      particles.dispose();
      configPanel.panelGroup.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      renderer.dispose();
    }
  };
}




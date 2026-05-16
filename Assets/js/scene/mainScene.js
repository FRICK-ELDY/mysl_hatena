import * as THREE from 'three';
import { TextAnimation } from '../animate/textAnimation.js';
import { createParallaxBackground } from '../utility/parallaxBackground.js';
import { getFittedCanvasSize, BASE_RESOLUTION_W, BASE_RESOLUTION_H, getScaledSize, scaleValue } from '../ui/screenScale.js';
import { createConfigPanel3d } from '../ui/configPanel3d.js';
import { createConfigButton3d } from '../ui/configButton3d.js';
import { playHover, playClick, playBgm, stopBgm, isBgmPlaying, playMessageLoop, stopMessageLoop } from '../utility/sound.js';

/**
 * ゲームシーンを作成
 * @param {HTMLCanvasElement} canvas - レンダリング対象のキャンバス
 * @param {HTMLElement} container - ゲームコンテナ
 * @param {Function} onSceneChange - シーン変更コールバック (sceneName: string) => void
 * @param {Function} onConfigChange - コンフィグ変更コールバック (configState: Object) => void
 * @param {Object} initialConfigState - 初期コンフィグ状態
 * @returns {Promise<Object>} シーンオブジェクト
 */
export async function createGameScene(canvas, container, onSceneChange, onConfigChange = null, initialConfigState = null) {
  // シーン作成
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // カメラ作成
  const camera = new THREE.PerspectiveCamera(
    60,
    BASE_RESOLUTION_W / BASE_RESOLUTION_H,
    0.1,
    1000
  );
  camera.position.z = 5;

  // レンダラー作成
  const { width: initW, height: initH } = getFittedCanvasSize(container.clientWidth, container.clientHeight);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(initW, initH);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // （ボックスは使用しない）

  // コンフィグボタン（歯車）
  const {
    uiScene: configButtonUiScene,
    orthoCamera: configButtonOrthoCamera,
    mesh: configButtonMesh,
    update: updateConfigButton
  } = await createConfigButton3d();

  // タイトルと同じパララックス背景
  const parallaxBg = await createParallaxBackground({
    imageUrl: 'Assets/texture/title_bg.png',
    maxShiftPxY: 0
  });
  configButtonUiScene.add(parallaxBg.mesh);
  parallaxBg.mesh.position.set(0, 0, -0.5);

  // 設定パネル
  const configPanel = createConfigPanel3d(container);
  configButtonUiScene.add(configPanel.panelGroup);
  // 設定パネルを一番手前に
  if (configPanel.mesh) {
    configPanel.mesh.renderOrder = 50;
  } else {
    // 念のためグループにも設定（子には自動伝播しないが意図を明示）
    configPanel.panelGroup.renderOrder = 50;
  }
  const initialSize = getFittedCanvasSize(container.clientWidth, container.clientHeight);
  
  // 初期コンフィグ状態を設定
  if (initialConfigState) {
    configPanel.setState(initialConfigState);
  }
  
  configPanel.update(initialSize.width, initialSize.height);

  // ノベルUI（Three.js オルソ UI）
  const VN_BASE_WIDTH = 920;
  const VN_BASE_HEIGHT = 160;
  // 立ち絵レイアウト
  const CHAR_SIDE_MARGIN_PX = 24;
  const CHAR_TARGET_HEIGHT_RATE = 0.9; // 画面高に対する基準の高さ割合
  const CHAR_ACTIVE_SCALE = 1.0;
  const CHAR_INACTIVE_SCALE = 0.92;
  const NAME_SISTER = 'シスター';
  const NAME_PRIEST = '神父';
  const VN_MARGIN_BOTTOM_PX = 16;
  const VN_PADDING_L = 16;
  const VN_PADDING_R = 16;
  const VN_PADDING_T = 14;
  const VN_PADDING_B = 12;
  const VN_NAME_H = 26;
  const VN_BTN_W = 120;
  const VN_BTN_H = 36;
  const VN_BTN_GAP = 10;
  const VN_BTN_MARGIN_TOP = 10;

  // UIシーンにノベルパネルを追加
  const vnGroup = new THREE.Group();
  configButtonUiScene.add(vnGroup);

  // パネルメッシュ（1x1 をスケールでサイズ付け）
  const vnGeometry = new THREE.PlaneGeometry(1, 1);
  let vnMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
  const vnMesh = new THREE.Mesh(vnGeometry, vnMaterial);
  vnMesh.name = 'novelPanel3d';
  // ノベルは後ろ側に
  vnMesh.renderOrder = 10;
  vnGroup.add(vnMesh);

  // 選択肢ボタン（別メッシュ群）
  const vnChoicesGroup = new THREE.Group();
  vnChoicesGroup.visible = false;
  // 選択肢はノベルの一段前
  vnChoicesGroup.renderOrder = 11;
  configButtonUiScene.add(vnChoicesGroup);
  const choiceMeshes = [];

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

  function drawNovelTextureBase(name, body, baseW, baseH) {
    const canvas = document.createElement('canvas');
    canvas.width = baseW;
    canvas.height = baseH;
    const ctx = canvas.getContext('2d');

    // 背景
    ctx.fillStyle = 'rgba(26, 26, 46, 0.86)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 0, 0, baseW, baseH, 8);
    ctx.fill();
    ctx.stroke();

    // 名前
    ctx.font = 'bold 18px "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8d5b7';
    ctx.fillText(String(name || ''), VN_PADDING_L, VN_PADDING_T + VN_NAME_H / 2);

    // 本文（簡易折り返し）
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

  function redrawNovelTexture(name, body) {
    if (vnMaterial.map) {
      vnMaterial.map.dispose();
    }
    vnMaterial.map = drawNovelTextureBase(name, body, VN_BASE_WIDTH, VN_BASE_HEIGHT);
    vnMaterial.needsUpdate = true;
  }

  // 選択肢ボタン用テクスチャ
  function createChoiceTexture(label, baseW, baseH, active = false) {
    const canvas = document.createElement('canvas');
    canvas.width = baseW;
    canvas.height = baseH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = active ? 'rgba(232, 213, 183, 0.30)' : 'rgba(255, 255, 255, 0.08)';
    ctx.strokeStyle = active ? 'rgba(232, 213, 183, 0.7)' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 0, 0, baseW, baseH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = active ? '#e8d5b7' : '#e0e0e0';
    ctx.font = '16px "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(label || ''), baseW / 2, baseH / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function createChoiceMesh(label) {
    const geom = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: createChoiceTexture(label, VN_BTN_W, VN_BTN_H),
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData = { label };
    // ノベルより前、設定パネルより後にしたいが、設定パネルはさらに上に設定
    mesh.renderOrder = 11;
    return mesh;
  }

  function layoutChoiceMeshes(width, height, count) {
    // スケール後のサイズ
    const scaledBtn = getScaledSize(VN_BTN_W, VN_BTN_H, width, height);
    const gapPx = scaleValue(VN_BTN_GAP, width, height);

    const n = count;
    const totalH = n * scaledBtn.height + (n - 1) * gapPx;
    const startY = (totalH / 2) - (scaledBtn.height / 2); // 画面中央を基準に上下へ配置

    for (let i = 0; i < n; i++) {
      const mesh = choiceMeshes[i];
      if (!mesh) continue;
      mesh.scale.set(scaledBtn.width, scaledBtn.height, 1);
      // 画面中央に縦並び配置（x=0 中央）
      mesh.position.set(
        0,
        startY - i * (scaledBtn.height + gapPx),
        0
      );
    }
  }

  function updateNovelLayout(width, height) {
    // オルソカメラの座標系はピクセルに一致
    const scaled = getScaledSize(VN_BASE_WIDTH, VN_BASE_HEIGHT, width, height);
    vnMesh.scale.set(scaled.width, scaled.height, 1);
    const halfW = width / 2;
    const halfH = height / 2;
    const marginBottom = scaleValue(VN_MARGIN_BOTTOM_PX, width, height);
    // アンカー(0.5, 0) ピボット(0.5, 0)
    const anchorX = 0;
    const anchorY = -halfH + marginBottom;
    const pivotOffsetX = 0;              // (0.5 - 0.5) * width
    const pivotOffsetY = -(scaled.height / 2); // (0 - 0.5) * height
    vnMesh.position.set(anchorX - pivotOffsetX, anchorY - pivotOffsetY, 0);

    if (vnChoicesGroup.visible) {
      const count = choiceMeshes.filter(Boolean).length;
      layoutChoiceMeshes(width, height, count);
    }
  }

  // 立ち絵（神父=左, シスター=右）
  const charGeometry = new THREE.PlaneGeometry(1, 1);
  const textureLoader = new THREE.TextureLoader();
  const charLeft = {
    name: NAME_PRIEST,
    mesh: null,
    material: null,
    texture: null,
    imgW: 1,
    imgH: 1,
    scaleFactor: CHAR_INACTIVE_SCALE
  };
  const charRight = {
    name: NAME_SISTER,
    mesh: null,
    material: null,
    texture: null,
    imgW: 1,
    imgH: 1,
    scaleFactor: CHAR_INACTIVE_SCALE
  };

  async function loadCharacterTexture(url) {
    const tex = await new Promise((resolve, reject) => {
      textureLoader.load(url, (t) => resolve(t), undefined, (e) => reject(e));
    });
    // sRGB対応
    if ('colorSpace' in tex && THREE.SRGBColorSpace !== undefined) {
      tex.colorSpace = THREE.SRGBColorSpace;
    } else if ('encoding' in tex && THREE.sRGBEncoding !== undefined) {
      tex.encoding = THREE.sRGBEncoding;
    }
    tex.needsUpdate = true;
    return tex;
  }

  function createCharacterMesh(tex) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(charGeometry, mat);
    // ノベル（10）より後ろ、背景（-1000）より前
    mesh.renderOrder = 0;
    return { mesh, material: mat };
  }

  function layoutCharacters(width, height) {
    if (!charLeft.mesh || !charRight.mesh) return;
    const halfW = width / 2;
    const halfH = height / 2;
    const marginX = scaleValue(CHAR_SIDE_MARGIN_PX, width, height);

    const baseH = height * CHAR_TARGET_HEIGHT_RATE;

    // 左（神父）
    const leftH = baseH * charLeft.scaleFactor;
    const leftW = leftH * (charLeft.imgW / charLeft.imgH);
    charLeft.mesh.scale.set(leftW, leftH, 1);
    charLeft.mesh.position.set(-halfW + marginX + leftW / 2, -halfH + leftH / 2, -0.2);

    // 右（シスター）
    const rightH = baseH * charRight.scaleFactor;
    const rightW = rightH * (charRight.imgW / charRight.imgH);
    charRight.mesh.scale.set(rightW, rightH, 1);
    charRight.mesh.position.set(halfW - marginX - rightW / 2, -halfH + rightH / 2, -0.2);
  }

  function applyCharacterActiveState(target, isActive) {
    if (!target || !target.material) return;
    target.scaleFactor = isActive ? CHAR_ACTIVE_SCALE : CHAR_INACTIVE_SCALE;
    // 乗算色で暗くする
    target.material.color.set(isActive ? 0xffffff : 0x888888);
    target.material.needsUpdate = true;
  }

  function updateSpeakerEmphasis() {
    const speaker = vnSpeaker || '';
    const leftActive = speaker === charLeft.name;
    const rightActive = speaker === charRight.name;
    applyCharacterActiveState(charLeft, leftActive);
    applyCharacterActiveState(charRight, rightActive);
    const size = getFittedCanvasSize(container.clientWidth, container.clientHeight);
    layoutCharacters(size.width, size.height);
  }

  // スクリプト（台詞）
  const lines = [
    { name: NAME_PRIEST, text: '「シスター...シスター！！」' },
    { name: NAME_SISTER, text: '「...！」' },
    { name: NAME_PRIEST, text: '「シスター、私の説教はつまらないですか？」' },
    { name: NAME_SISTER, text: '「いえ、そんなことは...」' },
    { name: NAME_PRIEST, text: '「そうですか...では、シスター」' },
    { name: NAME_PRIEST, text: '「神様は何処に居ると思いますか？」' },
    { name: NAME_SISTER, text: '「...」' },
  ];
  let currentLineIndex = 0;
  let end3Timer = null;

  // テキストアニメーション
  let vnSpeaker = '';
  let vnBody = '';
  const textAnimation = new TextAnimation(
    (current) => {
      vnBody = current;
      redrawNovelTexture(vnSpeaker, vnBody);
    },
    () => { stopMessageLoop(); }
  );
  // 初期スピード反映
  if (initialConfigState && typeof initialConfigState.messageSpeed === 'number') {
    textAnimation.setSpeed(initialConfigState.messageSpeed);
  }

  function showLine(index) {
    const line = lines[index];
    if (!line) return;
    vnSpeaker = line.name || '';
    vnBody = '';
    redrawNovelTexture(vnSpeaker, vnBody);
    textAnimation.start(line.text || '');
    playMessageLoop();
    // 話者強調を更新
    updateSpeakerEmphasis();
  }

  function showChoices() {
    vnChoicesGroup.visible = true;
    // 初期の2つ
    if (!choiceMeshes[0]) choiceMeshes[0] = createChoiceMesh('END1');
    if (!choiceMeshes[1]) choiceMeshes[1] = createChoiceMesh('END2');
    // 追加
    if (!vnChoicesGroup.children.includes(choiceMeshes[0])) vnChoicesGroup.add(choiceMeshes[0]);
    if (!vnChoicesGroup.children.includes(choiceMeshes[1])) vnChoicesGroup.add(choiceMeshes[1]);
    // レイアウト反映
    const size = getFittedCanvasSize(container.clientWidth, container.clientHeight);
    layoutChoiceMeshes(size.width, size.height, 2);

    if (end3Timer) {
      clearTimeout(end3Timer);
      end3Timer = null;
    }
    end3Timer = setTimeout(() => {
      if (!choiceMeshes[2]) choiceMeshes[2] = createChoiceMesh('END3');
      if (!vnChoicesGroup.children.includes(choiceMeshes[2])) vnChoicesGroup.add(choiceMeshes[2]);
      const size2 = getFittedCanvasSize(container.clientWidth, container.clientHeight);
      layoutChoiceMeshes(size2.width, size2.height, 3);
    }, 5000);
  }

  function advanceNovel() {
    // 進行中はスキップ
    if (textAnimation.isPlaying()) {
      textAnimation.skip();
      return;
    }
    // 次へ
    if (currentLineIndex < lines.length - 1) {
      currentLineIndex += 1;
      showLine(currentLineIndex);
    } else {
      // 選択肢表示
      showChoices();
    }
  }

  // 最初の行を表示
  redrawNovelTexture('', '');
  showLine(currentLineIndex);

  // Raycaster
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function getPointerNDC(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  function isPointerOverConfigButton(clientX, clientY) {
    getPointerNDC(clientX, clientY);
    raycaster.setFromCamera(pointer, configButtonOrthoCamera);
    const hits = raycaster.intersectObject(configButtonMesh);
    return hits.length > 0;
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
  // 設定パネル内ボタンのホバー状態
  let configPanelHoveredButtonId = null;
  // 最後に操作したスライダーID（指を離したときに1回だけSEを鳴らす）
  let lastDraggedSliderId = null;

  function onPointerDown(e) {
    if (e.button !== 0) return;
    // 自動再生ブロック対策：未再生ならここでBGM再生を試みる
    if (!isBgmPlaying()) {
      playBgm('Assets/sound/bgm/Elven-Sanctuary_loop.ogg', { loop: true });
    }
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, configButtonOrthoCamera);

    if (configPanel.panelGroup.visible) {
      const panelHits = raycaster.intersectObject(configPanel.mesh);
      if (panelHits.length > 0) {
        const action = configPanel.getActionAt(panelHits[0].point);
        if (action) {
          const id = typeof action === 'object' && action !== null ? action.id : action;
          if (
            id === 'bgm_slider' ||
            id === 'se_slider' ||
            id === 'message_speed_slider'
          ) {
            draggingSlider = id;
            lastDraggedSliderId = id;
            handlePanelAction(action);
          }
        }
      }
    }
  }

  function onPointerMove(e) {
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, configButtonOrthoCamera);
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
          textAnimation.setSpeed(value);
        }
      }
    }

    const overButton = raycaster.intersectObject(configButtonMesh).length > 0;
    if (overButton && !configButtonHovered) {
      playHover();
    }
    configButtonHovered = overButton;
    const panelHits = configPanel.panelGroup.visible ? raycaster.intersectObject(configPanel.mesh) : [];
    const overPanel = panelHits.length > 0;

    // 設定パネル内のボタン（fullscreen / window / back_to_title）でホバーSE
    if (overPanel && !draggingSlider) {
      const act = configPanel.getActionAt(panelHits[0].point);
      const id = typeof act === 'object' && act !== null ? act.id : act;
      const isPanelButton = id === 'fullscreen' || id === 'window' || id === 'back_to_title';
      const nextHoverId = isPanelButton ? id : null;
      if (nextHoverId && nextHoverId !== configPanelHoveredButtonId) {
        playHover();
      }
      configPanelHoveredButtonId = nextHoverId;
    } else {
      configPanelHoveredButtonId = null;
    }
    // 選択肢ホバー判定
    let overChoice = false;
    if (vnChoicesGroup.visible && choiceMeshes.length > 0) {
      const hitChoice = raycaster.intersectObjects(choiceMeshes.filter(Boolean));
      overChoice = hitChoice.length > 0;
    }

    container.style.cursor = draggingSlider ? 'grabbing' : (overButton || overPanel || overChoice) ? 'pointer' : 'default';
  }

  function onPointerUp() {
    if (draggingSlider) releasedAfterSliderDrag = true;
    if (lastDraggedSliderId === 'se_slider') {
      playHover();
    }
    lastDraggedSliderId = null;
    draggingSlider = null;
  }

  function onPointerLeave() {
    if (draggingSlider) releasedAfterSliderDrag = true;
    if (lastDraggedSliderId === 'se_slider') {
      playHover();
    }
    lastDraggedSliderId = null;
    draggingSlider = null;
  }

  function onClick(e) {
    if (e.button !== 0) return;
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, configButtonOrthoCamera);

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

    // 選択肢クリック
    if (vnChoicesGroup.visible && choiceMeshes.length > 0) {
      const hitChoice = raycaster.intersectObjects(choiceMeshes.filter(Boolean));
      if (hitChoice.length > 0) {
        const label = hitChoice[0].object.userData?.label;
        playClick();
        if (label === 'END1') {
          onSceneChange('end1');
        } else if (label === 'END2') {
          onSceneChange('end2');
        } else if (label === 'END3') {
          onSceneChange('end3');
        } else {
          console.log('Selected:', label);
        }
        return;
      }
    }

    // ノベルパネルクリック（進行/スキップ）
    const vnHits = raycaster.intersectObject(vnMesh);
    if (vnHits.length > 0 && !vnChoicesGroup.visible) {
      playClick();
      advanceNovel();
      return;
    }

    if (isPointerOverConfigButton(e.clientX, e.clientY)) {
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

  // リサイズハンドラ
  function onResize() {
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const { width, height } = getFittedCanvasSize(cw, ch);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    updateConfigButton(width, height);
    configPanel.update(width, height);
    updateNovelLayout(width, height);
    // 背景サイズ更新
    parallaxBg.updateSize(width, height);
    // 立ち絵レイアウト更新
    layoutCharacters(width, height);
  }

  // ESC キーでフルスクリーン解除
  function onKeyDown(e) {
    if (e.key === 'Escape' && document.fullscreenElement) {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  }

  document.addEventListener('keydown', onKeyDown);
  container.addEventListener('fullscreenchange', onResize);
  container.addEventListener('webkitfullscreenchange', onResize);
  window.addEventListener('resize', onResize);

  // 立ち絵読み込み・作成
  try {
    charLeft.texture = await loadCharacterTexture('Assets/texture/chara_pleast.png');
    charLeft.imgW = charLeft.texture.image?.width || 1;
    charLeft.imgH = charLeft.texture.image?.height || 1;
    {
      const { mesh, material } = createCharacterMesh(charLeft.texture);
      charLeft.mesh = mesh;
      charLeft.material = material;
      configButtonUiScene.add(charLeft.mesh);
    }

    charRight.texture = await loadCharacterTexture('Assets/texture/chara_sister.png');
    charRight.imgW = charRight.texture.image?.width || 1;
    charRight.imgH = charRight.texture.image?.height || 1;
    {
      const { mesh, material } = createCharacterMesh(charRight.texture);
      charRight.mesh = mesh;
      charRight.material = material;
      configButtonUiScene.add(charRight.mesh);
    }
  } catch (e) {
    console.error('立ち絵の読み込みに失敗しました:', e);
  }

  // 初期話者に合わせて強調状態を反映
  updateSpeakerEmphasis();
  onResize();

  // アニメーションループ
  let animationId = null;
  let prevTimeMs = performance.now();
  function animate() {
    animationId = requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.max(0, (now - prevTimeMs) / 1000);
    prevTimeMs = now;

    // テキストアニメーション更新
    textAnimation.update(dt);
    // 背景パララックス更新
    parallaxBg.update(dt);

    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(configButtonUiScene, configButtonOrthoCamera);
    renderer.autoClear = true;
  }

  // シーン制御
  return {
    start() {
      // ゲームシーンBGMを再生
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
      // BGM停止
      stopBgm();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('fullscreenchange', onResize);
      container.removeEventListener('webkitfullscreenchange', onResize);
      window.removeEventListener('resize', onResize);
      // メモリ解放
      configButtonMesh.geometry.dispose();
      configButtonMesh.material.dispose();
      configPanel.panelGroup.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      renderer.dispose();
      // 背景破棄
      parallaxBg.dispose();
      if (end3Timer) {
        clearTimeout(end3Timer);
        end3Timer = null;
      }
      // ノベルUI解放
      if (vnMaterial.map) vnMaterial.map.dispose();
      vnGeometry.dispose();
      choiceMeshes.forEach(m => {
        if (!m) return;
        if (m.material.map) m.material.map.dispose();
        m.geometry.dispose();
        m.material.dispose();
      });
      stopMessageLoop();
      // 立ち絵解放
      if (charLeft.mesh) {
        if (charLeft.material?.map) charLeft.material.map.dispose();
        if (charLeft.mesh.geometry) charLeft.mesh.geometry.dispose();
        if (charLeft.material) charLeft.material.dispose();
      }
      if (charRight.mesh) {
        if (charRight.material?.map) charRight.material.map.dispose();
        if (charRight.mesh.geometry) charRight.mesh.geometry.dispose();
        if (charRight.material) charRight.material.dispose();
      }
    }
  };
}


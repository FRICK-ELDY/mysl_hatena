import * as THREE from 'three';
import { getFittedCanvasSize, BASE_RESOLUTION_W, BASE_RESOLUTION_H } from '../ui/screenScale.js';
import { createConfigPanel3d } from '../ui/configPanel3d.js';
import { createConfigButton3d } from '../ui/configButton3d.js';
import { UiGlowParticles } from '../utility/uiGlowParticles.js';
import { playHover, playClick, playBgm, stopBgm, isBgmPlaying } from '../utility/sound.js';
import { createParallaxBackground } from '../utility/parallaxBackground.js';
import { createGalleryPanel3d } from '../ui/galleryPanel.js';
import { createCreditPanel3d } from '../ui/creditPanel.js';

/**
 * タイトルシーンを作成
 * @param {HTMLCanvasElement} canvas - レンダリング対象のキャンバス
 * @param {HTMLElement} container - ゲームコンテナ
 * @param {Function} onSceneChange - シーン変更コールバック (sceneName: string) => void
 * @param {Function} onConfigChange - コンフィグ変更コールバック (configState: Object) => void
 * @param {Object} initialConfigState - 初期コンフィグ状態
 * @returns {Promise<Object>} シーンオブジェクト
 */
export async function createTitleScene(canvas, container, onSceneChange, onConfigChange = null, initialConfigState = null) {
  // シーン作成
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  // パララックス背景（ユーティリティから作成）
  const parallaxBg = await createParallaxBackground({
    imageUrl: 'Assets/texture/title_bg.png',
    maxShiftPxY: 0,
    usePixelOrtho: false
  });

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
  // 出力の色空間をSRGBに統一（バージョン差異に対応）
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace !== undefined) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else if ('outputEncoding' in renderer && THREE.sRGBEncoding !== undefined) {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  // トーンマッピングは無効（素材色を忠実表示）
  if ('toneMapping' in renderer && THREE.NoToneMapping !== undefined) {
    renderer.toneMapping = THREE.NoToneMapping;
  }

  // UI用のオルソカメラとシーン
  const uiScene = new THREE.Scene();
  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  orthoCamera.position.z = 5;

  // UIシーンに背景平面を追加（最背面へ配置）
  uiScene.add(parallaxBg.mesh);
  parallaxBg.mesh.position.set(0, 0, -0.5);

  // タイトルテキストメッシュ（後で左上アンカーに再配置）
  const titleGroup = new THREE.Group();
  // UIスケールに正しく追従させるため、1x1 を基準にして scale で実寸へ
  const titleGeometry = new THREE.PlaneGeometry(1, 1);
  const titleMaterial = new THREE.MeshBasicMaterial({ color: 0xe0e0e0 });
  const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
  titleMesh.position.set(0, 0, 0);
  titleGroup.add(titleMesh);

  // タイトルテキスト（簡易的な表示）
  const titleCanvas = document.createElement('canvas');
  titleCanvas.width = 512;
  titleCanvas.height = 170;
  const titleCtx = titleCanvas.getContext('2d');
  titleCtx.fillStyle = 'rgba(255, 255, 255, 1.0)';
  const titleText = '心の仮面';
  const maxTextWidth = titleCanvas.width * 0.9;
  let fontSize = 70;
  titleCtx.font = `bold ${fontSize}px "Yu Gothic", "Meiryo", sans-serif`;
  while (titleCtx.measureText(titleText).width > maxTextWidth && fontSize > 24) {
    fontSize -= 2;
    titleCtx.font = `bold ${fontSize}px "Yu Gothic", "Meiryo", sans-serif`;
  }
  titleCtx.textAlign = 'center';
  titleCtx.textBaseline = 'middle';
  // アウトライン（先にストローク、上から塗り）
  const outlineWidth = Math.max(2, Math.floor(fontSize * 0.12));
  titleCtx.lineJoin = 'round';
  titleCtx.miterLimit = 2;
  titleCtx.lineWidth = outlineWidth;
  titleCtx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  // タイトルはやや上寄せに配置
  const titleY = Math.floor(titleCanvas.height * 0.45);
  titleCtx.strokeText(titleText, titleCanvas.width / 2, titleY);
  // 本文塗り
  titleCtx.fillText(titleText, titleCanvas.width / 2, titleY);

  // サブタイトル「ショートノベルゲーム」
  const subtitleText = 'ショートノベルゲーム in GGJ 2026';
  let subFontSize = Math.max(16, Math.floor(fontSize * 0.34));
  titleCtx.font = `bold ${subFontSize}px "Yu Gothic", "Meiryo", sans-serif`;
  while (titleCtx.measureText(subtitleText).width > maxTextWidth && subFontSize > 12) {
    subFontSize -= 1;
    titleCtx.font = `bold ${subFontSize}px "Yu Gothic", "Meiryo", sans-serif`;
  }
  const subtitleY = Math.floor(titleCanvas.height * 0.78);
  // アウトライン（先にストローク、上から塗り）
  titleCtx.lineJoin = 'round';
  titleCtx.miterLimit = 2;
  titleCtx.lineWidth = Math.max(1, Math.floor(subFontSize * 0.12));
  titleCtx.strokeStyle = 'rgba(0, 0, 0, 1.0)';
  titleCtx.strokeText(subtitleText, titleCanvas.width / 2, subtitleY);
  // 塗り
  titleCtx.fillStyle = '#e0e0e0';
  titleCtx.fillText(subtitleText, titleCanvas.width / 2, subtitleY);
  
  const titleTexture = new THREE.CanvasTexture(titleCanvas);
  if ('colorSpace' in titleTexture && THREE.SRGBColorSpace !== undefined) {
    titleTexture.colorSpace = THREE.SRGBColorSpace;
  } else if ('encoding' in titleTexture && THREE.sRGBEncoding !== undefined) {
    titleTexture.encoding = THREE.sRGBEncoding;
  }
  titleTexture.needsUpdate = true;
  titleMaterial.map = titleTexture;
  titleMaterial.transparent = true;

  uiScene.add(titleGroup);

  // 神聖な雰囲気用の光粒子（汎用クラスを使用）
  const uiParticles = new UiGlowParticles({
    count: 140,
    size: 3,
    color: 0xf7f2c6,
    z: -0.02
  });
  uiScene.add(uiParticles.points);

  // タイトル（Unity風アンカー＆ピボット設定）
  // アンカー: 0=左/下, 1=右/上（Orthographic空間を[左=-aspect,右=aspect],[下=-1,上=1]に正規化）
  const TITLE_ANCHOR = { x: 0, y: 1 }; // 左上
  // ピボット: 0=左/下, 1=右/上（メッシュ内の基準点）
  const TITLE_PIVOT = { x: 0, y: 1 };  // 左上
  // ベース解像度基準のサイズ/余白（px）
  const BASE_TITLE_WIDTH_PX = 360;
  const BASE_TITLE_MARGIN_LEFT = -30;
  const BASE_TITLE_MARGIN_TOP = 0;

  // タイトル用 天使画像（オルソUIシーンに配置）
  const angelGeometry = new THREE.PlaneGeometry(1, 1);
  const angelTexture = await new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      'Assets/texture/title_angel.png',
      (tex) => resolve(tex),
      undefined,
      (err) => reject(err)
    );
  });
  angelTexture.flipY = true;
  // 天使画像テクスチャの色空間をSRGBに設定（バージョン差異に対応）
  if ('colorSpace' in angelTexture && THREE.SRGBColorSpace !== undefined) {
    angelTexture.colorSpace = THREE.SRGBColorSpace;
  } else if ('encoding' in angelTexture && THREE.sRGBEncoding !== undefined) {
    angelTexture.encoding = THREE.sRGBEncoding;
  }
  angelTexture.needsUpdate = true;
  const angelMaterial = new THREE.MeshBasicMaterial({
    map: angelTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const angelMesh = new THREE.Mesh(angelGeometry, angelMaterial);
  angelMesh.name = 'titleAngel';
  angelMesh.position.set(0, 0, -0.01); // タイトル文字の背面に薄く
  uiScene.add(angelMesh);

  function updateTitleTransform(canvasWidth, canvasHeight) {
    if (!titleTexture || !titleTexture.image) return;

    const aspect = canvasWidth / canvasHeight;
    const orthoHeight = 2;
    const orthoWidth = 2 * aspect;

    const pixelToOrthoX = orthoWidth / canvasWidth;
    const pixelToOrthoY = orthoHeight / canvasHeight;

    // ベース解像度基準のスケール係数
    const scaleRatio = canvasHeight / BASE_RESOLUTION_H;

    // タイトルのサイズ（ピクセル）: 幅を基準にテクスチャ比で高さ決定
    const imgW = titleTexture.image.width || 1;
    const imgH = titleTexture.image.height || 1;
    const scaledTitleWidthPx = BASE_TITLE_WIDTH_PX * scaleRatio;
    const scaledTitleHeightPx = scaledTitleWidthPx * (imgH / imgW);

    // オルソ座標へ変換
    const titleWidthOrtho = scaledTitleWidthPx * pixelToOrthoX;
    const titleHeightOrtho = scaledTitleHeightPx * pixelToOrthoY;
    titleMesh.scale.set(titleWidthOrtho, titleHeightOrtho, 1);

    // アンカー位置（正規化 0..1 を Ortho 座標へ）
    const anchorX = -aspect + (2 * aspect) * TITLE_ANCHOR.x;
    const anchorY = -1 + 2 * TITLE_ANCHOR.y;

    // マージン（px → Ortho）
    const marginLeftOrtho = (BASE_TITLE_MARGIN_LEFT * scaleRatio) * pixelToOrthoX;
    const marginTopOrtho = (BASE_TITLE_MARGIN_TOP * scaleRatio) * pixelToOrthoY;

    // ピボットによるオフセット（center基準 → 任意ピボットへ）
    const pivotOffsetX = (0.5 - TITLE_PIVOT.x) * titleWidthOrtho;
    const pivotOffsetY = (0.5 - TITLE_PIVOT.y) * titleHeightOrtho;

    // Unity風: アンカー + マージン + ピボットオフセット
    const groupX = anchorX + marginLeftOrtho + pivotOffsetX;
    const groupY = anchorY - marginTopOrtho + pivotOffsetY;
    titleGroup.position.set(groupX, groupY, 0);
  }

  function updateAngelTransform(canvasWidth, canvasHeight) {
    if (!angelTexture || !angelTexture.image) return;

    const aspect = canvasWidth / canvasHeight;
    const orthoHeight = 2;
    const orthoWidth = 2 * aspect;

    const pixelToOrthoX = orthoWidth / canvasWidth;
    const pixelToOrthoY = orthoHeight / canvasHeight;

    const imgW = angelTexture.image.width || 1;
    const imgH = angelTexture.image.height || 1;
    // 画像の高さをキャンバスの高さに合わせる（フルフィット）
    const scaledAngelHeightPx = canvasHeight;
    const scaledAngelWidthPx = scaledAngelHeightPx * (imgW / imgH);

    const angelWidthOrtho = scaledAngelWidthPx * pixelToOrthoX;
    const angelHeightOrtho = scaledAngelHeightPx * pixelToOrthoY;

    angelMesh.scale.set(angelWidthOrtho, angelHeightOrtho, 1);
  }

  // 背景サイズ更新（パララックスユーティリティへ移譲）
  function updateBackgroundTransform(canvasWidth, canvasHeight) {
    parallaxBg.updateSize(canvasWidth, canvasHeight);
  }

  // コンフィグボタン（歯車）
  const {
    uiScene: configButtonUiScene,
    orthoCamera: configButtonOrthoCamera,
    mesh: configButtonMesh,
    update: updateConfigButton
  } = await createConfigButton3d();

  // 設定パネル
  const configPanel = createConfigPanel3d(container);
  configButtonUiScene.add(configPanel.panelGroup);
  const initialSize = getFittedCanvasSize(container.clientWidth, container.clientHeight);
  
  // 初期コンフィグ状態を設定
  if (initialConfigState) {
    configPanel.setState(initialConfigState);
  }
  
  configPanel.update(initialSize.width, initialSize.height);

  // ギャラリーパネル
  const galleryPanel = createGalleryPanel3d();
  configButtonUiScene.add(galleryPanel.panelGroup);
  galleryPanel.update(initialSize.width, initialSize.height);

  // クレジットパネル
  const creditPanel = createCreditPanel3d();
  configButtonUiScene.add(creditPanel.panelGroup);
  creditPanel.update(initialSize.width, initialSize.height);

  // ボタン定義（右下に配置 - Unityスタイルのアンカー・ピボット）
  const buttons = [
    { id: 'start', label: 'スタート', action: () => onSceneChange('intro') },
    { id: 'stage_select', label: 'ギャラリー', action: () => showModal('stage_select') },
    { id: 'credit', label: 'クレジット', action: () => showModal('credit') }
  ];

  // ベース解像度でのボタンサイズ（ピクセル）
  const BASE_BUTTON_WIDTH = 200;
  const BASE_BUTTON_HEIGHT = 50;
  const BASE_BUTTON_GAP = 12;
  const BASE_MARGIN_RIGHT = 20;
  const BASE_MARGIN_BOTTOM = 20;

  const buttonMeshes = [];
  const buttonTextures = [];
  const buttonGroup = new THREE.Group();
  buttonGroup.name = 'titleButtonGroup';

  buttons.forEach((btn, index) => {
    const buttonCanvas = document.createElement('canvas');
    buttonCanvas.width = BASE_BUTTON_WIDTH;
    buttonCanvas.height = BASE_BUTTON_HEIGHT;
    const ctx = buttonCanvas.getContext('2d');

    // ボタン背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, buttonCanvas.width, buttonCanvas.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, buttonCanvas.width, buttonCanvas.height);

    // ボタンテキスト
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 20px "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, buttonCanvas.width / 2, buttonCanvas.height / 2);

    const texture = new THREE.CanvasTexture(buttonCanvas);
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `titleButton_${btn.id}`;

    // ローカル座標で下から順に配置（ピボット：中心）
    const localY = (BASE_BUTTON_HEIGHT / 2) + (BASE_BUTTON_HEIGHT + BASE_BUTTON_GAP) * (buttons.length - 1 - index);
    mesh.position.set(0, localY, 0);
    mesh.userData = { id: btn.id, action: btn.action };

    buttonGroup.add(mesh);
    buttonMeshes.push(mesh);
    buttonTextures.push({ canvas: buttonCanvas, texture, label: btn.label });
  });

  uiScene.add(buttonGroup);

  // ボタンのホバー状態を保持（エッジ検知でSEを鳴らす）
  const buttonHoverStates = [];
  // 歯車ボタンのホバー状態
  let configButtonHovered = false;
  // 設定パネル内ボタンのホバー状態
  let configPanelHoveredButtonId = null;
  // 最後に操作したスライダーID（指を離したときに1回だけSEを鳴らす）
  let lastDraggedSliderId = null;

  // ボタングループの位置とスケールを更新する関数（アンカー：右下）
  function updateButtonGroupTransform(canvasWidth, canvasHeight) {
    const aspect = canvasWidth / canvasHeight;
    
    // ベース解像度に対する現在の解像度の比率
    const scaleRatio = canvasHeight / BASE_RESOLUTION_H;
    
    // スケール適用後のボタンサイズ（ピクセル単位）
    const scaledButtonWidth = BASE_BUTTON_WIDTH * scaleRatio;
    const scaledButtonHeight = BASE_BUTTON_HEIGHT * scaleRatio;
    const scaledButtonGap = BASE_BUTTON_GAP * scaleRatio;
    const scaledMarginRight = BASE_MARGIN_RIGHT * scaleRatio;
    const scaledMarginBottom = BASE_MARGIN_BOTTOM * scaleRatio;
    
    // オルソカメラの高さは2（-1から1）、幅は2*aspect
    const orthoHeight = 2;
    const orthoWidth = 2 * aspect;
    
    // ピクセルからオルソ座標への変換係数
    const pixelToOrthoX = orthoWidth / canvasWidth;
    const pixelToOrthoY = orthoHeight / canvasHeight;
    
    // ボタンのオルソ座標でのサイズ
    const buttonWidthOrtho = scaledButtonWidth * pixelToOrthoX;
    const buttonHeightOrtho = scaledButtonHeight * pixelToOrthoY;
    const buttonGapOrtho = scaledButtonGap * pixelToOrthoY;
    
    // アンカー：右下（オルソカメラの座標系）
    const anchorX = aspect;  // 右端
    const anchorY = -1;      // 下端
    
    // オフセット（右下からの距離）
    const marginRightOrtho = scaledMarginRight * pixelToOrthoX;
    const marginBottomOrtho = scaledMarginBottom * pixelToOrthoY;
    
    // グループ全体の高さ
    const totalHeight = buttonHeightOrtho * buttons.length + buttonGapOrtho * (buttons.length - 1);
    
    // グループの位置（右下基準、グループの中心がピボット）
    const groupX = anchorX - marginRightOrtho - buttonWidthOrtho / 2;
    const groupY = anchorY + marginBottomOrtho + totalHeight / 2;
    
    buttonGroup.position.set(groupX, groupY, 0);
    
    // 各ボタンのスケールとローカル位置を設定
    buttonMeshes.forEach((mesh, index) => {
      mesh.scale.set(buttonWidthOrtho, buttonHeightOrtho, 1);
      // ローカルY座標（グループの中心を基準に、下から順に配置）
      const localY = -(totalHeight / 2) + buttonHeightOrtho / 2 + (buttonHeightOrtho + buttonGapOrtho) * (buttons.length - 1 - index);
      mesh.position.set(0, localY, 0);
    });
  }

  // モーダル表示関数
  function showModal(modalId) {
    if (modalId === 'credit') {
      galleryPanel.hide();
      configPanel.hide();
      creditPanel.show();
      return;
    } else if (modalId === 'stage_select') {
      creditPanel.hide();
      configPanel.hide();
      galleryPanel.setTab('story');
      galleryPanel.show();
      return;
    }
    console.log(`モーダル表示: ${modalId}`);
    alert(`${modalId} モーダル（実装予定）`);
  }

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
      // タイトル画面では既にタイトルなので、パネルを閉じるだけ
      configPanel.hide();
    }
  }

  let draggingSlider = null;
  let releasedAfterSliderDrag = false;

  // ボタンホバー効果
  function updateButtonHover(clientX, clientY) {
    getPointerNDC(clientX, clientY);
    raycaster.setFromCamera(pointer, orthoCamera);
    const hits = raycaster.intersectObjects(buttonMeshes);

    buttonMeshes.forEach((mesh, index) => {
      const isHovered = hits.some(hit => hit.object === mesh);
      const wasHovered = buttonHoverStates[index] === true;
      if (!wasHovered && isHovered) {
        playHover();
      }
      const { canvas, texture, label } = buttonTextures[index];
      const ctx = canvas.getContext('2d');

      // 再描画
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        container.style.cursor = 'pointer';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = isHovered ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#e0e0e0';
      ctx.font = 'bold 20px "Yu Gothic", "Meiryo", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, canvas.width / 2, canvas.height / 2);

      texture.needsUpdate = true;

      // 状態を更新
      buttonHoverStates[index] = isHovered;
    });

    if (hits.length === 0) {
      container.style.cursor = 'default';
    }
  }

  // イベントリスナー
  function onPointerDown(e) {
    if (e.button !== 0) return;
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, configButtonOrthoCamera);

    // 自動再生ブロック対策：未再生ならここで再生を試みる
    if (!isBgmPlaying()) {
      playBgm('Assets/sound/bgm/main-theme01.mp3', { loop: true });
    }

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
    // パララックスの目標を更新
    parallaxBg.setPointerNdc(pointer.x, pointer.y);
    raycaster.setFromCamera(pointer, configButtonOrthoCamera);

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

    const overConfigButton = raycaster.intersectObject(configButtonMesh).length > 0;
    if (overConfigButton && !configButtonHovered) {
      playHover();
    }
    configButtonHovered = overConfigButton;
    const creditHits = creditPanel.panelGroup.visible ? raycaster.intersectObject(creditPanel.mesh) : [];
    const overCredit = creditHits.length > 0;
    const galleryHits = galleryPanel.panelGroup.visible ? raycaster.intersectObject(galleryPanel.mesh) : [];
    const overGallery = galleryHits.length > 0;
    const panelHits = configPanel.panelGroup.visible ? raycaster.intersectObject(configPanel.mesh) : [];
    const overPanel = panelHits.length > 0 || overCredit || overGallery;

    // 設定パネル内のボタン（fullscreen / window / back_to_title）でホバーSE
    if (!draggingSlider && panelHits.length > 0) {
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

    if (!draggingSlider && !overConfigButton && !overPanel) {
      // タイトルボタンのホバー処理
      raycaster.setFromCamera(pointer, orthoCamera);
      updateButtonHover(e.clientX, e.clientY);
    } else {
      container.style.cursor = draggingSlider ? 'grabbing' : overConfigButton || overPanel ? 'pointer' : 'default';
    }
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
    // 中央へ戻す
    parallaxBg.center();
  }

  function onClick(e) {
    if (e.button !== 0) return;
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, configButtonOrthoCamera);

    // ギャラリーパネルが開いている場合
    if (galleryPanel.panelGroup.visible) {
      const panelHits = raycaster.intersectObject(galleryPanel.mesh);
      if (panelHits.length > 0) {
        const action = galleryPanel.getActionAt(panelHits[0].point);
        if (action === 'close') {
          galleryPanel.hide();
          playClick();
          return;
        } else if (action === 'tab_story') {
          galleryPanel.setTab('story');
          playClick();
          return;
        } else if (action === 'tab_images') {
          galleryPanel.setTab('images');
          playClick();
          return;
        } else if (action === 'row_intro_btn') {
          playClick();
          galleryPanel.hide();
          onSceneChange('intro');
          return;
        } else if (action === 'row_main_btn') {
          playClick();
          galleryPanel.hide();
          onSceneChange('game');
          return;
        } else if (action === 'row_end1_btn') {
          playClick();
          galleryPanel.hide();
          onSceneChange('end1');
          return;
        } else if (action === 'row_end2_btn') {
          playClick();
          galleryPanel.hide();
          onSceneChange('end2');
          return;
        } else if (action === 'row_end3_btn') {
          playClick();
          galleryPanel.hide();
          onSceneChange('end3');
          return;
        }
        return;
      }
      // パネル外クリックで閉じる
      galleryPanel.hide();
      playClick();
      return;
    }

    // クレジットパネルが開いている場合
    if (creditPanel.panelGroup.visible) {
      const creditHits = raycaster.intersectObject(creditPanel.mesh);
      if (creditHits.length > 0) {
        const action = creditPanel.getActionAt(creditHits[0].point);
        if (action === 'close') {
          creditPanel.hide();
          playClick();
          return;
        }
        // パネル内の他領域クリックは何もしない
        return;
      }
      // パネル外クリックで閉じる
      creditPanel.hide();
      playClick();
      return;
    }

    // コンフィグパネルが開いている場合
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
          if (id !== 'bgm_slider' && id !== 'se_slider' && id !== 'message_speed_slider') {
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

    // コンフィグボタン（歯車）クリック
    if (isPointerOverConfigButton(e.clientX, e.clientY)) {
      configPanel.syncDisplayModeFromDocument();
      configPanel.toggle();
      playClick();
      return;
    }

    // タイトル画面のボタンクリック
    raycaster.setFromCamera(pointer, orthoCamera);
    const hits = raycaster.intersectObjects(buttonMeshes);

    if (hits.length > 0) {
      const button = hits[0].object.userData;
      if (button.action) {
        playClick();
        button.action();
        return;
      }
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

    // オルソカメラのアスペクト比調整
    const aspect = width / height;
    orthoCamera.left = -aspect;
    orthoCamera.right = aspect;
    orthoCamera.updateProjectionMatrix();

    // 粒子（UI空間）の再配置
    uiParticles.seedForAspect(aspect);

    // 背景のサイズ更新
    updateBackgroundTransform(width, height);

    // ボタングループの位置・スケール更新
    updateButtonGroupTransform(width, height);
    // タイトル（左上）の位置・スケール更新
    updateTitleTransform(width, height);
    // 天使画像のスケール更新
    updateAngelTransform(width, height);

    // コンフィグボタンとパネルの更新
    updateConfigButton(width, height);
    configPanel.update(width, height);
    creditPanel.update(width, height);
    galleryPanel.update(width, height);
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
  
  // 初期化
  onResize();

  // アニメーションループ
  let animationId = null;
  const clock = new THREE.Clock();
  function animate() {
    animationId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    uiParticles.update(dt);

    // 背景パララックス更新
    parallaxBg.update(dt);

    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(uiScene, orthoCamera);
    renderer.clearDepth();
    renderer.render(configButtonUiScene, configButtonOrthoCamera);
    renderer.autoClear = true;
  }

  // シーン制御
  return {
    start() {
      // タイトルBGM再生（自動再生がブロックされる場合は pointerdown で再試行）
      playBgm('Assets/sound/bgm/main-theme01.mp3', { loop: true });
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
      // タイトルBGM停止
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
      titleTexture.dispose();
      titleMaterial.dispose();
      titleGeometry.dispose();
      buttonMeshes.forEach(mesh => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      buttonTextures.forEach(({ texture }) => texture.dispose());
      configButtonMesh.geometry.dispose();
      configButtonMesh.material.dispose();
      // タイトル天使画像のリソース解放
      angelGeometry.dispose();
      angelMaterial.dispose();
      angelTexture.dispose();
      // 背景のリソース解放
      parallaxBg.dispose();
      // 粒子のリソース解放
      uiParticles.dispose();
      configPanel.panelGroup.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      renderer.dispose();
    }
  };
}

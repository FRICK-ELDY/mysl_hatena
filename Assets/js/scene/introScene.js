import * as THREE from 'three';
import { getFittedCanvasSize, BASE_RESOLUTION_W, BASE_RESOLUTION_H } from '../ui/screenScale.js';
import { TextAnimation } from '../animate/textAnimation.js';
import { playBgm, stopBgm, isBgmPlaying, playClick, playHover, setSeVolumePercent, setBgmVolumePercent, playMessageLoop, stopMessageLoop } from '../utility/sound.js';
import { createConfigButton3d } from '../ui/configButton3d.js';
import { createConfigPanel3d } from '../ui/configPanel3d.js';

/**
 * イントロシーンを作成
 * @param {HTMLCanvasElement} canvas - レンダリング対象のキャンバス
 * @param {HTMLElement} container - ゲームコンテナ
 * @param {Function} onSceneChange - シーン変更コールバック (sceneName: string) => void
 * @param {Object} configState - コンフィグ設定状態
 * @returns {Object} シーンオブジェクト
 */
export function createIntroScene(canvas, container, onSceneChange, configState = null) {
  // シーン作成
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

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

  // UI用のオルソカメラとシーン
  const uiScene = new THREE.Scene();
  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  orthoCamera.position.z = 5;

  // 設定ボタン（歯車） - 右上に表示
  let configButtonUiScene = null;
  let configButtonOrthoCamera = null;
  let configButtonMesh = null;
  let updateConfigButton = null;
  // 設定パネル（非表示で用意しておく）
  const configPanel = createConfigPanel3d(container);
  // 初期状態を反映（音量・メッセージ速度・表示モード）
  if (configState) {
    configPanel.setState(configState);
    if (typeof configState.bgmVolume === 'number') setBgmVolumePercent(configState.bgmVolume);
    if (typeof configState.seVolume === 'number') setSeVolumePercent(configState.seVolume);
  }
  createConfigButton3d().then(({ uiScene: btnUiScene, orthoCamera: btnOrthoCamera, mesh: btnMesh, update }) => {
    configButtonUiScene = btnUiScene;
    configButtonOrthoCamera = btnOrthoCamera;
    configButtonMesh = btnMesh;
    updateConfigButton = update;
    // 歯車ボタンのUIシーンにパネルをぶら下げる（同じカメラ空間で描画）
    configButtonUiScene.add(configPanel.panelGroup);
    const { width, height } = getFittedCanvasSize(container.clientWidth, container.clientHeight);
    updateConfigButton(width, height);
    configPanel.update(width, height);
  });

  // 歯車クリック判定用 Raycaster
  const gearRaycaster = new THREE.Raycaster();
  const gearPointer = new THREE.Vector2();
  function getGearPointerNDC(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    gearPointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    gearPointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }
  let gearHovered = false;
  let panelHoveredButtonId = null;
  let draggingSlider = null;
  let releasedAfterSliderDrag = false;

  // テキスト表示用のメッシュ
  const textGroup = new THREE.Group();
  const textGeometry = new THREE.PlaneGeometry(3.2, 0.4);
  const textMaterial = new THREE.MeshBasicMaterial({ color: 0xe0e0e0, transparent: true, depthTest: false, depthWrite: false });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(0, 0, 0);
  textGroup.add(textMesh);

  uiScene.add(textGroup);

  // パーティクル（UIレイヤー）
  const PARTICLE_COUNT = 120;
  const particleBase = new Float32Array(PARTICLE_COUNT * 2); // 正規化座標ベース[-1,1]（x,y）
  const particleSpeed = new Float32Array(PARTICLE_COUNT);    // y方向の速度（正規化空間/秒）
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3); // 実座標（x, y, z）
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.2,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.position.set(0, 0, -0.02);
  uiScene.add(particles);

  // パーティクル初期化
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particleBase[i * 2 + 0] = (Math.random() * 2 - 1);        // x in [-1,1]
    particleBase[i * 2 + 1] = (Math.random() * 2 - 1);        // y in [-1,1]
    particleSpeed[i] = 0.08 + Math.random() * 0.12;           // 0.08〜0.2
  }

  // （設定パネルは使用せず、歯車ボタンのみ表示）

  let currentAspect = BASE_RESOLUTION_W / BASE_RESOLUTION_H;
  function updateParticles(dt, aspect) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // 位置更新（正規化Yを上方向へ移動）
      particleBase[i * 2 + 1] += particleSpeed[i] * dt;
      if (particleBase[i * 2 + 1] > 1.1) {
        particleBase[i * 2 + 1] = -1.1;
        // 出現時にわずかにXをランダムへ
        particleBase[i * 2 + 0] = (Math.random() * 2 - 1);
      }
      // 実座標へ反映（xはアスペクトを掛ける）
      particlePositions[i * 3 + 0] = particleBase[i * 2 + 0] * aspect;
      particlePositions[i * 3 + 1] = particleBase[i * 2 + 1];
      particlePositions[i * 3 + 2] = -0.02;
    }
    particleGeometry.attributes.position.needsUpdate = true;
  }

  // 現在のステージ（0: Global Game Jam 2026, 1: お題は Mask, 2: 始まるよ～）
  let currentStage = 0;
  let currentFontSize = 48;

  // テキストを描画する関数（現在表示中の文字列を描画）
  function drawText(text, fontSize) {
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 2048;
    textCanvas.height = 256;
    const ctx = textCanvas.getContext('2d');

    // 背景は透明（枠を消す）
    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = '#e0e0e0';

    // フォントは固定サイズ（縮小・折返しなし）
    ctx.font = `bold ${fontSize}px "Yu Gothic", "Meiryo", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text ?? ''), Math.floor(textCanvas.width / 2), Math.floor(textCanvas.height / 2));
    
    if (textMaterial.map) {
      textMaterial.map.dispose();
    }
    const texture = new THREE.CanvasTexture(textCanvas);
    textMaterial.map = texture;
    textMaterial.transparent = true;
    textMaterial.needsUpdate = true;
  }

  // テキストアニメーションの初期化
  const textAnimation = new TextAnimation(
    // onUpdate: テキスト更新時
    (currentText) => {
      drawText(currentText, currentFontSize);
    },
    // onComplete: アニメーション完了時
    () => {
      // テキスト進行用SEを停止
      stopMessageLoop();
    }
  );

  // コンフィグからメッセージスピードを取得して設定
  console.log('Intro scene received config:', configState);
  if (configState && typeof configState.messageSpeed === 'number') {
    console.log('Setting message speed:', configState.messageSpeed);
    textAnimation.setSpeed(configState.messageSpeed);
  } else {
    console.log('Using default message speed');
  }

  // テキストアニメーションを開始する関数
  function startTextAnimation(text, fontSize) {
    currentFontSize = fontSize;
    // テキスト進行用SEを再生（前回を念のため停止してから）
    stopMessageLoop();
    playMessageLoop('Assets/sound/se/message_2.mp3', { loop: true });
    textAnimation.start(text);
  }

  // 初期テキストアニメーションを開始
  startTextAnimation('神様何て、この世界の何処にもいない...', 48);

  // クリックイベント
  function onClick(e) {
    // パネルが開いている場合、先にパネル内クリックを処理
    if (configPanel.panelGroup.visible && configButtonOrthoCamera && configPanel.mesh) {
      getGearPointerNDC(e.clientX, e.clientY);
      gearRaycaster.setFromCamera(gearPointer, configButtonOrthoCamera);
      const panelHits = gearRaycaster.intersectObject(configPanel.mesh);
      if (panelHits.length > 0) {
        if (draggingSlider) return;
        if (releasedAfterSliderDrag) {
          releasedAfterSliderDrag = false;
          return;
        }
        const action = configPanel.getActionAt(panelHits[0].point);
        if (action) {
          const id = typeof action === 'object' && action !== null ? action.id : action;
          if (id !== 'bgm_slider' && id !== 'se_slider' && id !== 'message_speed_slider') {
            playClick?.();
            // 操作反映
            if (id === 'back_to_title') {
              onSceneChange('title');
              return;
            }
            if (id === 'fullscreen' || id === 'window') {
              configPanel.setState({ displayMode: id === 'fullscreen' ? 'fullscreen' : 'window' });
              configPanel.applyDisplayMode(container);
              try { window?.sceneManager?.updateConfigState?.({ displayMode: id === 'fullscreen' ? 'fullscreen' : 'window' }); } catch {}
            }
          }
        }
        return;
      }
    }

    // クリック時にBGM未再生なら再生（自動再生ブロック解除）
    if (!isBgmPlaying()) {
      playBgm('Assets/sound/bgm/white-noise.mp3', { loop: true });
    }

    // まず設定ボタンのクリックを先に処理（トグル表示 + クリックSE）
    if (configButtonMesh && configButtonOrthoCamera) {
      getGearPointerNDC(e.clientX, e.clientY);
      gearRaycaster.setFromCamera(gearPointer, configButtonOrthoCamera);
      const hits = gearRaycaster.intersectObject(configButtonMesh);
      if (hits.length > 0) {
        // 表示切替
        configPanel.syncDisplayModeFromDocument?.();
        configPanel.toggle();
        playClick?.();
        return;
      }
    }

    // アニメーション中はクリックを無視
    if (textAnimation.isPlaying()) return;

    // 自動再生ブロック対策：未再生ならここで再生を試みる
    if (!isBgmPlaying()) {
      playBgm('Assets/sound/bgm/white-noise.mp3', { loop: true });
    }
    
    // アニメーション完了後のみ次に進める
    if (!textAnimation.canProceed()) return;

    currentStage++;
    
    if (currentStage === 1) {
      // ステージ1
      startTextAnimation('数えきれないほどの罪を犯してきて...', 56);
    } else if (currentStage === 2) {
      // ステージ2
      startTextAnimation('未だに罰を受けたことがないんだもの...', 64);
    } else if (currentStage === 3) {
      // ステージ3: ゲーム画面へ遷移
      onSceneChange('game');
    }
  }

  canvas.addEventListener('click', onClick);

  // パネル・歯車のホバー/ドラッグ処理
  function onPointerMove(e) {
    if (!configButtonOrthoCamera) return;
    getGearPointerNDC(e.clientX, e.clientY);
    gearRaycaster.setFromCamera(gearPointer, configButtonOrthoCamera);

    // 歯車ホバーSE
    const gearHits = configButtonMesh ? gearRaycaster.intersectObject(configButtonMesh) : [];
    const nowGearHovered = gearHits.length > 0;
    if (!gearHovered && nowGearHovered) playHover?.();
    gearHovered = nowGearHovered;

    // パネルのドラッグ処理（スライダー）
    if (configPanel.panelGroup.visible && draggingSlider) {
      const panelHits = gearRaycaster.intersectObject(configPanel.mesh);
      if (panelHits.length > 0) {
        const value = configPanel.getSliderValueFromPoint(panelHits[0].point, draggingSlider);
        if (draggingSlider === 'bgm_slider') {
          configPanel.setState({ bgmVolume: value });
          setBgmVolumePercent(value);
          try { window?.sceneManager?.updateConfigState?.({ bgmVolume: value }); } catch {}
        } else if (draggingSlider === 'se_slider') {
          configPanel.setState({ seVolume: value });
          setSeVolumePercent(value);
          try { window?.sceneManager?.updateConfigState?.({ seVolume: value }); } catch {}
        } else if (draggingSlider === 'message_speed_slider') {
          configPanel.setState({ messageSpeed: value });
          try { textAnimation.setSpeed?.(value); } catch {}
          try { window?.sceneManager?.updateConfigState?.({ messageSpeed: value }); } catch {}
        }
      }
      return;
    }

    // パネルのホバーSE（クリック可能項目のみ）
    if (configPanel.panelGroup.visible) {
      const panelHits = gearRaycaster.intersectObject(configPanel.mesh);
      if (panelHits.length > 0) {
        const act = configPanel.getActionAt(panelHits[0].point);
        const id = typeof act === 'object' && act !== null ? act.id : act;
        const isButton = id === 'fullscreen' || id === 'window' || id === 'back_to_title';
        const next = isButton ? id : null;
        if (next && next !== panelHoveredButtonId) playHover?.();
        panelHoveredButtonId = next;
        return;
      }
      panelHoveredButtonId = null;
    }
  }

  function onPointerDown(e) {
    if (!configButtonOrthoCamera) return;
    if (!configPanel.panelGroup.visible) return;
    getGearPointerNDC(e.clientX, e.clientY);
    gearRaycaster.setFromCamera(gearPointer, configButtonOrthoCamera);
    const panelHits = gearRaycaster.intersectObject(configPanel.mesh);
    if (panelHits.length > 0) {
      const action = configPanel.getActionAt(panelHits[0].point);
      if (action) {
        const id = typeof action === 'object' && action !== null ? action.id : action;
        if (id === 'bgm_slider' || id === 'se_slider' || id === 'message_speed_slider') {
          draggingSlider = id;
        }
      }
    }
  }

  function onPointerUp() {
    if (draggingSlider) releasedAfterSliderDrag = true;
    draggingSlider = null;
  }

  function onPointerLeave() {
    if (draggingSlider) releasedAfterSliderDrag = true;
    draggingSlider = null;
    gearHovered = false;
    panelHoveredButtonId = null;
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);

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

    // パーティクルのアスペクト更新
    currentAspect = aspect;
    updateParticles(0, currentAspect);

    // 設定ボタン更新
    if (updateConfigButton) updateConfigButton(width, height);
    // 設定パネル更新
    configPanel.update(width, height);
  }

  window.addEventListener('resize', onResize);
  onResize();

  // アニメーションループ
  let animationId = null;
  let lastTime = performance.now();
  
  function animate() {
    animationId = requestAnimationFrame(animate);
    
    // デルタタイムの計算
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000; // 秒単位
    lastTime = currentTime;
    
    // パーティクル更新
    updateParticles(deltaTime, currentAspect);

    // テキストアニメーションの更新
    textAnimation.update(deltaTime);
    
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(uiScene, orthoCamera);
    // 設定ボタン（別UIレイヤー）
    if (configButtonUiScene && configButtonOrthoCamera) {
      renderer.clearDepth();
      renderer.render(configButtonUiScene, configButtonOrthoCamera);
    }
    renderer.autoClear = true;
  }

  // シーン制御
  return {
    start() {
      // イントロBGM再生（自動再生がブロックされる場合はクリックで再試行）
      playBgm('Assets/sound/bgm/white-noise.mp3', { loop: true });
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
      // メッセージループSE停止
      stopMessageLoop();
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
      // メモリ解放
      if (textMaterial.map) {
        textMaterial.map.dispose();
      }
      textMaterial.dispose();
      textGeometry.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    }
  };
}

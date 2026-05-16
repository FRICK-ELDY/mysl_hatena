import * as THREE from 'three';

/**
 * パララックス背景ユーティリティ
 * - 指定画像をオルソUI空間に敷き、マウス座標(NDC)に応じて平行移動
 * - 画面より少し大きく拡大して、移動してもエッジが見えないようにする
 * @param {Object} options
 * @param {string} options.imageUrl
 * @param {number} [options.marginScale=1.08] - 画面に対する拡大率
 * @param {number} [options.maxShiftPx=24] - 最大平行移動量（pxベース, 両軸のデフォルト）
 * @param {number} [options.maxShiftPxX] - X軸の最大平行移動量（未指定時は maxShiftPx）
 * @param {number} [options.maxShiftPxY] - Y軸の最大平行移動量（未指定時は maxShiftPx）
 * @param {number} [options.smoothing=8] - 追従スピード（大きいほど速い）
 * @param {number} [options.renderOrder=-1000]
 * @returns {Promise<{
 *   mesh: THREE.Mesh,
 *   updateSize: (w: number, h: number) => void,
 *   setPointerNdc: (x: number, y: number) => void,
 *   center: () => void,
 *   update: (dt: number) => void,
 *   dispose: () => void
 * }>}
 */
export async function createParallaxBackground({
  imageUrl,
  marginScale = 1.08,
  maxShiftPx = 24,
  maxShiftPxX,
  maxShiftPxY,
  smoothing = 8,
  renderOrder = -1000,
  usePixelOrtho = true
}) {
  const texture = await new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(imageUrl, (t) => resolve(t), undefined, (e) => reject(e));
  });
  texture.flipY = true;
  if ('colorSpace' in texture && THREE.SRGBColorSpace !== undefined) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else if ('encoding' in texture && THREE.sRGBEncoding !== undefined) {
    texture.encoding = THREE.sRGBEncoding;
  }
  texture.needsUpdate = true;

  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    depthTest: false,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = renderOrder;
  mesh.name = 'parallaxBackground';

  // 内部状態
  let targetNdcX = 0;
  let targetNdcY = 0;
  let ndcX = 0;
  let ndcY = 0;
  let amplitudeX = 0;
  let amplitudeY = 0;

  function updateSize(canvasWidth, canvasHeight) {
    const aspect = canvasWidth / canvasHeight;
    const imgW = texture.image?.width || 1;
    const imgH = texture.image?.height || 1;
    const imgRatio = imgW / imgH;

    let worldW, worldH;
    if (usePixelOrtho) {
      // カメラがピクセル座標系（left=-w/2..right=w/2）の場合
      const targetW = canvasWidth * marginScale;
      const targetH = canvasHeight * marginScale;
      if (aspect > imgRatio) {
        // 画面が横長 → 高さを基準に幅を算出
        worldH = targetH;
        worldW = worldH * imgRatio;
      } else {
        worldW = targetW;
        worldH = worldW / imgRatio;
      }
      mesh.scale.set(worldW, worldH, 1);
      // シフト量はピクセルそのまま
      const mpx = (typeof maxShiftPxX === 'number' ? maxShiftPxX : maxShiftPx);
      const mpy = (typeof maxShiftPxY === 'number' ? maxShiftPxY : maxShiftPx);
      amplitudeX = mpx;
      amplitudeY = mpy;
    } else {
      // カメラが -1..1 ベースの正規化座標を使う場合（従来）
      const orthoHeight = 2;
      const orthoWidth = 2 * aspect;
      let w, h;
      if (aspect > imgRatio) {
        h = orthoHeight * marginScale;
        w = h * imgRatio;
      } else {
        w = orthoWidth * marginScale;
        h = w / imgRatio;
      }
      mesh.scale.set(w, h, 1);
      const pixelToOrthoX = orthoWidth / canvasWidth;
      const pixelToOrthoY = orthoHeight / canvasHeight;
      const mpx = (typeof maxShiftPxX === 'number' ? maxShiftPxX : maxShiftPx);
      const mpy = (typeof maxShiftPxY === 'number' ? maxShiftPxY : maxShiftPx);
      amplitudeX = mpx * pixelToOrthoX;
      amplitudeY = mpy * pixelToOrthoY;
    }
  }

  function setPointerNdc(x, y) {
    targetNdcX = x;
    targetNdcY = y;
  }

  function center() {
    targetNdcX = 0;
    targetNdcY = 0;
  }

  function update(dt) {
    const k = Math.min(1, dt * smoothing);
    ndcX += (targetNdcX - ndcX) * k;
    ndcY += (targetNdcY - ndcY) * k;
    mesh.position.x = -ndcX * amplitudeX;
    mesh.position.y = -ndcY * amplitudeY;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    texture.dispose();
  }

  return { mesh, updateSize, setPointerNdc, center, update, dispose };
}



import * as THREE from 'three';

/**
 * オルソUI空間用の汎用的な光粒子クラス
 * - シーンに追加する Three.Points を内部で保持
 * - 画面アスペクトに追従したラップ移動（左右トーラス・上で再出現）
 */
export class UiGlowParticles {
  /**
   * @param {Object} options
   * @param {number} [options.count=140] 粒子数
   * @param {number} [options.size=0.1] 粒子サイズ（オルソ空間単位）
   * @param {number} [options.color=0xf7f2c6] 色
   * @param {number} [options.z=-0.02] 配置Z（UI空間内の前後）
   * @param {number} [options.baseSpeedY=0.06] 上昇の基礎速度
   * @param {number} [options.randomSpeedY=0.08] 上昇速度のランダム幅
   * @param {number} [options.randomSpeedX=0.04] 横揺れのランダム幅
   * @param {number} [options.distributionRatioX=0.75] X方向の分布を左右端から内側へ寄せる比
   * @param {boolean} [options.additive=true] 加算合成にするか
   */
  constructor(options = {}) {
    const {
      count = 140,
      size = 0.1,
      sizeAttenuation = true,
      color = 0xf7f2c6,
      z = -0.02,
      baseSpeedY = 0.06,
      randomSpeedY = 0.08,
      randomSpeedX = 0.04,
      distributionRatioX = 0.75,
      additive = true
    } = options;

    this.count = count;
    this.size = size;
    this.color = color;
    this.z = z;
    this.baseSpeedY = baseSpeedY;
    this.randomSpeedY = randomSpeedY;
    this.randomSpeedX = randomSpeedX;
    this.distributionRatioX = distributionRatioX;
    this.bounds = { left: -1, right: 1, bottom: -1, top: 1 };

    this.positions = new Float32Array(this.count * 3);
    this.velX = new Float32Array(this.count);
    this.velY = new Float32Array(this.count);

    this.texture = this.#createGlowTexture();
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.material = new THREE.PointsMaterial({
      map: this.texture,
      size: this.size,
      sizeAttenuation,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      color: this.color
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.position.z = this.z;
    this.points.renderOrder = -10;
  }

  /**
   * 画面アスペクトに応じて領域と初期分布を設定
   * @param {number} aspect width/height
   */
  seedForAspect(aspect) {
    this.bounds.left = -aspect;
    this.bounds.right = aspect;
    this.bounds.bottom = -1;
    this.bounds.top = 1;

    const xLeft = -aspect * this.distributionRatioX;
    const xRight = aspect * this.distributionRatioX;
    for (let i = 0; i < this.count; i++) {
      const ix = i * 3;
      this.positions[ix] = THREE.MathUtils.lerp(xLeft, xRight, Math.random());
      this.positions[ix + 1] = THREE.MathUtils.lerp(this.bounds.bottom, this.bounds.top, Math.random());
      this.positions[ix + 2] = this.z;
      this.velY[i] = this.baseSpeedY + Math.random() * this.randomSpeedY;
      this.velX[i] = (Math.random() - 0.5) * this.randomSpeedX;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * 更新
   * @param {number} deltaSec 経過秒
   */
  update(deltaSec) {
    const width = this.bounds.right - this.bounds.left;
    for (let i = 0; i < this.count; i++) {
      const ix = i * 3;
      this.positions[ix] += this.velX[i] * deltaSec;
      this.positions[ix + 1] += this.velY[i] * deltaSec;

      if (this.positions[ix] < this.bounds.left) this.positions[ix] += width;
      if (this.positions[ix] > this.bounds.right) this.positions[ix] -= width;
      if (this.positions[ix + 1] > this.bounds.top + 0.05) {
        this.positions[ix + 1] = this.bounds.bottom - Math.random() * 0.2;
        this.positions[ix] = THREE.MathUtils.lerp(this.bounds.left, this.bounds.right, Math.random());
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.geometry?.dispose();
    this.material?.dispose();
    this.texture?.dispose();
  }

  #createGlowTexture() {
    const size = 64;
    const canvasGlow = document.createElement('canvas');
    canvasGlow.width = size;
    canvasGlow.height = size;
    const ctx = canvasGlow.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255, 255, 230, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 230, 0.9)');
    grad.addColorStop(1, 'rgba(255, 255, 230, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvasGlow);
    if ('colorSpace' in tex && THREE.SRGBColorSpace !== undefined) {
      tex.colorSpace = THREE.SRGBColorSpace;
    } else if ('encoding' in tex && THREE.sRGBEncoding !== undefined) {
      tex.encoding = THREE.sRGBEncoding;
    }
    tex.needsUpdate = true;
    return tex;
  }
}





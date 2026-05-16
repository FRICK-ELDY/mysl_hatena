/**
 * 解像度に応じた UI スケールの共通モジュール
 * ベース解像度（1024×576）を 1.0 とし、フルスクリーン／ウィンドウで
 * 同じ見た目比率になるようスケール係数を提供する。
 * 新規 UI 作成時もこのモジュールを利用すると解像度に応じたサイズになる。
 */

/** ベース解像度（このサイズを 1.0 としてスケールする） */
export const BASE_RESOLUTION_W = 1024;
export const BASE_RESOLUTION_H = 576;
export const BASE_ASPECT = BASE_RESOLUTION_W / BASE_RESOLUTION_H;

/**
 * 現在のキャンバスサイズに対するスケール係数を返す
 * フルスクリーン時は 1 より大きくなり、ウィンドウ時は 1 前後
 * @param {number} canvasWidth - 現在のキャンバス幅
 * @param {number} canvasHeight - 現在のキャンバス高さ
 * @returns {number} スケール係数（1.0 = ベース解像度）
 */
export function getScale(canvasWidth, canvasHeight) {
  return Math.min(
    canvasWidth / BASE_RESOLUTION_W,
    canvasHeight / BASE_RESOLUTION_H
  );
}

/**
 * ベース座標系の値を現在の解像度にスケールする
 * @param {number} baseValue - ベース解像度での値（例: 40）
 * @param {number} canvasWidth - 現在のキャンバス幅
 * @param {number} canvasHeight - 現在のキャンバス高さ
 * @returns {number} スケール後の値
 */
export function scaleValue(baseValue, canvasWidth, canvasHeight) {
  return baseValue * getScale(canvasWidth, canvasHeight);
}

/**
 * ベースサイズ（幅・高さ）を現在の解像度にスケールしたサイズを返す
 * パネルやボタンなど、ベース解像度で定義したサイズをスケールするときに使う
 * @param {number} baseWidth - ベース解像度での幅
 * @param {number} baseHeight - ベース解像度での高さ
 * @param {number} canvasWidth - 現在のキャンバス幅
 * @param {number} canvasHeight - 現在のキャンバス高さ
 * @returns {{ width: number, height: number }}
 */
export function getScaledSize(baseWidth, baseHeight, canvasWidth, canvasHeight) {
  const scale = getScale(canvasWidth, canvasHeight);
  return {
    width: baseWidth * scale,
    height: baseHeight * scale
  };
}

/**
 * 解像度比率を維持しつつコンテナに収まるキャンバスサイズを返す
 * main.js の getFittedSize と同等（共通化用）
 * @param {number} containerWidth - コンテナ幅
 * @param {number} containerHeight - コンテナ高さ
 * @returns {{ width: number, height: number }}
 */
export function getFittedCanvasSize(containerWidth, containerHeight) {
  const containerAspect = containerWidth / containerHeight;
  if (containerAspect > BASE_ASPECT) {
    return {
      width: Math.round(containerHeight * BASE_ASPECT),
      height: containerHeight
    };
  }
  return {
    width: containerWidth,
    height: Math.round(containerWidth / BASE_ASPECT)
  };
}

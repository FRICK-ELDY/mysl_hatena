import * as THREE from 'three';

/**
 * ボックスメッシュを作成してシーンに追加する
 * @param {THREE.Scene} scene - 追加先のシーン
 * @returns {THREE.Mesh} 作成したボックスメッシュ
 */
export function createBox(scene) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: 0x4a4a6a
  });
  const box = new THREE.Mesh(geometry, material);
  scene.add(box);
  return box;
}

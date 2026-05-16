import * as THREE from 'three';

// ヨー(Yaw)=Y軸, ロール(Roll)=Z軸, ピッチ(Pitch)=X軸
const clock = new THREE.Clock();
const phaseDuration = 2; // 各回転の所要時間（秒）
const fullRotation = Math.PI * 2; // 360度

/**
 * ヨー・ロール・ピッチ回転を更新する
 * @param {THREE.Mesh} mesh - 回転を適用するメッシュ
 */
export function updateYawRollPitch(mesh) {
  const elapsed = clock.getElapsedTime();
  const phaseTime = elapsed % (phaseDuration * 3); // 3相位でループ
  const phase = Math.floor(phaseTime / phaseDuration); // 0: ヨー, 1: ロール, 2: ピッチ
  const t = (phaseTime % phaseDuration) / phaseDuration; // 0〜1 の進捗

  mesh.rotation.x = 0;
  mesh.rotation.y = 0;
  mesh.rotation.z = 0;

  if (phase === 0) {
    mesh.rotation.y = t * fullRotation; // ヨー
  } else if (phase === 1) {
    mesh.rotation.z = t * fullRotation; // ロール
  } else {
    mesh.rotation.x = t * fullRotation; // ピッチ
  }
}

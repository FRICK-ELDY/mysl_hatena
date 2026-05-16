/**
 * テキストアニメーションクラス
 * 一文字ずつテキストを表示するアニメーション
 */
export class TextAnimation {
  /**
   * @param {Function} onUpdate - テキスト更新時のコールバック (currentText: string) => void
   * @param {Function} onComplete - アニメーション完了時のコールバック () => void
   */
  constructor(onUpdate, onComplete) {
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    
    this.currentText = '';
    this.targetText = '';
    this.charIndex = 0;
    this.animationTimer = 0;
    this.isAnimating = false;
    this.canAdvance = false;
    
    // デフォルトのスピード（0〜100の値を0.02〜0.2秒の範囲に変換）
    // 100 = 最速(0.02秒/文字), 0 = 最遅(0.2秒/文字)
    this.messageSpeed = 80;
  }

  /**
   * メッセージスピードを設定（0〜100）
   * @param {number} speed - メッセージスピード（0: 遅い, 100: 速い）
   */
  setSpeed(speed) {
    this.messageSpeed = Math.max(0, Math.min(100, speed));
  }

  /**
   * 現在のスピードに基づいて1文字あたりの表示間隔を計算
   * @returns {number} 表示間隔（秒）
   */
  getCharDelay() {
    // スピード100 → 0.02秒、スピード0 → 0.2秒
    const minDelay = 0.02;
    const maxDelay = 0.2;
    const delay = maxDelay - (this.messageSpeed / 100) * (maxDelay - minDelay);
    console.log(`Char delay: ${delay}s (speed: ${this.messageSpeed})`);
    return delay;
  }

  /**
   * テキストアニメーションを開始
   * @param {string} text - 表示するテキスト
   */
  start(text) {
    this.targetText = text;
    this.currentText = '';
    this.charIndex = 0;
    this.animationTimer = 0;
    this.isAnimating = true;
    this.canAdvance = false;
    
    // 初期状態（空のテキスト）を通知
    if (this.onUpdate) {
      this.onUpdate('');
    }
  }

  /**
   * アニメーションを更新（毎フレーム呼ぶ）
   * @param {number} deltaTime - 前フレームからの経過時間（秒）
   */
  update(deltaTime) {
    if (!this.isAnimating) return;

    this.animationTimer += deltaTime;
    const charDelay = this.getCharDelay();

    // 一定時間経過したら次の文字を表示
    if (this.animationTimer >= charDelay) {
      this.animationTimer = 0;
      
      if (this.charIndex < this.targetText.length) {
        this.currentText += this.targetText[this.charIndex];
        this.charIndex++;
        
        // テキスト更新を通知
        if (this.onUpdate) {
          this.onUpdate(this.currentText);
        }
      } else {
        // アニメーション完了
        this.isAnimating = false;
        this.canAdvance = true;
        
        // 完了を通知
        if (this.onComplete) {
          this.onComplete();
        }
      }
    }
  }

  /**
   * アニメーション中かどうか
   * @returns {boolean}
   */
  isPlaying() {
    return this.isAnimating;
  }

  /**
   * 次に進めるかどうか（アニメーション完了後）
   * @returns {boolean}
   */
  canProceed() {
    return this.canAdvance;
  }

  /**
   * アニメーションをスキップして即座に全文表示
   */
  skip() {
    if (this.isAnimating) {
      this.currentText = this.targetText;
      this.charIndex = this.targetText.length;
      this.isAnimating = false;
      this.canAdvance = true;
      
      // テキスト更新を通知
      if (this.onUpdate) {
        this.onUpdate(this.currentText);
      }
      
      // 完了を通知
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  /**
   * アニメーションをリセット
   */
  reset() {
    this.currentText = '';
    this.targetText = '';
    this.charIndex = 0;
    this.animationTimer = 0;
    this.isAnimating = false;
    this.canAdvance = false;
  }
}

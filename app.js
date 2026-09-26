// グローバルアプリケーション状態
window.AppState = {
  children: [],
  selectedChildId: null,
  isChildMode: false,

  // 初期化
  init() {
    this.loadLocalStorage();
    this.bindEvents();
    this.renderChildren();
    this.updateDashboard();
  },

  // ローカルストレージ読み込み
  loadLocalStorage() {
    const saved = localStorage.getItem('kids_money_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      this.children = parsed.children || [];
      this.selectedChildId = parsed.selectedChildId || (this.children[0] ? this.children[0].id : null);
      this.isChildMode = parsed.isChildMode || false;
    } else {
      // 初期デフォルトデータ
      this.children = [
        { id: 'child_1', name: 'たろう', money: 300, studyLogs: [] },
        { id: 'child_2', name: 'はなこ', money: 500, studyLogs: [] }
      ];
      this.selectedChildId = 'child_1';
      this.saveLocalStorage();
    }
  },

  // ローカルストレージ保存
  saveLocalStorage() {
    localStorage.setItem('kids_money_data', JSON.stringify({
      children: this.children,
      selectedChildId: this.selectedChildId,
      isChildMode: this.isChildMode
    }));
  },

  // 現在選択中の子供を取得
  getSelectedChild() {
    return this.children.find(c => c.id === this.selectedChildId) || null;
  },

  // イベント登録
  bindEvents() {
    // 子供追加
    document.getElementById('add-child-btn').addEventListener('click', () => {
      const input = document.getElementById('new-child-name');
      const name = input.value.trim();
      if (name) {
        const newChild = {
          id: 'child_' + Date.now(),
          name: name,
          money: 0,
          studyLogs: []
        };
        this.children.push(newChild);
        this.selectedChildId = newChild.id;
        input.value = '';
        this.saveLocalStorage();
        this.renderChildren();
        this.updateDashboard();
        if (window.renderStudyLogs) window.renderStudyLogs();
      }
    });

    // モード切り替えボタン
    document.getElementById('mode-btn').addEventListener('click', () => {
      this.isChildMode = !this.isChildMode;
      this.saveLocalStorage();
      this.applyChildModeUI();
      if (window.loadNextQuiz) window.loadNextQuiz();
    });
  },

  // 子供リスト描画 (1列崩れ防止・アクティブ強調)
  renderChildren() {
    const container = document.getElementById('children-list');
    container.innerHTML = '';

    this.children.forEach(child => {
      const card = document.createElement('div');
      card.className = `child-card ${child.id === this.selectedChildId ? 'active' : ''}`;
      card.textContent = child.name;
      card.addEventListener('click', () => this.selectChild(child.id));
      container.appendChild(card);
    });

    this.applyChildModeUI();
  },

  // 子供選択切り替え
  selectChild(childId) {
    this.selectedChildId = childId;
    this.saveLocalStorage();
    this.renderChildren();
    this.updateDashboard();
    
    // 依存モジュール（勉強記録・クイズ）の描画更新
    if (window.renderStudyLogs) window.renderStudyLogs();
  },

  // ダッシュボード・今日のお金計算更新
  updateDashboard() {
    const currentChild = this.getSelectedChild();
    const todayElem = document.getElementById('today-money');
    const totalElem = document.getElementById('total-money');

    if (!currentChild) {
      todayElem.textContent = '0 円';
      totalElem.textContent = '0 円';
      return;
    }

    // 今日の日付 (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];

    // 本日獲得したお小遣いの合計計算
    const todayTotal = (currentChild.studyLogs || [])
      .filter(log => log.date === todayStr)
      .reduce((sum, log) => sum + (Number(log.reward) || 0), 0);

    todayElem.textContent = `${todayTotal} 円`;
    totalElem.textContent = `${currentChild.money || 0} 円`;
  },

  // モード切替に伴うUI文字の更新（漢字 / ひらがな）
  applyChildModeUI() {
    const modeBtn = document.getElementById('mode-btn');
    const appTitle = document.getElementById('app-title');
    const quizTitle = document.getElementById('quiz-section-title');
    const studyTitle = document.getElementById('study-section-title');

    if (this.isChildMode) {
      modeBtn.textContent = 'おとなモードにきりかえ';
      appTitle.textContent = 'きっずまねー';
      quizTitle.textContent = 'おかねのくいずにちょうせんしよう！';
      studyTitle.textContent = 'べんきょうのきろく';
    } else {
      modeBtn.textContent = 'こどもモードにきりかえ';
      appTitle.textContent = 'キッズマネー';
      quizTitle.textContent = 'お金のクイズに挑戦しよう！';
      studyTitle.textContent = '勉強の記録';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.AppState.init();
});

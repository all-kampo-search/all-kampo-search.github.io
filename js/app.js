// 日本漢方生薬製剤協会 会員各社 医薬品検索 Webアプリケーション

const STATE = {
  items: [],
  filteredItems: [],
  displayCount: 36,
  selectedCompanies: new Set(), // 空なら全社
  selectedDosageForms: new Set(), // 空なら全剤形
  activeType: 'all', // 'all' | 'medical' | 'otc'
  activeGojuon: 'all',
  activeBookmarkFilter: 'all', // 'all' | 'bm1' | 'bm2'
  bookmarks1: new Set(), // ブックマーク1 (item key / id)
  bookmarks2: new Set(), // ブックマーク2 (item key / id)
  searchQuery: '',
  searchTarget: 'name', // 'name' | 'ingredient' | 'efficacy'
  excludeHerb: false, // 生薬除外検索（trueの時、入力生薬を含まない商品を検索）
  activeItem: null,
  compareFormula: null,
  currentView: 'search', // 'search' | 'compare' | 'detail'
  lastScrollPosition: 0, // 一覧画面のスクロール復元位置
  // 比較選択モード
  isCompareMode: false,
  selectedCompareItems: new Set(), // 選択された globalIndex の Set
  customCompareItems: [], // 選択されたアイテムオブジェクトのリスト
  // 比較画面内フィルター
  compareSelectedCompanies: new Set(),
  compareSelectedTypes: new Set(['medical', 'otc']),
  compareVisibleSections: {
    efficacy: false,     // 効能効果（初期オフ）
    usageMethod: false,  // 用法（初期オフ・新規）
    dailyDose: true,    // １日服用量（初期オン・容量）
    ingredients: true,  // 構成生薬（エキス量含む、初期オン）
    additives: false,    // 添加物（初期オフ・新規）
    precautions: false  // 使用上の注意（初期オフ・新規）
  },
  // 詳細モーダル内生薬ソート順 ('amount': 多い順, 'name': 五十音順)
  herbSortOrder: 'name'
};

// 対象会社定義（日漢協加盟社＋イスクラ産業）
const COMPANIES = [
  { id: 'tsumura', name: 'ツムラ', badgeClass: 'badge-tsumura' },
  { id: 'kracie', name: 'クラシエ', badgeClass: 'badge-kracie' },
  { id: 'kotaro', name: '小太郎漢方', badgeClass: 'badge-kotaro' },
  { id: 'iskra', name: 'イスクラ産業', badgeClass: 'badge-iskra' },
  { id: 'uchida', name: 'ウチダ和漢薬', badgeClass: 'badge-uchida' },
  { id: 'osugi', name: '大杉製薬', badgeClass: 'badge-osugi' },
  { id: 'sanwa', name: '三和生薬', badgeClass: 'badge-sanwa' },
  { id: 'jps', name: 'ジェーピーエス製薬', badgeClass: 'badge-jps' },
  { id: 'honzo', name: '本草製薬', badgeClass: 'badge-honzo' },
  { id: 'matsuura', name: '松浦薬業', badgeClass: 'badge-matsuura' },
  { id: 'zaiseido', name: '剤盛堂(ホノミ)', badgeClass: 'badge-zaiseido' },
  { id: 'kyushin', name: '救心製薬', badgeClass: 'badge-kyushin' },
  { id: 'tochimoto', name: '栃本天海堂', badgeClass: 'badge-tochimoto' },
  { id: 'taikoseido', name: '太虎精堂', badgeClass: 'badge-taikoseido' },
  { id: 'tatebayashi', name: '建林松鶴堂', badgeClass: 'badge-tatebayashi' },
  { id: 'yatsume', name: '八ッ目製薬', badgeClass: 'badge-yatsume' },
  { id: 'sakamoto', name: '阪本漢法', badgeClass: 'badge-sakamoto' },
  { id: 'sugihara', name: '杉原達二商店', badgeClass: 'badge-sugihara' }
];

// 剤形定義（散剤は顆粒・細粒に統合、末剤を独立）
const DOSAGE_FORMS = [
  '顆粒剤',
  '細粒剤',
  '錠剤',
  '末剤',
  '丸剤',
  '煎剤・生薬',
  '液剤・シロップ',
  'カプセル剤',
  '外用剤'
];

function getCompanyBadgeClass(companyId) {
  const found = COMPANIES.find(c => c.id === companyId);
  return found ? found.badgeClass : 'bg-slate-100 text-slate-700 border-slate-200';
}

// 五十音行
const GOJUON_GROUPS = [
  { label: '全', value: 'all' },
  { label: 'あ', value: 'a', regex: /^[あ-お]/ },
  { label: 'か', value: 'ka', regex: /^[か-ご]/ },
  { label: 'さ', value: 'sa', regex: /^[さ-ぞ]/ },
  { label: 'た', value: 'ta', regex: /^[た-ど]/ },
  { label: 'な', value: 'na', regex: /^[な-の]/ },
  { label: 'は', value: 'ha', regex: /^[は-ぽ]/ },
  { label: 'ま', value: 'ma', regex: /^[ま-も]/ },
  { label: 'や', value: 'ya', regex: /^[や-よ]/ },
  { label: 'ら', value: 'ra', regex: /^[ら-ろ]/ },
  { label: 'わ', value: 'wa', regex: /^[わ-ん]/ }
];

// かな・カナ変換
function hiraToKata(str) {
  return str.replace(/[\u3041-\u3096]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}
function kataToHira(str) {
  return str.replace(/[\u30a1-\u30f6]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}

// テキスト正規化（全角半角、大文字小文字、ひらがな・カタカナ両対応用）
function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 65248))
    .replace(/[・･\s　「」『』（）()]/g, '')
    .toLowerCase();
}

// 空改行を完全に除去・整形する関数（カンマ「，」も「、」に置換、先頭・末尾の空改行・空白も完全トリム）
function cleanDisplayText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/，/g, '、')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();
}

// 生薬名から前後の空白・全角スペース・タブ・インデントを完全除去して左揃えにする
function cleanHerbName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.replace(/^[\s\u3000\u00A0\t]+|[\s\u3000\u00A0\t]+$/g, '').trim();
}

// 1日服用量の閉じ括弧欠落修復
function formatDailyDose(dailyDose) {
  if (!dailyDose || typeof dailyDose !== 'string') return '-';
  let dose = dailyDose.trim();
  const openCountHalf = (dose.match(/\(/g) || []).length;
  const closeCountHalf = (dose.match(/\)/g) || []).length;
  if (openCountHalf > closeCountHalf) {
    dose += ')'.repeat(openCountHalf - closeCountHalf);
  }
  const openCountFull = (dose.match(/（/g) || []).length;
  const closeCountFull = (dose.match(/）/g) || []).length;
  if (openCountFull > closeCountFull) {
    dose += '）'.repeat(openCountFull - closeCountFull);
  }
  return dose;
}

// 分量の単位を「g」に統一する関数（浮動小数点丸め誤差を恒久的に防止）
function formatHerbAmount(amount, amountStr) {
  if (amount !== undefined && amount !== null && amount !== '') {
    const num = parseFloat(amount);
    if (!isNaN(num) && num > 0) {
      // 小数点第4位まで丸めて浮動小数点のゴミを除去
      const rounded = Math.round(num * 10000) / 10000;
      return `${rounded}g`;
    }
  }
  if (!amountStr || typeof amountStr !== 'string') return '-';
  let s = amountStr.trim();
  const mgMatch = s.match(/([0-9.]+)\s*mg/i);
  if (mgMatch) {
    const gVal = Math.round((parseFloat(mgMatch[1]) / 1000) * 10000) / 10000;
    return `${gVal}g`;
  }
  if (/^[0-9.]+\s*g$/i.test(s)) {
    const num = parseFloat(s);
    if (!isNaN(num)) {
      const rounded = Math.round(num * 10000) / 10000;
      return `${rounded}g`;
    }
    return s.replace(/\s+/g, '');
  }
  if (/^[0-9.]+$/.test(s)) {
    const num = parseFloat(s);
    if (!isNaN(num)) {
      const rounded = Math.round(num * 10000) / 10000;
      return `${rounded}g`;
    }
    return `${s}g`;
  }
  return s;
}

// 添加物の（）やKEGGコードを除去して整形する関数
function cleanAdditives(additives) {
  if (!Array.isArray(additives) || additives.length === 0) return '';
  const cleanedList = additives
    .map(item => {
      if (typeof item !== 'string') return '';
      return item
        .replace(/[（(].*?[）)]/g, '')
        .replace(/[・･\s]/g, '')
        .trim();
    })
    .filter(name => name.length > 0);

  const unique = Array.from(new Set(cleanedList));
  return unique.join('、');
}

// 用法用量文から「用法（服用のタイミング・方法・回数）」を判定・抽出する関数
function extractUsageMethod(text) {
  if (!text) return '-';
  let s = cleanDisplayText(text);

  // 年齢別の用量表が始まる前までの文章を抽出
  const splitIdx = s.search(/[［\[【]?\s*年齢\s*[：:]|成人\s*[（\(]/);
  let methodPart = splitIdx > 0 ? s.slice(0, splitIdx).trim() : s;

  methodPart = methodPart.replace(/^次の(?:一回|1回)?量を[、，,\s]*/, '');
  methodPart = methodPart.replace(/服用して(?:ください)?$/, '服用');
  methodPart = methodPart.replace(/塗布又は塗擦して(?:ください)?$/, '塗布又は塗擦');
  methodPart = methodPart.replace(/ください[。]?$/, '').trim();

  if (methodPart.includes('分割し')) {
    const m = methodPart.match(/([0-9０-９一二三〜～\-]+\s*回に分割し[、，\s]*[^。]+)/);
    if (m) return m[1].replace(/通常[、，\s]*/, '').replace(/成人1日[^\s]+を/, '').trim();
  }

  methodPart = methodPart.replace(/\n+/g, ' ').trim();
  if (methodPart.length >= 6 && !methodPart.includes('1回の服用量')) {
    return methodPart;
  }

  const timingMatches = [];
  if (/食前[又は・およひび及]*食間/.test(s)) timingMatches.push('食前又は食間に服用');
  else if (/食間/.test(s)) timingMatches.push('食間空腹時に服用');
  else if (/食前/.test(s)) timingMatches.push('食前に服用');
  else if (/食後/.test(s)) timingMatches.push('食後に服用');

  if (/水又[は・]白湯/.test(s)) timingMatches.push('水又は白湯にて服用');
  else if (/温水|お湯/.test(s)) timingMatches.push('温水（お湯）にて服用');
  else if (/塗布|塗擦/.test(s)) timingMatches.push('患部に塗布');

  const timesMatch = s.match(/1日\s*([0-9０-９一二三〜～\-]+)\s*回/);
  if (timesMatch) timingMatches.push('1日' + timesMatch[1] + '回');

  return timingMatches.length > 0 ? timingMatches.join('、') : s;
}

// ==========================================================================
// ブックマーク管理（即時 localStorage 保存）
// ==========================================================================

function getItemKey(item) {
  return `${item.company}_${item.rawName || item.name}_${item.type}`;
}

function loadBookmarks() {
  try {
    const bm1 = localStorage.getItem('kampo_bookmarks_1');
    if (bm1) STATE.bookmarks1 = new Set(JSON.parse(bm1));
    const bm2 = localStorage.getItem('kampo_bookmarks_2');
    if (bm2) STATE.bookmarks2 = new Set(JSON.parse(bm2));
  } catch (e) {
    console.error('Failed to load bookmarks', e);
  }
  updateBookmarkCounts();
}

function saveBookmarksToStorage(type) {
  try {
    if (type === 1) {
      localStorage.setItem('kampo_bookmarks_1', JSON.stringify(Array.from(STATE.bookmarks1)));
    } else if (type === 2) {
      localStorage.setItem('kampo_bookmarks_2', JSON.stringify(Array.from(STATE.bookmarks2)));
    }
  } catch (e) {
    console.error('Failed to save bookmarks', e);
  }
  updateBookmarkCounts();
}

function toggleBookmark(idx, bmType) {
  const item = STATE.items[idx];
  if (!item) return;
  const key = getItemKey(item);

  if (bmType === 1) {
    if (STATE.bookmarks1.has(key)) {
      STATE.bookmarks1.delete(key);
    } else {
      STATE.bookmarks1.add(key);
    }
    saveBookmarksToStorage(1);
  } else if (bmType === 2) {
    if (STATE.bookmarks2.has(key)) {
      STATE.bookmarks2.delete(key);
    } else {
      STATE.bookmarks2.add(key);
    }
    saveBookmarksToStorage(2);
  }

  updateBookmarkCounts();

  // もしブックマークで絞り込み中の場合は一覧を再描画
  if (STATE.activeBookmarkFilter !== 'all') {
    applyFilterAndSearch();
  } else {
    // 該当カードおよびモーダル内のしおりアイコンを即時更新
    updateBookmarkIconsForIndex(idx, key);
  }
}

// 該当アイテムのカード＆モーダル内のしおり型アイコンを即時更新
function updateBookmarkIconsForIndex(idx, key) {
  const isBm1 = STATE.bookmarks1.has(key);
  const isBm2 = STATE.bookmarks2.has(key);

  // カード側のしおり1
  const cardIcon1 = document.getElementById(`cardBmIcon-1-${idx}`);
  if (cardIcon1) {
    cardIcon1.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="${isBm1 ? '#f59e0b' : 'none'}" stroke="${isBm1 ? '#d97706' : '#94a3b8'}"/>`;
  }
  // カード側のしおり2
  const cardIcon2 = document.getElementById(`cardBmIcon-2-${idx}`);
  if (cardIcon2) {
    cardIcon2.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="${isBm2 ? '#3b82f6' : 'none'}" stroke="${isBm2 ? '#2563eb' : '#94a3b8'}"/>`;
  }

  // モーダル側のしおり1
  const modalIcon1 = document.getElementById(`modalBmIcon-1-${idx}`);
  if (modalIcon1) {
    modalIcon1.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="${isBm1 ? '#f59e0b' : 'none'}" stroke="${isBm1 ? '#d97706' : '#94a3b8'}"/>`;
  }
  // モーダル側のしおり2
  const modalIcon2 = document.getElementById(`modalBmIcon-2-${idx}`);
  if (modalIcon2) {
    modalIcon2.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="${isBm2 ? '#3b82f6' : 'none'}" stroke="${isBm2 ? '#2563eb' : '#94a3b8'}"/>`;
  }
}

function updateBookmarkCounts() {
  const btn = document.getElementById('bookmarkCycleBtn');
  const label = document.getElementById('bookmarkCycleLabel');
  const icon = document.getElementById('bookmarkCycleIcon');
  const badge = document.getElementById('bookmarkCycleBadge');
  const filter = STATE.activeBookmarkFilter;

  if (icon && badge) {
    if (filter === 'bm1') {
      if (label) label.textContent = 'ブックマーク1';
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="#f59e0b" stroke="#d97706"/>`;
      badge.classList.remove('hidden');
      badge.textContent = STATE.bookmarks1.size;
      badge.className = 'absolute -top-1.5 -right-1.5 text-[9px] min-w-[15px] h-[15px] px-1 rounded-full font-bold flex items-center justify-center shadow-xs bg-amber-500 text-white leading-none';
      if (btn) {
        btn.classList.add('active-bm1');
        btn.classList.remove('active-bm2');
        btn.title = `ブックマーク1 表示中 (${STATE.bookmarks1.size}件) - クリックでブックマーク2へ`;
      }
    } else if (filter === 'bm2') {
      if (label) label.textContent = 'ブックマーク2';
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="#3b82f6" stroke="#2563eb"/>`;
      badge.classList.remove('hidden');
      badge.textContent = STATE.bookmarks2.size;
      badge.className = 'absolute -top-1.5 -right-1.5 text-[9px] min-w-[15px] h-[15px] px-1 rounded-full font-bold flex items-center justify-center shadow-xs bg-blue-500 text-white leading-none';
      if (btn) {
        btn.classList.add('active-bm2');
        btn.classList.remove('active-bm1');
        btn.title = `ブックマーク2 表示中 (${STATE.bookmarks2.size}件) - クリックで全件表示へ`;
      }
    } else {
      if (label) label.textContent = 'すべて';
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="none" stroke="#475569"/>`;
      badge.classList.add('hidden');
      if (btn) {
        btn.classList.remove('active-bm1', 'active-bm2');
        btn.title = `ブックマーク切り替え（すべて ➔ ブックマーク1 ➔ ブックマーク2）`;
      }
    }
  }
}

// 参照元プロジェクト完全準拠: すべて → ブックマーク1 → ブックマーク2 をサイクリックに切り替え
function cycleBookmarkFilter() {
  const current = STATE.activeBookmarkFilter;
  let next = 'all';
  if (current === 'all') next = 'bm1';
  else if (current === 'bm1') next = 'bm2';
  else next = 'all';

  STATE.activeBookmarkFilter = next;
  updateBookmarkCounts();
  STATE.displayCount = 36;
  applyFilterAndSearch();
}

function setBookmarkFilter(filter) {
  STATE.activeBookmarkFilter = filter;
  updateBookmarkCounts();
  STATE.displayCount = 36;
  applyFilterAndSearch();
}

// ==========================================================================
// 比較選択モード（チェックして選択した商品を比較する機能）
// ==========================================================================

function toggleCompareMode() {
  STATE.isCompareMode = !STATE.isCompareMode;
  const btn = document.getElementById('compareModeBtn');
  const bar = document.getElementById('compareFloatingBar');

  if (STATE.isCompareMode) {
    if (btn) btn.classList.add('active');
    if (bar) bar.classList.remove('hidden');
  } else {
    if (btn) btn.classList.remove('active');
    if (bar) bar.classList.add('hidden');
    STATE.selectedCompareItems.clear();
    // 画面上の全カードから選択色（枠線・背景）を強制削除
    document.querySelectorAll('.compare-selected').forEach(el => el.classList.remove('compare-selected'));
  }

  updateCompareFloatingBar();
  renderResults();
}

function handleCardClick(globalIdx) {
  if (STATE.isCompareMode) {
    toggleCompareItem(globalIdx);
  } else {
    openDetailModalDirectByIndex(globalIdx);
  }
}

function toggleCompareItem(globalIdx) {
  if (STATE.selectedCompareItems.has(globalIdx)) {
    STATE.selectedCompareItems.delete(globalIdx);
  } else {
    STATE.selectedCompareItems.add(globalIdx);
  }
  updateCompareFloatingBar();
  
  // 対象カードの選択枠スタイルのみ即時トグル
  const cardEl = document.getElementById(`productCard-${globalIdx}`);
  if (cardEl) {
    if (STATE.selectedCompareItems.has(globalIdx)) {
      cardEl.classList.add('compare-selected');
    } else {
      cardEl.classList.remove('compare-selected');
    }
  }
}

function clearCompareSelection() {
  STATE.selectedCompareItems.clear();
  document.querySelectorAll('.compare-selected').forEach(el => el.classList.remove('compare-selected'));
  updateCompareFloatingBar();
  renderResults();
}

function updateCompareFloatingBar() {
  const countEl = document.getElementById('compareSelectedCount');
  if (countEl) {
    countEl.textContent = `${STATE.selectedCompareItems.size}件`;
  }
}

function executeCustomCompare() {
  if (STATE.selectedCompareItems.size === 0) {
    alert('比較する商品を1点以上選択してください。');
    return;
  }

  const selectedList = Array.from(STATE.selectedCompareItems).map(idx => STATE.items[idx]).filter(Boolean);
  if (selectedList.length === 0) return;

  openCustomComparePage(selectedList);
}

// ==========================================================================
// フィルター条件の保存 ＆ 復元機能（区分・製薬会社・剤形）
// ==========================================================================

function saveFilterPreferences() {
  const prefs = {
    activeType: STATE.activeType,
    selectedCompanies: Array.from(STATE.selectedCompanies),
    selectedDosageForms: Array.from(STATE.selectedDosageForms)
  };

  try {
    localStorage.setItem('kampo_filter_preferences', JSON.stringify(prefs));
    const btn = document.getElementById('saveFilterBtn');
    const txt = document.getElementById('saveFilterBtnText');
    if (btn && txt) {
      btn.classList.add('saved');
      txt.textContent = '✓ 保存しました';
      setTimeout(() => {
        btn.classList.remove('saved');
        txt.textContent = '条件保存';
      }, 1500);
    }
  } catch (e) {
    console.error('Failed to save filter preferences', e);
  }
}

function loadFilterPreferences() {
  try {
    const raw = localStorage.getItem('kampo_filter_preferences');
    if (!raw) return;
    const prefs = JSON.parse(raw);
    
    if (prefs.activeType) {
      STATE.activeType = prefs.activeType;
      const typeSelect = document.getElementById('drugTypeSelect');
      if (typeSelect) typeSelect.value = prefs.activeType;
      const radio = document.querySelector(`input[name="drugType"][value="${prefs.activeType}"]`);
      if (radio) radio.checked = true;
    }

    if (Array.isArray(prefs.selectedCompanies)) {
      STATE.selectedCompanies = new Set(prefs.selectedCompanies);
      renderCompanyDropdown();
    }

    if (Array.isArray(prefs.selectedDosageForms)) {
      STATE.selectedDosageForms = new Set(prefs.selectedDosageForms);
      renderDosageFormDropdown();
    }
  } catch (e) {
    console.error('Failed to load filter preferences', e);
  }
}

// ==========================================================================
// 初期化
// ==========================================================================

async function initApp() {
  const loadingEl = document.getElementById('loadingIndicator');
  const countBadge = document.getElementById('totalCountBadge');
  
  try {
    let json = window.__KAMPO_DATA__;
    if (!json) {
      const res = await fetch(`data.json?t=${Date.now()}`);
      if (!res.ok) throw new Error('データ読み込みに失敗しました');
      json = await res.json();
    }
    
    STATE.items = json.data || [];
    STATE.items.forEach((it, idx) => {
      it._globalIndex = idx;
    });
    
    if (countBadge) {
      countBadge.textContent = `全 ${STATE.items.length.toLocaleString()} 品目`;
    }
    
    if (loadingEl) loadingEl.classList.add('hidden');
    
    loadBookmarks();
    renderCompanyDropdown();
    renderDosageFormDropdown();
    renderGojuonBar();
    setSearchTarget('name');
    loadFilterPreferences(); // 保存されたフィルター条件を復元
    applyFilterAndSearch();
    setupEventListeners();
    handleHashRouting();
  } catch (err) {
    console.error(err);
    if (loadingEl) {
      loadingEl.innerHTML = `
        <div class="bg-red-50 text-red-700 p-3 rounded border border-red-200 text-xs">
          <p class="font-bold">データの読み込みに失敗しました</p>
          <p class="mt-1">data.json または js/data.js を確認してください。</p>
        </div>
      `;
    }
  }
}

// URLハッシュルーティング処理
function handleHashRouting() {
  const hash = window.location.hash || '';
  if (hash.startsWith('#/compare')) {
    const params = new URLSearchParams(hash.replace(/^#\/compare\??/, ''));
    const isCustom = params.get('custom');
    if (isCustom && STATE.customCompareItems.length > 0) {
      openCustomComparePage(STATE.customCompareItems, false);
      return;
    }
    const formula = params.get('formula') || params.get('name') || '';
    if (formula) {
      openComparePage(decodeURIComponent(formula), false);
      return;
    }
  }

  if (hash.startsWith('#/detail')) {
    const params = new URLSearchParams(hash.replace(/^#\/detail\??/, ''));
    const idx = parseInt(params.get('idx'), 10);
    if (!isNaN(idx) && STATE.items[idx]) {
      openDetailPage(STATE.items[idx], false);
      return;
    }
    const name = params.get('name') || '';
    if (name) {
      const it = STATE.items.find(x => x.name === name || x.rawName === name);
      if (it) {
        openDetailPage(it, false);
        return;
      }
    }
  }
  
  if (STATE.currentView !== 'search') {
    navigateToSearch(false);
  }
}

// 検索窓クリアボタンの表示・非表示制御
function updateClearButtonVisibility() {
  const input = document.getElementById('searchInput');
  const btn = document.getElementById('clearSearchBtn');
  if (!input || !btn) return;
  if (input.value && input.value.trim().length > 0) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

// 検索窓の文字を全消去して再検索
function clearSearchInput() {
  const input = document.getElementById('searchInput');
  if (input) {
    input.value = '';
    input.focus();
  }
  STATE.searchQuery = '';
  updateClearButtonVisibility();
  STATE.displayCount = 36;
  applyFilterAndSearch();
}

// 全ての絞り込み条件を一括解除して初期状態にリセット
function resetAllFilters() {
  // 1. 検索窓クリア
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  STATE.searchQuery = '';
  updateClearButtonVisibility();

  // 2. 検索対象を「商品名」にリセット（除外ボックスも自動非表示＆解除）
  setSearchTarget('name');

  // 3. 生薬除外チェックを明示的に解除
  STATE.excludeHerb = false;
  const excludeCb = document.getElementById('excludeHerbCheckbox');
  if (excludeCb) excludeCb.checked = false;

  // 4. 医薬品区分を「すべて(全件)」に
  STATE.activeType = 'all';
  const typeSelect = document.getElementById('drugTypeSelect');
  if (typeSelect) typeSelect.value = 'all';
  const typeRadios = document.querySelectorAll('input[name="drugType"]');
  typeRadios.forEach(r => {
    if (r.value === 'all') r.checked = true;
    else r.checked = false;
  });

  // 5. 製薬会社フィルター全解除（全社表示）
  STATE.selectedCompanies.clear();
  renderCompanyDropdown();

  // 6. 剤形フィルター全解除（全剤形表示）
  STATE.selectedDosageForms.clear();
  renderDosageFormDropdown();

  // 7. 処方番号入力クリア
  const pInput = document.getElementById('prescriptionNumberInput');
  if (pInput) pInput.value = '';
  STATE.prescriptionNumber = '';

  // 8. 五十音クリア
  STATE.activeGojuon = 'all';
  renderGojuonBar();

  // 9. ブックマークフィルター初期化
  STATE.activeBookmarkFilter = 'all';
  updateBookmarkCounts();

  // 10. ローカルストレージの保存条件も初期化
  try {
    localStorage.removeItem('kampo_filter_preferences');
  } catch (e) {}

  // 11. 描画更新
  STATE.displayCount = 36;
  applyFilterAndSearch();
}

// 生薬除外（「□を除く」）の切り替え
function toggleExcludeHerb(checked) {
  STATE.excludeHerb = !!checked;
  const label = document.getElementById('excludeHerbLabel');
  const text = document.getElementById('excludeHerbText');
  const checkbox = document.getElementById('excludeHerbCheckbox');
  const searchInput = document.getElementById('searchInput');

  if (checkbox) checkbox.checked = STATE.excludeHerb;

  if (STATE.excludeHerb) {
    if (label) {
      label.classList.add('bg-rose-50', 'text-rose-700', 'border-rose-300', 'font-bold');
      label.classList.remove('bg-slate-100', 'text-slate-600', 'border-slate-200');
    }
    if (text) {
      text.classList.add('text-rose-700');
      text.classList.remove('text-slate-700');
    }
    // 除外チェック時は検索対象を生薬名に自動セット
    if (STATE.searchTarget !== 'ingredient') {
      setSearchTarget('ingredient');
    }
    if (searchInput) {
      searchInput.placeholder = '除外したい生薬名を入力（例: 麻黄、甘草、附子）...';
    }
  } else {
    if (label) {
      label.classList.remove('bg-rose-50', 'text-rose-700', 'border-rose-300', 'font-bold');
      label.classList.add('bg-slate-100', 'text-slate-600', 'border-slate-200');
    }
    if (text) {
      text.classList.remove('text-rose-700');
      text.classList.add('text-slate-700');
    }
    if (searchInput && STATE.searchTarget === 'ingredient') {
      searchInput.placeholder = '生薬名で検索（漢字・ひらがな・カタカナ対応 例: 甘草、かんぞう、カンゾウ）...';
    }
  }

  STATE.displayCount = 36;
  applyFilterAndSearch();
}

// 検索対象の切り替え（すべて を廃止し、商品名・生薬名・効能効果の3種）
function setSearchTarget(target) {
  // 'all' が渡された場合はデフォルトの 'name' にフォールバック
  if (target === 'all') target = 'name';
  STATE.searchTarget = target;
  
  const targets = ['name', 'ingredient', 'efficacy'];
  targets.forEach(t => {
    const btn = document.getElementById(`searchTarget-${t}`);
    if (btn) {
      if (t === target) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  });

  // 「生薬名」選択時のみ「□を除く」を表示、それ以外は非表示にし除外も自動解除
  const excludeContainer = document.getElementById('excludeHerbContainer');
  if (excludeContainer) {
    if (target === 'ingredient') {
      excludeContainer.classList.remove('hidden');
    } else {
      excludeContainer.classList.add('hidden');
      if (STATE.excludeHerb) {
        STATE.excludeHerb = false;
        const checkbox = document.getElementById('excludeHerbCheckbox');
        if (checkbox) checkbox.checked = false;
        const label = document.getElementById('excludeHerbLabel');
        const text = document.getElementById('excludeHerbText');
        if (label) {
          label.classList.remove('bg-rose-50', 'text-rose-700', 'border-rose-300', 'font-bold');
          label.classList.add('bg-slate-100', 'text-slate-600', 'border-slate-200');
        }
        if (text) {
          text.classList.remove('text-rose-700');
          text.classList.add('text-slate-700');
        }
      }
    }
  }

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    if (target === 'name') {
      searchInput.placeholder = '処方名、商品名で検索（漢字・ひらがな・カタカナ対応 例: 葛根湯、かっこんとう）...';
    } else if (target === 'ingredient') {
      searchInput.placeholder = STATE.excludeHerb 
        ? '除外したい生薬名を入力（例: 麻黄、甘草、附子）...' 
        : '生薬名で検索（漢字・ひらがな・カタカナ対応 例: 甘草、かんぞう、カンゾウ）...';
    } else if (target === 'efficacy') {
      searchInput.placeholder = '効能効果・症状で検索（例: 頭痛、肩こり、冷え）...';
    }
  }

  STATE.displayCount = 36;
  applyFilterAndSearch();
}

// 製薬会社 複数選択プルダウンの描画
function renderCompanyDropdown() {
  const listEl = document.getElementById('companyCheckboxList');
  const labelEl = document.getElementById('companyDropdownLabel');
  if (!listEl) return;

  const counts = {};
  STATE.items.forEach(it => {
    counts[it.company] = (counts[it.company] || 0) + 1;
  });

  listEl.innerHTML = COMPANIES.map(c => {
    const count = counts[c.id] || 0;
    if (count === 0) return '';
    const isChecked = STATE.selectedCompanies.has(c.id);
    return `
      <label class="flex items-center justify-between text-xs p-1 rounded hover:bg-slate-50 cursor-pointer select-none">
        <div class="flex items-center gap-2">
          <input 
            type="checkbox" 
            value="${c.id}" 
            ${isChecked ? 'checked' : ''} 
            onchange="onCompanyCheckChange(this)"
            class="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
          >
          <span class="text-slate-800">${c.name}</span>
        </div>
        <span class="text-[10px] text-slate-400 font-mono">${count}</span>
      </label>
    `;
  }).join('');

  if (labelEl) {
    if (STATE.selectedCompanies.size === 0) {
      labelEl.textContent = '製薬会社: 全社';
    } else if (STATE.selectedCompanies.size === 1) {
      const selectedId = Array.from(STATE.selectedCompanies)[0];
      const comp = COMPANIES.find(c => c.id === selectedId);
      labelEl.textContent = `製薬会社: ${comp ? comp.name : '1社'}`;
    } else {
      const firstId = Array.from(STATE.selectedCompanies)[0];
      const comp = COMPANIES.find(c => c.id === firstId);
      labelEl.textContent = `製薬会社: ${comp ? comp.name : ''} (+${STATE.selectedCompanies.size - 1})`;
    }
  }
}

function onCompanyCheckChange(cb) {
  if (cb.checked) {
    STATE.selectedCompanies.add(cb.value);
  } else {
    STATE.selectedCompanies.delete(cb.value);
  }
  renderCompanyDropdown();
  STATE.displayCount = 36;
  applyFilterAndSearch();
}

function selectAllCompanies() {
  COMPANIES.forEach(c => STATE.selectedCompanies.add(c.id));
  renderCompanyDropdown();
  STATE.displayCount = 36;
  applyFilterAndSearch();
}

function clearAllCompanies() {
  STATE.selectedCompanies.clear();
  renderCompanyDropdown();
  STATE.displayCount = 36;
  applyFilterAndSearch();
}

function toggleCompanyDropdown() {
  const menu = document.getElementById('companyDropdownMenu');
  if (menu) menu.classList.toggle('hidden');
}

// 剤形 複数選択プルダウンの描画
function renderDosageFormDropdown() {
  const listEl = document.getElementById('dosageFormCheckboxList');
  const labelEl = document.getElementById('dosageFormDropdownLabel');
  if (!listEl) return;

  const counts = {};
  STATE.items.forEach(it => {
    const form = it.dosageForm || 'その他';
    counts[form] = (counts[form] || 0) + 1;
  });

  listEl.innerHTML = DOSAGE_FORMS.map(form => {
    const count = counts[form] || 0;
    if (count === 0) return '';
    const isChecked = STATE.selectedDosageForms.has(form);
    return `
      <label class="flex items-center justify-between text-xs p-1 rounded hover:bg-slate-50 cursor-pointer select-none">
        <div class="flex items-center gap-2">
          <input 
            type="checkbox" 
            value="${form}" 
            ${isChecked ? 'checked' : ''} 
            onchange="onDosageFormCheckChange(this)"
            class="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
          >
          <span class="text-slate-800">${form}</span>
        </div>
        <span class="text-[10px] text-slate-400 font-mono">${count}</span>
      </label>
    `;
  }).join('');

  if (labelEl) {
    if (STATE.selectedDosageForms.size === 0) {
      labelEl.textContent = '剤形: 全て';
    } else if (STATE.selectedDosageForms.size === 1) {
      const selected = Array.from(STATE.selectedDosageForms)[0];
      labelEl.textContent = `剤形: ${selected}`;
    } else {
      const first = Array.from(STATE.selectedDosageForms)[0];
      labelEl.textContent = `剤形: ${first} (+${STATE.selectedDosageForms.size - 1})`;
    }
  }
}

function onDosageFormCheckChange(cb) {
  if (cb.checked) {
    STATE.selectedDosageForms.add(cb.value);
  } else {
    STATE.selectedDosageForms.delete(cb.value);
  }
  renderDosageFormDropdown();
  STATE.displayCount = 36;
  applyFilterAndSearch();
}

function selectAllDosageForms() {
  DOSAGE_FORMS.forEach(f => STATE.selectedDosageForms.add(f));
  renderDosageFormDropdown();
  STATE.displayCount = 36;
  applyFilterAndSearch();
}

function clearAllDosageForms() {
  STATE.selectedDosageForms.clear();
  renderDosageFormDropdown();
  STATE.displayCount = 36;
  applyFilterAndSearch();
}

function toggleDosageFormDropdown() {
  const menu = document.getElementById('dosageFormDropdownMenu');
  if (menu) menu.classList.toggle('hidden');
}

// ドロップダウン外クリックで閉じる
document.addEventListener('click', (e) => {
  const companyBtn = document.getElementById('companyDropdownBtn');
  const companyMenu = document.getElementById('companyDropdownMenu');
  if (companyBtn && companyMenu && !companyBtn.contains(e.target) && !companyMenu.contains(e.target)) {
    companyMenu.classList.add('hidden');
  }

  const dosageBtn = document.getElementById('dosageFormDropdownBtn');
  const dosageMenu = document.getElementById('dosageFormDropdownMenu');
  if (dosageBtn && dosageMenu && !dosageBtn.contains(e.target) && !dosageMenu.contains(e.target)) {
    dosageMenu.classList.add('hidden');
  }
});

// 五十音バー描画
function renderGojuonBar() {
  const container = document.getElementById('gojuonBar');
  if (!container) return;

  container.innerHTML = GOJUON_GROUPS.map(g => {
    const isActive = STATE.activeGojuon === g.value;
    return `
      <button 
        data-gojuon="${g.value}" 
        class="gojuon-btn px-2.5 py-0.5 text-xs rounded ${isActive ? 'active' : ''}">
        ${g.label}
      </button>
    `;
  }).join('');

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.activeGojuon = btn.dataset.gojuon;
      STATE.displayCount = 36;
      renderGojuonBar();
      applyFilterAndSearch();
    });
  });
}

// フィルタリング & 検索（漢字・ひらがな・カタカナ全対応 ＆ ブックマーク ＆ スペースAND検索）
function applyFilterAndSearch() {
  const rawQuery = (STATE.searchQuery || '').trim();
  const searchTokens = rawQuery ? rawQuery.split(/[\s　]+/).map(t => {
    const norm = normalizeText(t);
    return {
      raw: norm,
      hira: kataToHira(norm),
      kata: hiraToKata(norm)
    };
  }).filter(t => t.raw.length > 0) : [];

  const selectedGroup = GOJUON_GROUPS.find(g => g.value === STATE.activeGojuon);
  const target = STATE.searchTarget;
  const bmFilter = STATE.activeBookmarkFilter;
  
  STATE.filteredItems = STATE.items.filter(item => {
    // ブックマークフィルター
    if (bmFilter === 'bm1') {
      const key = getItemKey(item);
      if (!STATE.bookmarks1.has(key)) return false;
    } else if (bmFilter === 'bm2') {
      const key = getItemKey(item);
      if (!STATE.bookmarks2.has(key)) return false;
    }

    // 会社フィルター
    if (STATE.selectedCompanies.size > 0 && !STATE.selectedCompanies.has(item.company)) {
      return false;
    }

    // 剤形フィルター
    if (STATE.selectedDosageForms.size > 0 && !STATE.selectedDosageForms.has(item.dosageForm)) {
      return false;
    }
    
    // 区分フィルター
    if (STATE.activeType !== 'all' && item.type !== STATE.activeType) {
      return false;
    }
    
    // 五十音フィルター
    if (selectedGroup && selectedGroup.value !== 'all') {
      const targetSortKey = item.subCategorySortKey || item.sortKey || '';
      if (!selectedGroup.regex.test(targetSortKey)) {
        return false;
      }
    }
    
    // 検索語句フィルター（漢字・ひらがな・カタカナ完全対応AND一致）
    if (searchTokens.length > 0) {
      const normName = normalizeText(item.name);
      const normSub = normalizeText(item.subCategory);
      const normRaw = normalizeText(item.rawName);
      const normCompany = normalizeText(item.companyName);
      const normFormulaNo = item.formulaNo ? normalizeText(item.formulaNo) : '';
      const normEfficacy = item.efficacy ? normalizeText(item.efficacy) : '';
      const searchReadings = normalizeText(item.searchReadings || '');
      
      const herbNorms = Array.isArray(item.ingredients) 
        ? item.ingredients.map(ing => ({
            name: normalizeText(ing.name),
            hira: kataToHira(normalizeText(ing.name)),
            kata: hiraToKata(normalizeText(ing.name))
          }))
        : [];

      const normSearchName = normalizeText(item.searchName || '');
      const normSearchHerbs = normalizeText(item.searchHerbs || '');
      const normSearchAll = normalizeText(item.searchAll || '');
      const normPrescriptionNo = item.prescriptionNumber ? String(item.prescriptionNumber) : '';
      const normCompanyNo = item.companyNumber ? String(item.companyNumber) : '';

      for (const token of searchTokens) {
        let matched = false;

        if (STATE.excludeHerb) {
          // 生薬除外モード（指定された生薬を含む商品を100%除外）
          const hasHerb = normSearchHerbs.includes(token.raw) || normSearchHerbs.includes(token.hira) || normSearchHerbs.includes(token.kata) ||
                    herbNorms.some(hn => 
                      hn.name.includes(token.raw) || hn.name.includes(token.hira) || hn.name.includes(token.kata) ||
                      hn.hira.includes(token.raw) || hn.hira.includes(token.hira) ||
                      hn.kata.includes(token.raw) || hn.kata.includes(token.kata)
                    ) || searchReadings.includes(token.raw) || searchReadings.includes(token.hira) || searchReadings.includes(token.kata);

          if (hasHerb) return false; // 含有している場合は即座に除外
          matched = true;
        } else if (target === 'name') {
          // 商品名・処方名・処方番号（漢字、ひらがな、カタカナ、番号）※生薬読み仮名は除外
          matched = normName.includes(token.raw) || normName.includes(token.hira) || normName.includes(token.kata) ||
                    normSub.includes(token.raw) || normSub.includes(token.hira) || normSub.includes(token.kata) ||
                    normRaw.includes(token.raw) || normRaw.includes(token.hira) || normRaw.includes(token.kata) ||
                    normSearchName.includes(token.raw) || normSearchName.includes(token.hira) || normSearchName.includes(token.kata) ||
                    normFormulaNo === token.raw || normPrescriptionNo === token.raw || normCompanyNo === token.raw;
        } else if (target === 'ingredient') {
          // 生薬名のみ（漢字、ひらがな、カタカナ、混じり表記展開）
          matched = normSearchHerbs.includes(token.raw) || normSearchHerbs.includes(token.hira) || normSearchHerbs.includes(token.kata) ||
                    herbNorms.some(hn => 
                      hn.name.includes(token.raw) || hn.name.includes(token.hira) || hn.name.includes(token.kata) ||
                      hn.hira.includes(token.raw) || hn.hira.includes(token.hira) ||
                      hn.kata.includes(token.raw) || hn.kata.includes(token.kata)
                    ) || searchReadings.includes(token.raw) || searchReadings.includes(token.hira) || searchReadings.includes(token.kata);
        } else if (target === 'efficacy') {
          // 効能効果のみ
          matched = normEfficacy.includes(token.raw) || normEfficacy.includes(token.hira) || normEfficacy.includes(token.kata);
        } else {
          // すべて（処方名、商品名、生薬名、効能効果、会社名、処方番号）
          matched = normSearchAll.includes(token.raw) || normSearchAll.includes(token.hira) || normSearchAll.includes(token.kata) ||
                    normName.includes(token.raw) || normName.includes(token.hira) || normName.includes(token.kata) ||
                    normSub.includes(token.raw) || normSub.includes(token.hira) || normSub.includes(token.kata) ||
                    normRaw.includes(token.raw) || normRaw.includes(token.hira) || normRaw.includes(token.kata) ||
                    normSearchName.includes(token.raw) || normSearchName.includes(token.hira) || normSearchName.includes(token.kata) ||
                    normSearchHerbs.includes(token.raw) || normSearchHerbs.includes(token.hira) || normSearchHerbs.includes(token.kata) ||
                    normCompany.includes(token.raw) || normFormulaNo === token.raw || normPrescriptionNo === token.raw || normCompanyNo === token.raw ||
                    normEfficacy.includes(token.raw) || normEfficacy.includes(token.hira) || normEfficacy.includes(token.kata);
        }

        if (!matched) return false;
      }
    }
    
    return true;
  });

    // 厳格な処方名五十音順ソート（第一: 処方名純粋ひらがな、第二: 区分、第三: 商品名）
  STATE.filteredItems.sort((a, b) => {
    const k1 = a.subCategorySortKey || '';
    const k2 = b.subCategorySortKey || '';
    const cmp = k1.localeCompare(k2, 'ja');
    if (cmp !== 0) return cmp;

    if (a.type !== b.type) {
      return a.type === 'medical' ? -1 : 1;
    }

    const n1 = a.sortKey || a.name || '';
    const n2 = b.sortKey || b.name || '';
    return n1.localeCompare(n2, 'ja');
  });

  renderResults();
}

// 一覧描画（会社別カラーバッジ、区分、剤形バッジ、★1・★2ブックマークボタンを反映）
function renderResults() {
  const listEl = document.getElementById('itemList');
  const countEl = document.getElementById('resultCount');
  const loadMoreBtn = document.getElementById('loadMoreContainer');
  
  if (!listEl) return;
  
  if (countEl) {
    if (STATE.excludeHerb && STATE.searchQuery.trim()) {
      countEl.innerHTML = `<span class="text-rose-700 font-bold">${STATE.filteredItems.length.toLocaleString()} 件</span> <span class="text-[11px] text-rose-600 font-normal">（「${escapeHtml(STATE.searchQuery.trim())}」を除く）</span>`;
    } else {
      countEl.textContent = `${STATE.filteredItems.length.toLocaleString()} 件`;
    }
  }
  
  if (STATE.filteredItems.length === 0) {
    listEl.innerHTML = `
      <div class="col-span-full py-10 text-center text-slate-500 bg-white rounded border border-slate-200">
        <p class="font-medium text-xs">該当する漢方製剤が見つかりませんでした</p>
        <p class="text-[11px] text-slate-400 mt-0.5">別の処方名・生薬名・剤形でお試しください（ひらがな・カタカナ・漢字に対応）</p>
      </div>
    `;
    if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
    return;
  }
  
  const displaySlice = STATE.filteredItems.slice(0, STATE.displayCount);
  
  listEl.innerHTML = displaySlice.map((item, idx) => {
    const isMedical = item.type === 'medical';
    const badgeClass = getCompanyBadgeClass(item.company);
    const dosageForm = item.dosageForm || 'その他';
    const globalIdx = typeof item._globalIndex === 'number' ? item._globalIndex : STATE.items.indexOf(item);
    
    const key = getItemKey(item);
    const isBm1 = STATE.bookmarks1.has(key);
    const isBm2 = STATE.bookmarks2.has(key);
    const isCompareSelected = STATE.selectedCompareItems.has(globalIdx);

    return `
      <div 
        id="productCard-${globalIdx}" 
        class="compact-card p-2.5 flex flex-col justify-between cursor-pointer transition ${isCompareSelected ? 'compare-selected' : ''}" 
        onclick="handleCardClick(${globalIdx})">
        <div>
          <!-- 上部バッジ（会社別カラー、区分、剤形 ＆ しおり型ブックマークアイコン） -->
          <div class="flex items-center justify-between gap-1 mb-1.5 text-xs">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="px-2 py-0.5 rounded text-[11px] font-bold border ${badgeClass}">
                ${item.companyName}
              </span>
              <span class="px-1.5 py-0.2 rounded text-[11px] font-medium ${isMedical ? 'bg-slate-700 text-white border border-slate-800' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                ${isMedical ? '医療用' : 'OTC'}
              </span>
              <span class="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                ${dosageForm}
              </span>
            </div>

            <!-- しおり型ブックマークボタン（しおり1 ＆ しおり2 横並び独立選択） -->
            <div class="flex items-center gap-0.5">
              <button 
                type="button" 
                onclick="event.stopPropagation(); toggleBookmark(${globalIdx}, 1)" 
                class="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-amber-500 transition cursor-pointer" 
                title="ブックマーク1に追加/解除">
                <svg id="cardBmIcon-1-${globalIdx}" class="w-4 h-4 transition" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="${isBm1 ? '#f59e0b' : 'none'}" stroke="${isBm1 ? '#d97706' : '#94a3b8'}"/>
                </svg>
              </button>
              <button 
                type="button" 
                onclick="event.stopPropagation(); toggleBookmark(${globalIdx}, 2)" 
                class="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-500 transition cursor-pointer" 
                title="ブックマーク2に追加/解除">
                <svg id="cardBmIcon-2-${globalIdx}" class="w-4 h-4 transition" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="${isBm2 ? '#3b82f6' : 'none'}" stroke="${isBm2 ? '#2563eb' : '#94a3b8'}"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 商品名（上段・大きく太字・メイン） -->
          <h3 class="text-sm font-bold text-slate-900 line-clamp-1 mb-0.5" title="${item.rawName || item.name}">
            ${item.rawName || item.name}
          </h3>

          <!-- 小分類 / 処方名（下段・小さめ・落ち着いた色・サブ） -->
          <p class="text-xs text-slate-500 line-clamp-1">
            ${item.subCategory || item.formulaName || ''}
          </p>
        </div>
      </div>
    `;
  }).join('');
  
  if (loadMoreBtn) {
    if (STATE.filteredItems.length > STATE.displayCount) {
      loadMoreBtn.classList.remove('hidden');
      const countRest = STATE.filteredItems.length - STATE.displayCount;
      document.getElementById('loadMoreText').textContent = `さらに表示する (残り ${countRest.toLocaleString()} 件)`;
    } else {
      loadMoreBtn.classList.add('hidden');
    }
  }
}

// 単一生薬バーHTMLの生成関数（インデントは削除して左揃え）
function renderSingleHerbBar(ing, maxAmount) {
  const pct = maxAmount > 0 ? Math.round(((ing.amount || 0) / maxAmount) * 100) : 0;
  const amountDisplay = formatHerbAmount(ing.amount, ing.amountStr);
  const displayName = cleanHerbName(ing.name);
  return `
    <div>
      <div class="flex items-center justify-between text-xs mb-0.5">
        <span class="font-medium ${ing.isExtract ? 'text-emerald-900 font-bold' : 'text-slate-800'}">
          ${displayName} ${ing.isExtract ? '(エキス)' : ''}
        </span>
        <span class="font-mono text-slate-600">${amountDisplay}</span>
      </div>
      <div class="herb-bar-bg">
        <div class="herb-bar-fill ${ing.isExtract ? 'extract' : ''}" style="width: ${pct}%"></div>
      </div>
    </div>
  `;
}

// 詳細画面内の構成生薬リスト描画（段ずれ分割・インデント削除・独立ソート対応）
function renderDetailHerbsHtml(ingredients) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return `<p class="text-xs text-slate-400">成分情報なし</p>`;
  }

  // 全ての生薬名のインデント（前後の空白・全角スペース・タブ）を完全削除して左揃え
  const cleanedIngredients = ingredients.map(x => ({
    ...x,
    cleanName: cleanHerbName(x.name)
  }));

  const extracts = cleanedIngredients.filter(x => x.isExtract);
  const nonExtracts = cleanedIngredients.filter(x => !x.isExtract);

  // 生薬末（「末」または「粉」で終わる生薬）と原料生薬の判定
  const powders = nonExtracts.filter(x => x.cleanName.endsWith('末') || x.cleanName.endsWith('粉'));
  const rawHerbs = nonExtracts.filter(x => !(x.cleanName.endsWith('末') || x.cleanName.endsWith('粉')));

  // 段がずれている（原料生薬 と 生薬末 の両方が存在する場合）
  const isSplit = (extracts.length > 0 || rawHerbs.length > 0) && powders.length > 0 && rawHerbs.length > 0;

  // ソート用ヘルパー
  const sortHerbs = (list) => {
    const arr = [...list];
    if (STATE.herbSortOrder === 'name') {
      arr.sort((a, b) => a.cleanName.localeCompare(b.cleanName, 'ja'));
    } else {
      arr.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    }
    return arr;
  };

  const maxAmount = Math.max(...cleanedIngredients.map(ing => ing.amount || 0), 1);

  if (isSplit) {
    // 混ぜずに分割してブロック表示
    const sortedRaw = sortHerbs(rawHerbs);
    const sortedPowders = sortHerbs(powders);

    return `
      <div class="space-y-4">
        <!-- 1. エキスおよび原料生薬ブロック -->
        <div class="space-y-2">
          <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700 pb-1 border-b border-slate-200">
            <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span>${extracts.length > 0 ? 'エキス原料生薬' : '原料生薬'}</span>
          </div>
          <div class="space-y-1.5">
            ${extracts.map(ext => renderSingleHerbBar(ext, maxAmount)).join('')}
            ${sortedRaw.map(h => renderSingleHerbBar(h, maxAmount)).join('')}
          </div>
        </div>

        <!-- 2. 生薬末ブロック（段外れ配合成分） -->
        <div class="space-y-2 pt-1">
          <div class="flex items-center gap-1.5 text-xs font-bold text-slate-700 pb-1 border-b border-slate-200">
            <span class="w-2 h-2 rounded-full bg-amber-600"></span>
            <span>生薬末（原末配合）</span>
          </div>
          <div class="space-y-1.5">
            ${sortedPowders.map(h => renderSingleHerbBar(h, maxAmount)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // 通常処方（分割なし）
  const sortedHerbs = sortHerbs(nonExtracts);
  const combined = [...extracts, ...sortedHerbs];
  return `
    <div class="space-y-1.5">
      ${combined.map(ing => renderSingleHerbBar(ing, maxAmount)).join('')}
    </div>
  `;
}

// 生薬ソート順切り替え
function switchHerbSort(order) {
  STATE.herbSortOrder = order;
  const container = document.getElementById('detailHerbsContainer');
  const btnAmount = document.getElementById('herbSortBtnAmount');
  const btnName = document.getElementById('herbSortBtnName');

  if (container && STATE.activeItem) {
    container.innerHTML = renderDetailHerbsHtml(STATE.activeItem.ingredients);
  }

  if (btnAmount && btnName) {
    if (order === 'amount') {
      btnAmount.classList.add('active');
      btnName.classList.remove('active');
    } else {
      btnName.classList.add('active');
      btnAmount.classList.remove('active');
    }
  }
}

// インデックスから直接詳細モーダルを開く（比較表からのジャンプ用・確実性100%）
function openDetailModalByIndex(idx) {
  const item = STATE.items[idx];
  if (item) {
    openDetailModalDirect(item);
  }
}

// アイテムのURLまたは名前から詳細モーダルを開く（フォールバック用）
function openItemDetailByName(nameOrRawName) {
  let decoded = nameOrRawName;
  try {
    decoded = decodeURIComponent(nameOrRawName);
  } catch (e) {}
  const targetNorm = normalizeText(decoded);
  const found = STATE.items.find(it => normalizeText(it.name) === targetNorm || normalizeText(it.rawName) === targetNorm);
  if (found) {
    openDetailModalDirect(found);
  }
}

// 包括的な小分類名（比較マッチングから除外すべき大分類）の判定
const GENERIC_COMPARE_CATEGORIES = new Set([
  '生薬製剤',
  '生薬主薬製剤',
  '調剤用生薬',
  '調剤用',
  '単味生薬',
  '局方生薬',
  'その他の漢方製剤',
  '生薬製剤（他の薬効群に属さない製剤）',
  '生薬',
  '一般用漢方製剤',
  '婦人薬',
  '健胃薬',
  '止瀉薬',
  '強心薬',
  '胃腸薬',
  '化膿性疾患用薬',
  '殺菌消毒薬'
]);

function isGenericCategory(name) {
  if (!name) return true;
  const cleaned = name.trim();
  return GENERIC_COMPARE_CATEGORIES.has(cleaned) || 
         cleaned.includes('生薬製剤') || 
         cleaned.includes('生薬主薬製剤') || 
         cleaned.includes('調剤用生薬') || 
         cleaned.includes('調剤用');
}

// 単味原料生薬（日本薬局方調剤用生薬など）の判定
function isSingleHerbItem(item) {
  if (!item) return false;
  if (item.subCategory === '生薬' || item.classification === '生薬') return true;
  if (item.subCategory && (item.subCategory.includes('調剤用生薬') || item.subCategory.includes('調剤用'))) return true;
  const ings = item.ingredients || [];
  const realHerbs = ings.filter(ing => !ing.isExtract && ing.name);
  if (realHerbs.length <= 1) {
    if (item.name.includes('の生薬') || item.company === 'tochimoto' || (item.company === 'uchida' && item.name.endsWith('M'))) {
      return true;
    }
    if (ings[0] && (ings[0].amountStr === '調剤用生薬' || ings[0].name.includes('生薬'))) {
      return true;
    }
  }
  return false;
}

// 最上部ヘッダーの「比較」ボタンおよび「ブックマーク」切り替えボタンの表示・非表示制御
function setHeaderActionButtonsVisible(visible) {
  const compareBtn = document.getElementById('compareModeBtn');
  const bookmarkBtn = document.getElementById('bookmarkCycleBtn');
  if (compareBtn) {
    if (visible) compareBtn.classList.remove('hidden');
    else compareBtn.classList.add('hidden');
  }
  if (bookmarkBtn) {
    if (visible) bookmarkBtn.classList.remove('hidden');
    else bookmarkBtn.classList.add('hidden');
  }
}

// 直接アイテムを指定して商品詳細専用ページを開く（独立ページ切り替え ＆ スクロール位置記録）
function openDetailPage(item, updateHash = true) {
  if (!item) return;

  // 検索一覧ビューからの遷移時、スクロール位置を確実に記憶
  if (STATE.currentView === 'search') {
    STATE.lastScrollPosition = window.scrollY || document.documentElement.scrollTop || 0;
  }

  STATE.activeItem = item;
  STATE.herbSortOrder = 'name';
  STATE.currentView = 'detail';

  const mainView = document.getElementById('mainSearchView');
  const compareView = document.getElementById('comparePageView');
  const detailView = document.getElementById('detailPageView');
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.add('hidden');

  if (mainView) mainView.classList.add('hidden');
  if (compareView) compareView.classList.add('hidden');
  if (detailView) detailView.classList.remove('hidden');

  // 詳細画面では比較ボタンとブックマーク切り替えボタンを非表示
  setHeaderActionButtonsVisible(false);

  const globalIdx = typeof item._globalIndex === 'number' ? item._globalIndex : STATE.items.indexOf(item);
  if (updateHash) {
    history.pushState(null, '', `#/detail?idx=${globalIdx}`);
  }
  window.scrollTo({ top: 0, behavior: 'instant' });

  renderDetailPageContent(item);
}

// 商品詳細専用ページのコンテンツ描画
function renderDetailPageContent(item) {
  const content = document.getElementById('detailPageContent');
  if (!content || !item) return;

  const isMedical = item.type === 'medical';
  const badgeClass = getCompanyBadgeClass(item.company);
  const dosageForm = item.dosageForm || 'その他';
  const globalIdx = typeof item._globalIndex === 'number' ? item._globalIndex : STATE.items.indexOf(item);

  const key = getItemKey(item);
  const isBm1 = STATE.bookmarks1.has(key);
  const isBm2 = STATE.bookmarks2.has(key);

  const cleanedFeature = cleanDisplayText(item.feature || item.description || '');
  const cleanedEfficacy = cleanDisplayText(item.efficacy);
  const cleanedUsage = cleanDisplayText(item.usage);
  const cleanedPrecautions = cleanDisplayText(item.precautions);
  const cleanedAdditivesText = cleanAdditives(item.additives);
  const formattedDailyDose = formatDailyDose(item.dailyDose);

  content.innerHTML = `
    <!-- ヘッダー -->
    <div class="p-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3 flex-wrap">
      <div class="flex-1 min-w-[240px]">
        <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span class="px-2 py-0.5 rounded text-xs font-bold border ${badgeClass}">
            ${item.companyName}
          </span>
          <span class="px-2 py-0.5 rounded text-xs font-medium ${isMedical ? 'bg-slate-700 text-white border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
            ${isMedical ? '医療用医薬品' : '一般用医薬品(OTC)'}
          </span>
          <span class="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            ${dosageForm}
          </span>
        </div>

        <!-- 商品名 ＆ 比較表を見るボタン ＆ しおり型ブックマーク -->
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <h2 class="text-lg font-bold text-slate-900 leading-snug" title="${item.rawName || item.name}">
            ${item.rawName || item.name}
          </h2>
          
          <!-- 右側ツール群: 「比較表を見る」ボタン ＆ ブックマーク2つ -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- 比較表を見るボタン（単味生薬等は自動非表示） -->
            ${(() => {
              if (isSingleHerbItem(item)) return '';
              const compareTarget = (!isGenericCategory(item.subCategory) && item.subCategory) ? item.subCategory : item.name;
              if (isGenericCategory(compareTarget)) return '';
              return `
                <button 
                  type="button" 
                  onclick="openComparePage('${encodeURIComponent(compareTarget)}')" 
                  class="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-xs rounded shadow-2xs transition cursor-pointer flex items-center gap-1.5 shrink-0" 
                  title="「${compareTarget}」の他社比較表を開く">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  <span>他社比較表を見る</span>
                </button>
              `;
            })()}

            <!-- 詳細画面内しおり型ブックマーク（しおり1 ＆ しおり2） -->
            <div class="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200 px-2 py-1 rounded shadow-2xs">
              <button 
                type="button" 
                onclick="toggleBookmark(${globalIdx}, 1)" 
                class="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-amber-500 transition cursor-pointer" 
                title="ブックマーク1に追加/解除">
                <svg id="modalBmIcon-1-${globalIdx}" class="w-4 h-4 transition" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="${isBm1 ? '#f59e0b' : 'none'}" stroke="${isBm1 ? '#d97706' : '#94a3b8'}"/>
                </svg>
              </button>
              <button 
                type="button" 
                onclick="toggleBookmark(${globalIdx}, 2)" 
                class="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-500 transition cursor-pointer" 
                title="ブックマーク2に追加/解除">
                <svg id="modalBmIcon-2-${globalIdx}" class="w-4 h-4 transition" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="${isBm2 ? '#3b82f6' : 'none'}" stroke="${isBm2 ? '#2563eb' : '#94a3b8'}"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 小分類 / 処方名（下段・小さめ・落ち着いた色・サブ） -->
        <p class="text-xs text-slate-500 mt-1">${item.subCategory || item.formulaName || ''}</p>
      </div>
    </div>
    
    <!-- 内容（各項目アコーディオン） -->
    <div class="p-4 sm:p-5 space-y-3.5 text-xs">
      
      <!-- 1. 効能または効果（デフォルト展開: open） -->
      ${cleanedEfficacy ? `
        <details open class="group bg-slate-50 border border-slate-200 rounded overflow-hidden">
          <summary class="p-3 font-bold text-xs text-slate-800 bg-slate-100/80 hover:bg-slate-200/70 cursor-pointer flex items-center justify-between transition select-none list-none">
            <span class="flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              効能または効果
            </span>
          </summary>
          <div class="p-3.5 text-xs text-slate-700 leading-relaxed border-t border-slate-200 bg-white whitespace-pre-line">${cleanedEfficacy}</div>
        </details>
      ` : ''}

      <!-- 2. 製品の特徴（添付文書に特徴がある場合のみ表示、無い場合はスキップ・デフォルト最小化） -->
      ${cleanedFeature ? `
        <details class="group bg-slate-50 border border-slate-200 rounded overflow-hidden">
          <summary class="p-3 font-bold text-xs text-slate-800 bg-slate-100/80 hover:bg-slate-200/70 cursor-pointer flex items-center justify-between transition select-none list-none">
            <span class="flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              製品の特徴
            </span>
          </summary>
          <div class="p-3.5 text-xs text-slate-700 leading-relaxed border-t border-slate-200 bg-white whitespace-pre-line">${cleanedFeature}</div>
        </details>
      ` : ''}

      <!-- 3. 構成生薬・分量（デフォルト展開: open ＆ 段ずれ分割・インデント削除対応） -->
      <details open class="group bg-slate-50 border border-slate-200 rounded overflow-hidden">
        <summary class="p-3 font-bold text-xs text-slate-800 bg-slate-100/80 hover:bg-slate-200/70 cursor-pointer flex items-center justify-between transition select-none list-none">
          <span class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            構成生薬・分量
          </span>
          <div class="inline-flex rounded-md shadow-2xs mr-1" onclick="event.stopPropagation()">
            <button 
              type="button" 
              id="herbSortBtnAmount" 
              onclick="switchHerbSort('amount')" 
              class="herb-sort-btn rounded-l text-[10px] py-0.5 px-2.5">
              多い順
            </button>
            <button 
              type="button" 
              id="herbSortBtnName" 
              onclick="switchHerbSort('name')" 
              class="herb-sort-btn active rounded-r -ml-px text-[10px] py-0.5 px-2.5">
              五十音順
            </button>
          </div>
        </summary>
        <div class="p-3.5 text-xs border-t border-slate-200 bg-white">
          <div id="detailHerbsContainer" class="space-y-1.5">
            ${renderDetailHerbsHtml(item.ingredients)}
          </div>
        </div>
      </details>

      <!-- 4. 用法および用量（デフォルト展開: open） -->
      <details open class="group bg-slate-50 border border-slate-200 rounded overflow-hidden">
        <summary class="p-3 font-bold text-xs text-slate-800 bg-slate-100/80 hover:bg-slate-200/70 cursor-pointer flex items-center justify-between transition select-none list-none">
          <span class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            用法および用量
          </span>
          <span class="font-normal text-[11px] text-slate-500 mr-1 font-mono">1日服用量: ${formattedDailyDose}</span>
        </summary>
        <div class="p-3.5 text-xs text-slate-700 leading-relaxed border-t border-slate-200 bg-white space-y-2.5">
          <div class="flex items-center gap-2">
            <span class="font-bold text-slate-800">1日服用量:</span>
            <span class="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold text-slate-900">${formattedDailyDose}</span>
          </div>
          ${cleanedUsage ? `
            <div class="whitespace-pre-line text-slate-700 border-t border-slate-100 pt-2">${cleanedUsage}</div>
          ` : ''}
        </div>
      </details>

      <!-- 5. 使用上の注意（デフォルト最小化: 閉じた状態） -->
      ${cleanedPrecautions ? `
        <details class="group bg-slate-50 border border-slate-200 rounded overflow-hidden">
          <summary class="p-3 font-bold text-xs text-slate-800 bg-slate-100/80 hover:bg-slate-200/70 cursor-pointer flex items-center justify-between transition select-none list-none">
            <span class="flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              使用上の注意
            </span>
          </summary>
          <div class="p-3.5 text-xs text-slate-600 leading-relaxed border-t border-slate-200 bg-white max-h-64 overflow-y-auto whitespace-pre-line">${cleanedPrecautions}</div>
        </details>
      ` : ''}

      <!-- 6. 添加物・保管等の注意（デフォルト最小化: 閉じた状態） -->
      ${cleanedAdditivesText ? `
        <details class="group bg-slate-50 border border-slate-200 rounded overflow-hidden">
          <summary class="p-3 font-bold text-xs text-slate-800 bg-slate-100/80 hover:bg-slate-200/70 cursor-pointer flex items-center justify-between transition select-none list-none">
            <span class="flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-slate-500 transition-transform duration-200 group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              添加物・保管及び取扱い上の注意
            </span>
          </summary>
          <div class="p-3.5 text-xs text-slate-600 leading-relaxed border-t border-slate-200 bg-white">
            ${cleanedAdditivesText}
          </div>
        </details>
      ` : ''}

      <!-- 外部リンク -->
      ${item.url ? `
        <div class="pt-2 text-right">
          <a href="${item.url.startsWith('http') ? item.url : 'https://www.kegg.jp/medicus-bin/' + item.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-emerald-800 hover:underline inline-flex items-center gap-1">
            <span>公式添付文書・製品情報ページを開く</span>
            <span>›</span>
          </a>
        </div>
      ` : ''}
    </div>
  `;
}

// 互換用ラッパー（モーダル呼び出しをすべて詳細ページ切り替えへ統一）
function openDetailModalDirect(item) {
  openDetailPage(item);
}

function openDetailModalDirectByIndex(idx) {
  const item = STATE.items[idx];
  if (item) openDetailPage(item);
}

function openDetailPageByIndex(idx) {
  const item = STATE.items[idx];
  if (item) openDetailPage(item);
}

function openDetailModal(idx) {
  const item = STATE.filteredItems[idx];
  if (item) openDetailPage(item);
}

function closeDetailModal() {
  navigateToSearch();
}

// ==========================================================================
// 処方比較 独立ページ（画面遷移）
// ==========================================================================

// 検索一覧へ戻る（スクロール位置完全復元）
function navigateToSearch(updateHash = true) {
  STATE.currentView = 'search';
  const mainView = document.getElementById('mainSearchView');
  const compareView = document.getElementById('comparePageView');
  const detailView = document.getElementById('detailPageView');
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.add('hidden');

  if (mainView) mainView.classList.remove('hidden');
  if (compareView) compareView.classList.add('hidden');
  if (detailView) detailView.classList.add('hidden');

  // 検索一覧では比較ボタンとブックマーク切り替えボタンを再表示
  setHeaderActionButtonsVisible(true);
  
  if (updateHash) {
    history.pushState(null, '', '#/');
  }

  // 以前のスクロール位置へ完全復元
  const savedY = STATE.lastScrollPosition || 0;
  requestAnimationFrame(() => {
    window.scrollTo({ top: savedY, behavior: 'instant' });
  });
}

// 選択商品によるカスタム比較画面へ遷移
function openCustomComparePage(selectedItems, updateHash = true) {
  if (STATE.currentView === 'search') {
    STATE.lastScrollPosition = window.scrollY || document.documentElement.scrollTop || 0;
  }
  STATE.customCompareItems = selectedItems;
  STATE.compareFormula = null; // カスタム比較モード
  STATE.currentView = 'compare';

  STATE.compareSelectedCompanies.clear();
  STATE.compareSelectedTypes = new Set(['medical', 'otc']);

  const mainView = document.getElementById('mainSearchView');
  const compareView = document.getElementById('comparePageView');
  if (mainView) mainView.classList.add('hidden');
  if (compareView) compareView.classList.remove('hidden');

  // 比較画面では比較ボタンとブックマーク切り替えボタンを非表示
  setHeaderActionButtonsVisible(false);

  if (updateHash) {
    history.pushState(null, '', `#/compare?custom=1`);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });

  renderComparePageContent();
}

// 処方比較画面へ遷移
function openComparePage(encodedFormula, updateHash = true) {
  if (STATE.currentView === 'search') {
    STATE.lastScrollPosition = window.scrollY || document.documentElement.scrollTop || 0;
  }
  const formula = decodeURIComponent(encodedFormula);
  STATE.compareFormula = formula;
  STATE.customCompareItems = []; // 処方比較時はカスタムクリア
  STATE.currentView = 'compare';
  
  STATE.compareSelectedCompanies.clear();
  STATE.compareSelectedTypes = new Set(['medical', 'otc']);
  
  const mainView = document.getElementById('mainSearchView');
  const compareView = document.getElementById('comparePageView');
  if (mainView) mainView.classList.add('hidden');
  if (compareView) compareView.classList.remove('hidden');
  
  // 比較画面では比較ボタンとブックマーク切り替えボタンを非表示
  setHeaderActionButtonsVisible(false);

  if (updateHash) {
    history.pushState(null, '', `#/compare?formula=${encodeURIComponent(formula)}`);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });

  renderComparePageContent();
}

// 生薬名正規化マップ（完全一致判定用）
const HERB_COMPARE_NORM_MAP = {
  '甘草': 'カンゾウ', 'カンゾウ末': 'カンゾウ', '炙甘草': 'カンゾウ',
  '生姜': 'ショウキョウ', 'ショウキョウ末': 'ショウキョウ',
  '大棗': 'タイソウ', 'タイソウ末': 'タイソウ',
  '桂皮': 'ケイヒ', 'ケイヒ末': 'ケイヒ',
  '芍薬': 'シャクヤク', 'シャクヤク末': 'シャクヤク', '赤芍': 'シャクヤク', '白芍': 'シャクヤク',
  '茯苓': 'ブクリョウ', 'ブクリョウ末': 'ブクリョウ', '赤茯苓': 'ブクリョウ',
  '白朮': 'ビャクジュツ', 'ビャクジュツ末': 'ビャクジュツ',
  '蒼朮': 'ソウジュツ', 'ソウジュツ末': 'ソウジュツ',
  '当帰': 'トウキ', 'トウキ末': 'トウキ',
  '川芎': 'センキュウ', 'センキュウ末': 'センキュウ', '川きゅう': 'センキュウ', '川キュウ': 'センキュウ',
  '地黄': 'ジオウ', 'ジオウ末': 'ジオウ', '乾地黄': 'ジオウ', '熟地黄': 'ジオウ', '乾ジオウ': 'ジオウ', '熟ジオウ': 'ジオウ',
  '附子': 'ブシ', 'ブシ末': 'ブシ', '加工附子': 'ブシ', '加工ブシ': 'ブシ', '炮附子': 'ブシ', '烏頭': 'ブシ', 'ブシ2': 'ブシ', 'ブシ末2': 'ブシ',
  '人参': 'ニンジン', 'ニンジン末': 'ニンジン', '紅参': 'ニンジン',
  '半夏': 'ハンゲ', 'ハンゲ末': 'ハンゲ',
  '柴胡': 'サイコ', 'サイコ末': 'サイコ',
  '黄芩': 'オウゴン', 'オウゴン末': 'オウゴン',
  '黄連': 'オウレン', 'オウレン末': 'オウレン',
  '黄柏': 'オウバク', 'オウバク末': 'オウバク',
  '麻黄': 'マオウ', 'マオウ末': 'マオウ',
  '葛根': 'カッコン', 'カッコン末': 'カッコン',
  '杏仁': 'キョウニン', 'キョウニン末': 'キョウニン',
  '陳皮': 'チンピ', 'チンピ末': 'チンピ',
  '枳実': 'キジツ', 'キジツ末': 'キジツ',
  '厚朴': 'コウボク', 'コウボク末': 'コウボク',
  '山梔子': 'サンシシ', 'サンシシ末': 'サンシシ', '梔子': 'サンシシ',
  '連翹': 'レンギョウ', 'レンギョウ末': 'レンギョウ',
  '防風': 'ボウフウ', 'ボウフウ末': 'ボウフウ',
  '荊芥': 'ケイガイ', 'ケイガイ末': 'ケイガイ',
  '細辛': 'サイシン', 'サイシン末': 'サイシン',
  '辛夷': 'シンイ', 'シンイ末': 'シンイ',
  '五味子': 'ゴミシ', 'ゴミシ末': 'ゴミシ',
  '麦門冬': 'バクモンドウ', 'バクモンドウ末': 'バクモンドウ',
  '知母': 'チモ', 'チモ末': 'チモ',
  '石膏': 'セッコウ', 'セッコウ末': 'セッコウ',
  '牡蛎': 'ボレイ', 'ボレイ末': 'ボレイ', '牡蠣': 'ボレイ',
  '竜骨': 'リュウコツ', 'リュウコツ末': 'リュウコツ',
  '阿膠': 'アキョウ', 'アキョウ末': 'アキョウ',
  '牡丹皮': 'ボタンピ', 'ボタンピ末': 'ボタンピ',
  '桃仁': 'トウニン', 'トウニン末': 'トウニン',
  '延胡索': 'エンゴサク', 'エンゴサク末': 'エンゴサク',
  'ウイキョウ': 'ウイキョウ', '茴香': 'ウイキョウ', '小茴香': 'ウイキョウ',
  '縮砂': 'シュクシャ', '砂仁': 'シュクシャ',
  '良姜': 'リョウキョウ', '高良姜': 'リョウキョウ',
  '大黄': 'ダイオウ', 'ダイオウ末': 'ダイオウ',
  '芒硝': 'ボウショウ', '無水芒硝': 'ボウショウ',
  '麻子仁': 'マシニン', 'マシニン末': 'マシニン',
  '薏苡仁': 'ヨクイニン', 'よく苡仁': 'ヨクイニン', 'ヨクイニン末': 'ヨクイニン',
  '沢瀉': 'タクシャ', 'タクシャ末': 'タクシャ',
  '猪苓': 'チョレイ', 'チョレイ末': 'チョレイ',
  '車前子': 'シャゼンシ', '車前草': 'シャゼンソウ',
  '木通': 'モクツウ', '木通末': 'モクツウ',
  '滑石': 'カッセキ', 'カッセキ末': 'カッセキ',
  '牛膝': 'ゴシツ', '牛膝末': 'ゴシツ',
  '丹参': 'タンジン', '紅花': 'コウカ', '木香': 'モッコウ', '香附子': 'コウブシ', '黄耆': 'オウギ'
};

function normalizeCompareHerb(h) {
  if (!h) return '';
  let s = h.trim().replace(/［.*?］|\(.*?\)/g, '');
  if (s.endsWith('末') && s.length > 2) {
    const base = s.slice(0, -1);
    if (HERB_COMPARE_NORM_MAP[base]) return HERB_COMPARE_NORM_MAP[base];
  }
  return HERB_COMPARE_NORM_MAP[s] || s;
}

function getItemHerbSet(item) {
  if (!Array.isArray(item.ingredients)) return new Set();
  const set = new Set();
  item.ingredients.forEach(ing => {
    if (ing.isExtract || !ing.name) return;
    const n = ing.name.trim();
    if (n.includes('エキス') || n.includes('添加物') || n.includes('賦形剤') || n.includes('水製') || n.includes('製剤')) return;
    const norm = normalizeCompareHerb(n);
    if (norm) set.add(norm);
  });
  return set;
}

function areHerbSetsEqual(a, b) {
  if (!a || !b || a.size !== b.size || a.size === 0) return false;
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}

// 処方名・小分類の正規化比較キー生成（「料」のみ吸収し、「加減」「第一加減」等は厳格に分離）
function normalizeFormulaKey(str) {
  if (!str) return '';
  let s = normalizeText(str).trim();
  s = s.replace(/料(エキス)?(顆粒|細粒|錠|散|カプセル)?$/, '');
  return s.trim();
}

// 処方比較ページのレンダリング
function renderComparePageContent() {
  const isCustomMode = Array.isArray(STATE.customCompareItems) && STATE.customCompareItems.length > 0;
  const formula = STATE.compareFormula;
  const content = document.getElementById('comparePageContent');
  if (!content) return;

  let allMatched = [];
  let titleText = '';

  if (isCustomMode) {
    allMatched = STATE.customCompareItems;
    titleText = `選択商品 配合量・成分比較 (${allMatched.length}品目)`;
  } else {
    const targetKey = normalizeFormulaKey(formula);
    const isTargetGeneric = isGenericCategory(formula) || isGenericCategory(targetKey);

    // 1. 小分類または処方名で完全一致する商品を抽出（包括的な生薬製剤でのマッチングは厳格に除外）
    const nameMatched = STATE.items.filter(it => {
      // 比較対象が「生薬製剤」等の包括分類名の場合は、小分類での自動マッチングを行わず、商品名完全一致のみ
      if (isTargetGeneric) {
        return it.name === formula || it.rawName === formula;
      }

      const isSubGeneric = isGenericCategory(it.subCategory);
      const sub = (!isSubGeneric && it.subCategory) ? normalizeFormulaKey(it.subCategory) : '';
      const fn = it.formulaName ? normalizeFormulaKey(it.formulaName) : '';
      
      const subMatches = sub && sub === targetKey;
      const fnMatches = fn && fn === targetKey;
      const nameMatches = it.name === formula || it.rawName === formula;

      return subMatches || fnMatches || nameMatches;
    });

    // 基準商品が商品名から直接見つかる場合（例: イスクラ冠元顆粒など）
    if (nameMatched.length === 0) {
      const directItem = STATE.items.find(it => it.name === formula || it.rawName === formula);
      if (directItem) nameMatched.push(directItem);
    }

    // 2. マッチした商品から基準となる生薬セット（Target Herb Set）を取得
    const targetHerbSets = [];
    nameMatched.forEach(it => {
      if (isSingleHerbItem(it)) return;
      const s = getItemHerbSet(it);
      if (s.size >= 2 && !targetHerbSets.some(existing => areHerbSetsEqual(existing, s))) {
        targetHerbSets.push(s);
      }
    });

    // 3. 全商品の中から「全て同じ生薬を使っている（生薬セットが100%完全一致）」商品を追加
    // （一部重なっているものは厳格に除外）
    const matchedSet = new Set(nameMatched);
    if (targetHerbSets.length > 0) {
      STATE.items.forEach(it => {
        if (matchedSet.has(it) || isSingleHerbItem(it)) return;
        const itSet = getItemHerbSet(it);
        if (itSet.size < 2) return;
        const isExactMatch = targetHerbSets.some(baseSet => areHerbSetsEqual(baseSet, itSet));
        if (isExactMatch) {
          matchedSet.add(it);
        }
      });
    }

    allMatched = Array.from(matchedSet);
    titleText = `「${formula}」各社製剤 配合量・成分比較`;
  }

  const availableCompanies = [];
  allMatched.forEach(it => {
    if (!availableCompanies.find(c => c.id === it.company)) {
      availableCompanies.push({ id: it.company, name: it.companyName });
    }
  });

  const filtered = allMatched.filter(it => {
    if (!STATE.compareSelectedTypes.has(it.type)) return false;
    if (STATE.compareSelectedCompanies.size > 0 && !STATE.compareSelectedCompanies.has(it.company)) return false;
    return true;
  });

  const allHerbNames = new Set();
  filtered.forEach(it => {
    if (Array.isArray(it.ingredients)) {
      it.ingredients.forEach(ing => {
        if (!ing.isExtract) {
          const cName = cleanHerbName(ing.name);
          if (cName) allHerbNames.add(cName);
        }
      });
    }
  });
  const sortedHerbs = Array.from(allHerbNames).sort((a, b) => a.localeCompare(b, 'ja'));

  const showEfficacy = STATE.compareVisibleSections.efficacy;
  const showUsageMethod = STATE.compareVisibleSections.usageMethod;
  const showDailyDose = STATE.compareVisibleSections.dailyDose;
  const showIngredients = STATE.compareVisibleSections.ingredients;
  const showAdditives = STATE.compareVisibleSections.additives;
  const showPrecautions = STATE.compareVisibleSections.precautions;

  content.innerHTML = `
    <!-- タイトルヘッダー -->
    <div class="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>${titleText}</span>
        </h2>
        <p class="text-xs text-slate-500 mt-0.5">
          該当: 全 ${allMatched.length} 件中 <span class="font-bold text-slate-800">${filtered.length} 件</span> 表示中
          （商品名をクリックすると添付文書・詳細情報が開きます）
        </p>
      </div>
    </div>

    <!-- 絞り込み ＆ 表示項目フィルターエリア -->
    <div class="px-4 py-3 bg-slate-50/70 border-b border-slate-200 space-y-2.5 text-xs">
      
      <!-- 区分 ＆ 【表示項目】チェックボックス行 -->
      <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
        <!-- 区分 -->
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-700">区分:</span>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input 
              type="checkbox" 
              value="medical" 
              ${STATE.compareSelectedTypes.has('medical') ? 'checked' : ''}
              onchange="onCompareTypeChange(this)"
              class="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
            >
            <span class="font-medium text-slate-800">医療用</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input 
              type="checkbox" 
              value="otc" 
              ${STATE.compareSelectedTypes.has('otc') ? 'checked' : ''}
              onchange="onCompareTypeChange(this)"
              class="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
            >
            <span class="font-medium text-slate-800">一般用(OTC)</span>
          </label>
        </div>

        <!-- 【表示項目】 -->
        <div class="flex items-center gap-3 pl-3 border-l border-slate-300 flex-wrap">
          <span class="font-bold text-slate-700">【表示項目】:</span>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input 
              type="checkbox" 
              value="efficacy" 
              ${showEfficacy ? 'checked' : ''}
              onchange="onCompareVisibleSectionChange('efficacy', this.checked)"
              class="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
            >
            <span class="text-slate-800">効能効果</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input 
              type="checkbox" 
              value="usageMethod" 
              ${showUsageMethod ? 'checked' : ''}
              onchange="onCompareVisibleSectionChange('usageMethod', this.checked)"
              class="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
            >
            <span class="text-slate-800">用法</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input 
              type="checkbox" 
              value="dailyDose" 
              ${showDailyDose ? 'checked' : ''}
              onchange="onCompareVisibleSectionChange('dailyDose', this.checked)"
              class="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
            >
            <span class="text-slate-800">１日服用量</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input 
              type="checkbox" 
              value="ingredients" 
              ${showIngredients ? 'checked' : ''}
              onchange="onCompareVisibleSectionChange('ingredients', this.checked)"
              class="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
            >
            <span class="text-slate-800 font-bold">構成生薬 (エキス量含む)</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input 
              type="checkbox" 
              value="additives" 
              ${showAdditives ? 'checked' : ''}
              onchange="onCompareVisibleSectionChange('additives', this.checked)"
              class="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
            >
            <span class="text-slate-800">添加物</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer select-none">
            <input 
              type="checkbox" 
              value="precautions" 
              ${showPrecautions ? 'checked' : ''}
              onchange="onCompareVisibleSectionChange('precautions', this.checked)"
              class="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
            >
            <span class="text-slate-800">使用上の注意</span>
          </label>
        </div>
      </div>

      <!-- 会社チェックボックス（複数選択） -->
      <div class="flex items-start gap-3 pt-1.5 border-t border-slate-200">
        <span class="font-bold text-slate-700 min-w-[50px] pt-0.5">製薬会社:</span>
        <div class="flex flex-wrap gap-2 items-center">
          <button 
            type="button" 
            onclick="toggleCompareAllCompanies(${availableCompanies.length})" 
            class="text-[11px] text-emerald-700 hover:underline font-bold pr-1">
            ${STATE.compareSelectedCompanies.size === 0 ? '全解除' : '全社表示'}
          </button>
          ${availableCompanies.map(comp => {
            const isChecked = STATE.compareSelectedCompanies.size === 0 || STATE.compareSelectedCompanies.has(comp.id);
            const badgeClass = getCompanyBadgeClass(comp.id);
            return `
              <label class="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer border ${badgeClass} text-[11px] select-none">
                <input 
                  type="checkbox" 
                  value="${comp.id}" 
                  ${isChecked ? 'checked' : ''}
                  onchange="onCompareCompanyChange(this)"
                  class="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                >
                <span>${comp.name}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

    </div>

    <!-- 比較テーブル（比較対象が少ない時でも横幅を小さく保つ） -->
    <div class="overflow-x-auto max-w-full p-0">
      ${filtered.length === 0 ? `
        <div class="p-8 text-center text-xs text-slate-500">
          <p class="font-medium">条件に合致する製剤がありません</p>
          <p class="text-[11px] text-slate-400 mt-1">上の「区分」や「製薬会社」の絞り込みを変更してください。</p>
        </div>
      ` : `
        <table class="compare-table text-xs text-left border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-700">
              <th class="compare-header-cell text-center font-bold">比較項目</th>
              ${filtered.map(item => {
                const badgeClass = getCompanyBadgeClass(item.company);
                const dosageForm = item.dosageForm || 'その他';
                const globalIdx = typeof item._globalIndex === 'number' ? item._globalIndex : STATE.items.indexOf(item);
                return `
                  <th class="compare-col-header">
                    <!-- 1行目: 企業名 -->
                    <div class="compare-row-1-company">
                      <span class="px-2 py-0.2 rounded text-[10px] font-bold border ${badgeClass}">${item.companyName}</span>
                    </div>
                    <!-- 2〜3行目: 商品名（クリックで該当製品の詳細画面へ100%確実にジャンプ） -->
                    <div 
                      class="compare-row-2-3-name" 
                      onclick="openDetailPageByIndex(${globalIdx})" 
                      title="クリックして詳細を表示: ${item.rawName || item.name}">
                      ${item.name}
                    </div>
                    <!-- 4行目: 区分・剤形 -->
                    <div class="compare-row-4-type">
                      <span>${item.type === 'medical' ? '医療用' : 'OTC'}</span>
                      <span>·</span>
                      <span class="text-slate-700 font-sans">${dosageForm}</span>
                    </div>
                  </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            
            <!-- 効能効果（チェック時のみ表示） -->
            ${showEfficacy ? `
              <tr class="bg-slate-50/70">
                <td class="compare-header-cell font-bold text-slate-700">効能効果</td>
                ${filtered.map(it => {
                  const cleaned = cleanDisplayText(it.efficacy);
                  return `
                    <td class="p-2.5 text-[11px] text-slate-700 align-top leading-relaxed max-w-[220px] bg-white">
                      <div class="max-h-36 overflow-y-auto whitespace-pre-line">${cleaned || '-'}</div>
                    </td>
                  `;
                }).join('')}
              </tr>
            ` : ''}

            <!-- 用法（チェック時のみ表示、服用タイミング・方法・回数を横並び比較） -->
            ${showUsageMethod ? `
              <tr class="bg-blue-50/20">
                <td class="compare-header-cell font-bold text-slate-800">用法</td>
                ${filtered.map(it => {
                  const method = extractUsageMethod(it.usage);
                  return `
                    <td class="p-2.5 text-[11px] text-slate-700 align-top leading-relaxed max-w-[220px] bg-white">
                      <div class="max-h-36 overflow-y-auto whitespace-pre-line">${method || '-'}</div>
                    </td>
                  `;
                }).join('')}
              </tr>
            ` : ''}

            <!-- 1日服用量（チェック時のみ表示、閉じカッコ修復） -->
            ${showDailyDose ? `
              <tr class="bg-white">
                <td class="compare-header-cell font-bold text-slate-700">1日服用量</td>
                ${filtered.map(it => `
                  <td class="text-center font-mono text-[11px] bg-white">${formatDailyDose(it.dailyDose)}</td>
                `).join('')}
              </tr>
            ` : ''}
            
            <!-- 構成生薬（エキス量含む、チェック時のみ表示、単位g統一） -->
            ${showIngredients ? `
              <!-- エキス分量 -->
              <tr class="bg-emerald-50/40">
                <td class="compare-header-cell font-bold text-emerald-950">エキス量</td>
                ${filtered.map(it => {
                  const ext = (it.ingredients || []).find(x => x.isExtract);
                  const extDisplay = ext ? formatHerbAmount(ext.amount, ext.amountStr) : '-';
                  return `
                    <td class="text-center font-mono font-bold text-emerald-900 bg-emerald-50/20">
                      ${extDisplay}
                    </td>
                  `;
                }).join('')}
              </tr>

              <!-- 各生薬の分量（単位g統一 ＆ 同量マーカー色分け対応） -->
              ${sortedHerbs.map(herb => {
                // この生薬における各商品の配合量数値を抽出
                const amounts = filtered.map(it => {
                  const ing = (it.ingredients || []).find(x => cleanHerbName(x.name) === herb);
                  return (ing && typeof ing.amount === 'number' && ing.amount > 0) ? ing.amount : null;
                });

                // 数値ごとの登場回数を集計
                const countMap = {};
                amounts.forEach(amt => {
                  if (amt !== null) countMap[amt] = (countMap[amt] || 0) + 1;
                });

                // 2社以上で一致する数値（同量）のみを抽出し、大きい順にソート
                const duplicateAmts = Object.keys(countMap)
                  .filter(amt => countMap[amt] >= 2)
                  .map(Number)
                  .sort((a, b) => b - a);

                return `
                <tr class="hover:bg-slate-50">
                  <td class="compare-header-cell font-medium text-slate-800">${herb}</td>
                  ${filtered.map(it => {
                    const ing = (it.ingredients || []).find(x => cleanHerbName(x.name) === herb);
                    const herbDisplay = ing ? formatHerbAmount(ing.amount, ing.amountStr) : '-';
                    const amt = (ing && typeof ing.amount === 'number' && ing.amount > 0) ? ing.amount : null;

                    let markerClass = '';
                    if (amt !== null) {
                      const matchIdx = duplicateAmts.indexOf(amt);
                      if (matchIdx !== -1) {
                        markerClass = `marker-match-${matchIdx % 5}`;
                      }
                    }

                    return `
                      <td class="text-center font-mono ${markerClass ? markerClass : (ing ? 'font-bold text-slate-800 bg-white' : 'text-slate-300 bg-white')}">
                        ${herbDisplay}
                      </td>
                    `;
                  }).join('')}
                </tr>
                `;
              }).join('')}
            ` : ''}

            <!-- 添加物（チェック時のみ表示） -->
            ${showAdditives ? `
              <tr class="bg-slate-50/50">
                <td class="compare-header-cell font-bold text-slate-700">添加物</td>
                ${filtered.map(it => {
                  const adds = cleanAdditives(it.additives);
                  return `
                    <td class="p-2.5 text-[11px] text-slate-600 align-top leading-relaxed max-w-[220px] bg-white">
                      <div class="max-h-28 overflow-y-auto">${adds || '記載なし'}</div>
                    </td>
                  `;
                }).join('')}
              </tr>
            ` : ''}

            <!-- 使用上の注意（チェック時のみ表示） -->
            ${showPrecautions ? `
              <tr class="bg-amber-50/20">
                <td class="compare-header-cell font-bold text-slate-800">使用上の注意</td>
                ${filtered.map(it => {
                  const cleaned = cleanDisplayText(it.precautions);
                  return `
                    <td class="p-2.5 text-[11px] text-slate-700 align-top leading-relaxed max-w-[240px] bg-white">
                      <div class="max-h-48 overflow-y-auto whitespace-pre-line text-slate-600">${cleaned || '-'}</div>
                    </td>
                  `;
                }).join('')}
              </tr>
            ` : ''}

          </tbody>
        </table>
      `}
    </div>
  `;
}

function onCompareVisibleSectionChange(section, isChecked) {
  STATE.compareVisibleSections[section] = isChecked;
  renderComparePageContent();
}

function onCompareTypeChange(cb) {
  if (cb.checked) {
    STATE.compareSelectedTypes.add(cb.value);
  } else {
    STATE.compareSelectedTypes.delete(cb.value);
  }
  renderComparePageContent();
}

function onCompareCompanyChange(cb) {
  if (STATE.compareSelectedCompanies.size === 0) {
    const allCbs = document.querySelectorAll('#comparePageContent input[type="checkbox"][value]:not([value="medical"]):not([value="otc"]):not([value="efficacy"]):not([value="dailyDose"]):not([value="ingredients"])');
    allCbs.forEach(c => {
      if (c.value !== cb.value) STATE.compareSelectedCompanies.add(c.value);
    });
  } else {
    if (cb.checked) {
      STATE.compareSelectedCompanies.add(cb.value);
    } else {
      STATE.compareSelectedCompanies.delete(cb.value);
    }
  }
  renderComparePageContent();
}

function toggleCompareAllCompanies() {
  if (STATE.compareSelectedCompanies.size === 0) {
    STATE.compareSelectedCompanies = new Set(['__none__']);
  } else {
    STATE.compareSelectedCompanies.clear();
  }
  renderComparePageContent();
}

// イベントリスナー設定
function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      STATE.searchQuery = e.target.value;
      updateClearButtonVisibility();
      STATE.displayCount = 36;
      applyFilterAndSearch();
    });
  }

  const typeSelect = document.getElementById('drugTypeSelect');
  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      STATE.activeType = e.target.value;
      STATE.displayCount = 36;
      applyFilterAndSearch();
    });
  }

  const typeRadios = document.querySelectorAll('input[name="drugType"]');
  typeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      STATE.activeType = e.target.value;
      STATE.displayCount = 36;
      applyFilterAndSearch();
    });
  });

  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      STATE.displayCount += 36;
      renderResults();
    });
  }

  window.addEventListener('hashchange', handleHashRouting);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailModal();
      closeUpdateHistoryModal();
    }
  });
}


// 更新履歴モーダルの開閉と描画
function openUpdateHistoryModal() {
  const modal = document.getElementById('updateHistoryModal');
  const body = document.getElementById('updateHistoryModalBody');
  if (!modal || !body) return;

  const history = (typeof kampoData !== 'undefined' && kampoData.updateHistory) ? kampoData.updateHistory : [];
  
  if (history.length === 0) {
    body.innerHTML = `
      <div class="text-center py-8 text-slate-400">
        <p class="text-sm">更新履歴データはありません。</p>
      </div>
    `;
  } else {
    body.innerHTML = history.map((entry, idx) => {
      const typeBadge = entry.type === 'audit_repair'
        ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">データ監査・修復</span>'
        : entry.type === 'daily_auto_update'
        ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">定期巡回更新</span>'
        : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">公式同期</span>';

      let detailsHtml = '';
      if (Array.isArray(entry.details) && entry.details.length > 0) {
        detailsHtml = `
          <div class="mt-2.5 space-y-2 pt-2 border-t border-slate-100">
            ${entry.details.map(d => `
              <div class="bg-slate-50 rounded p-2.5 border border-slate-200/70">
                <div class="font-bold text-slate-800 text-xs mb-1.5 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"></span>
                  <span>${escapeHtml(d.category)}</span>
                </div>
                <ul class="list-disc list-inside space-y-1 text-slate-600 text-xs">
                  ${(d.items || []).map(it => `<li class="leading-relaxed">${escapeHtml(it)}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        const addedHtml = (entry.added && entry.added.length > 0)
          ? `<div class="mt-2 bg-emerald-50 border border-emerald-200 rounded p-2 text-xs">
               <span class="font-bold text-emerald-800">新規追加商品:</span> ${entry.added.map(a => escapeHtml(a.name || a)).join('、')}
             </div>` : '';
        const updatedHtml = (entry.updated && entry.updated.length > 0)
          ? `<div class="mt-2 bg-blue-50 border border-blue-200 rounded p-2 text-xs">
               <span class="font-bold text-blue-800">情報改訂商品:</span> ${entry.updated.map(u => escapeHtml(u.name || u)).join('、')}
             </div>` : '';
        detailsHtml = addedHtml + updatedHtml;
      }

      return `
        <div class="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition bg-white shadow-2xs">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-slate-500 text-xs">${escapeHtml(entry.date)}</span>
              ${typeBadge}
            </div>
          </div>
          <h4 class="font-bold text-slate-900 text-sm mb-1">${escapeHtml(entry.title)}</h4>
          <p class="text-slate-600 text-xs leading-relaxed">${escapeHtml(entry.summary || '')}</p>
          ${detailsHtml}
        </div>
      `;
    }).join('');
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeUpdateHistoryModal() {
  const modal = document.getElementById('updateHistoryModal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}

document.addEventListener('DOMContentLoaded', initApp);

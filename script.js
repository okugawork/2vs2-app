// === HTML 画面要素への参照 ===
const participantCountSelect = document.getElementById("participantCount"); // 人数選択ドロップボックス
const courtCountInput = document.getElementById("courtCount"); // コート数選択ドロップボックス
const createMatchesButton = document.getElementById("createMatchesButton"); // ペア作成ボタン
const resetButton = document.getElementById("resetButton"); // リセットボタン
const resultSummary = document.getElementById("resultSummary"); // 作成結果のサマリー表示エリア
const matchListElement = document.getElementById("matchList"); // 試合内容表示エリア
const modeHint = document.getElementById("modeHint"); // ヒントテキスト表示エリア
const addParticipantButton = document.getElementById("addParticipantButton"); // 途中参加ボタン
const removeParticipantSelect = document.getElementById("removeParticipantSelect"); // 途中退場番号セレクト
const removeParticipantButton = document.getElementById("removeParticipantButton"); // 途中退場ボタン
const pendingNotice = document.getElementById("pendingNotice"); // 追加/退場の保留メッセージ
const confirmModal = document.getElementById("confirmModal");
const confirmCreateButton = document.getElementById("confirmCreateButton");
const cancelCreateButton = document.getElementById("cancelCreateButton");
const tabMatch = document.getElementById("tabMatch");
const tabHistory = document.getElementById("tabHistory");
const tabStats = document.getElementById("tabStats");
const screenMatch = document.getElementById("screen-match");
const screenHistory = document.getElementById("screen-history");
const screenStats = document.getElementById("screen-stats");
const summaryParticipants = document.getElementById("summaryParticipants");
const summaryCourts = document.getElementById("summaryCourts");
const summaryRestCount = document.getElementById("summaryRestCount");
const summaryNextMatch = document.getElementById("summaryNextMatch");

// === ゲーム状態管理用変数 ===
let restCounts = []; // 各プレイヤーの休憩回数を記録する配列（インデックス = プレイヤー番号）
let isLocked = false; // ペア作成後に人数・コート数の変更を禁止するフラグ
let previousPairKeys = []; // 前回作成時のペア組み合わせを保存（今回と同じペアを避けるため）

// 途中参加/途中退場管理
let activeNumbers = []; // 現在参加中のプレイヤー番号の配列
let retiredSet = new Set(); // 途中退場（廃番）になった番号の集合
let nextNumber = 1; // 次に割り当てる番号
let lastRestNumbers = []; // 直近で作成された休憩者リスト（表示用）

// 入力欄のロック/ロック解除を行います。
function setControlsLocked(locked) {
  participantCountSelect.disabled = locked;
  courtCountInput.disabled = locked;
  // mid-controls (add/remove) are only visible and enabled when controls are locked
  const mid = document.querySelector(".mid-controls");
  if (mid) {
    mid.style.display = locked ? "flex" : "none";
  }
  addParticipantButton.disabled = !locked;
  removeParticipantSelect.disabled = !locked;
  removeParticipantButton.disabled = !locked;
  if (locked) updateRemoveSelect();
}

// 休憩回数管理用の配列を初期化します。
function initializeParticipants(initialCount) {
  activeNumbers = Array.from({ length: initialCount }, (_, i) => i + 1);
  retiredSet = new Set();
  nextNumber = initialCount + 1;
  // restCounts を再初期化
  restCounts = [];
  for (let i = 1; i < nextNumber; i += 1) {
    restCounts[i] = 0;
  }
  updateRemoveSelect();
}

function ensureRestCountExists(number) {
  if (restCounts[number] === undefined) restCounts[number] = 0;
}

// 休憩者を選ぶ関数です。
// 休憩回数が少ない人を優先し、偏りを抑えながらランダムに休憩者を選びます。
function chooseRestNumbersFromActive(restCount) {
  // restCount が 0 以下なら、空の配列を返して処理を終了する
  if (restCount <= 0) {
    return [];
  }
  const selected = [];
  const workingCounts = {};

  // activeNumbers の値を必ず揃えておく
  for (const number of activeNumbers) {
    ensureRestCountExists(number);
    workingCounts[number] = restCounts[number];
  }

  for (let index = 0; index < restCount; index += 1) {
    const minimumCount = Math.min(...activeNumbers.map((n) => workingCounts[n]));
    const candidates = activeNumbers.filter(
      (number) => !selected.includes(number) && workingCounts[number] === minimumCount
    );

    const pickedNumber = candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : activeNumbers.find((number) => !selected.includes(number));

    selected.push(pickedNumber);
    workingCounts[pickedNumber] += 1;
  }

  return selected.sort((a, b) => a - b);
}

function updateRemoveSelect() {
  // rebuild options from activeNumbers
  if (!removeParticipantSelect) return;
  removeParticipantSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "選択してください";
  placeholder.disabled = true;
  placeholder.selected = true;
  removeParticipantSelect.appendChild(placeholder);

  for (const n of activeNumbers) {
    const opt = document.createElement("option");
    opt.value = String(n);
    opt.textContent = `${n}番`;
    removeParticipantSelect.appendChild(opt);
  }
  // disable if no active numbers
  removeParticipantSelect.disabled = activeNumbers.length === 0 || !isLocked;
}

// 配列をシャッフルするユーティリティ関数です。
function shuffle(array) {
  const copied = [...array]; // 元の配列を変更しないようコピーを作成
  for (let index = copied.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1)); // ランダムなインデックス位置と入れ替える
    [copied[index], copied[swapIndex]] = [copied[swapIndex], copied[index]]; // 要素を交換（フィッシャー・イェーツシャッフル）
  }
  return copied;
}

// ペアの一意なキーを生成し、同じ組み合わせを比較しやすくします。
function getPairKey(firstNumber, secondNumber) {
  const sortedPair = [firstNumber, secondNumber].sort((a, b) => a - b); // ペアを昇順ソート（[1,2]と[2,1]を同じと判定するため）
  return `${sortedPair[0]}-${sortedPair[1]}`;
}

// 有効なプレイヤーの中からペアを作成します。
// 前回のペアと同じ組み合わせはなるべく避けるようにします。
function buildPairings(activeNumbers, bannedPairKeys) {
  const remainingNumbers = [...activeNumbers]; // 未処理のプレイヤー番号リスト（選ぶたびに減る）
  const pairings = []; // 生成されたペアの配列

  while (remainingNumbers.length >= 2) {
    const candidatePairs = []; // 有効なペアの候補リスト（前回のペアを除外）

    //試合に出る人の中から、作れる2人組（ペア）を全部作り、過去に組んだペアは除外する
    for (let index = 0; index < remainingNumbers.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < remainingNumbers.length; nextIndex += 1) {
        const firstNumber = remainingNumbers[index];
        const secondNumber = remainingNumbers[nextIndex];
        const pair = [firstNumber, secondNumber].sort((a, b) => a - b); // ペアをソート
        const pairKey = getPairKey(firstNumber, secondNumber); // ペアの一意キー（"1-2"形式）

        if (!bannedPairKeys.includes(pairKey)) {
          candidatePairs.push({ pair, pairKey });
        }
      }
    }

    const selectedPair = candidatePairs.length > 0 // 有効な候補があれば候補から選ぶ、なければ先頭から選ぶ
      ? candidatePairs[Math.floor(Math.random() * candidatePairs.length)]
      : {
        pair: [remainingNumbers[0], remainingNumbers[1]].sort((a, b) => a - b),
        pairKey: getPairKey(remainingNumbers[0], remainingNumbers[1])
      };

    pairings.push(selectedPair.pair);

    const firstNumber = selectedPair.pair[0]; // 選ばれたペアの1番目
    const secondNumber = selectedPair.pair[1]; // 選ばれたペアの2番目
    remainingNumbers.splice(remainingNumbers.indexOf(firstNumber), 1); // 処理済みなのでリストから削除
    remainingNumbers.splice(remainingNumbers.indexOf(secondNumber), 1);
  }

  return pairings;
}

// 試合を作成するメインの関数です。
// コート数・参加人数・休憩者の選択・ペア生成を行います。
function createMatches(courtCount) {
  const safeCourtCount = Math.max(1, Number(courtCount) || 1);
  const totalCount = activeNumbers.length;
  const possibleMatchCount = Math.min(safeCourtCount, Math.floor(totalCount / 4));
  const restCount = totalCount - possibleMatchCount * 4;
  const restNumbers = chooseRestNumbersFromActive(restCount);

  const playingNumbers = activeNumbers.filter((n) => !restNumbers.includes(n));
  const pairs = buildPairings(playingNumbers, previousPairKeys);

  const matches = []; // 作成される試合情報の配列
  for (let index = 0; index < possibleMatchCount; index += 1) {
    const firstPair = pairs[index * 2]; // i番目の試合の最初のペア
    const secondPair = pairs[index * 2 + 1]; // i番目の試合の2番目のペア
    if (firstPair && secondPair) { // どちらも存在する場合のみ試合を追加
      matches.push({
        label: `コート${index + 1}`,
        text: `${firstPair[0]}, ${firstPair[1]} VS ${secondPair[0]}, ${secondPair[1]}`
      });
    }
  }

  // 休憩した人の回数を記録に反映します。
  restNumbers.forEach((number) => {
    ensureRestCountExists(number);
    restCounts[number] += 1;
  });

  // 表示用に保持（renderRestTable で使用）
  lastRestNumbers = [...restNumbers];

  // 次回の組み合わせで同じペアが出ないように、今回のペアを保存します。
  previousPairKeys = pairs.map((pair) => getPairKey(pair[0], pair[1]));

  return { matches, restNumbers };
}

function buildRestSection(restNumbers) {
  const maxNumberToShow = Math.max(nextNumber - 1, activeNumbers.length);

  const restCard = document.createElement('div');
  restCard.className = 'rest-card';
  const restTitle = document.createElement('p');
  restTitle.className = 'match-title';
  restTitle.textContent = '休憩者';
  const restMembers = document.createElement('p');
  restMembers.className = 'match-text';
  restMembers.textContent = restNumbers.length > 0 ? restNumbers.join(', ') : '';
  restCard.appendChild(restTitle);
  restCard.appendChild(restMembers);

  const restTableWrapper = document.createElement('div');
  restTableWrapper.className = 'rest-table-wrapper';
  const restTableTitle = document.createElement('p');
  restTableTitle.className = 'rest-table-title';
  restTableTitle.textContent = '休憩回数表';
  const restTable = document.createElement('table');
  restTable.className = 'rest-table';

  const headerRow = document.createElement('tr');
  const headerNumber = document.createElement('th');
  headerNumber.textContent = '番号';
  const headerCount = document.createElement('th');
  headerCount.textContent = '回数';
  headerRow.appendChild(headerNumber);
  headerRow.appendChild(headerCount);
  restTable.appendChild(headerRow);

  for (let number = 1; number <= maxNumberToShow; number += 1) {
    const row = document.createElement('tr');
    const numberCell = document.createElement('td');
    if (retiredSet.has(number)) {
      numberCell.textContent = `${number}番（途中退場）`;
      numberCell.className = 'retired';
    } else if (!activeNumbers.includes(number)) {
      numberCell.textContent = `${number}番（未参加）`;
    } else {
      numberCell.textContent = `${number}番`;
    }
    ensureRestCountExists(number);
    const countCell = document.createElement('td');
    countCell.textContent = `${restCounts[number] || 0}回`;
    row.appendChild(numberCell);
    row.appendChild(countCell);
    restTable.appendChild(row);
  }

  restTableWrapper.appendChild(restTableTitle);
  restTableWrapper.appendChild(restTable);

  return { restCard, restTableWrapper };
}

function renderRestTable() {
  const existingWrapper = document.querySelector('.rest-table-wrapper');
  const existingRestCard = document.querySelector('.rest-card');
  if (existingWrapper) existingWrapper.remove();
  if (existingRestCard) existingRestCard.remove();
  const { restCard, restTableWrapper } = buildRestSection(lastRestNumbers);
  matchListElement.appendChild(restCard);
  matchListElement.appendChild(restTableWrapper);
}

// 結果表示と状態を初期化します。
function resetResults() {
  resultSummary.textContent = "まだ作成結果はありません。人数を選んで「ペア作成」を押してください。";
  resultSummary.classList.add("empty-state");
  matchListElement.innerHTML = "";
  previousPairKeys = [];
  modeHint.textContent = "初回のペア作成前に人数とコート数を変更できます。変更する場合は「リセット」を押してください。";
  if (pendingNotice) pendingNotice.textContent = "";
}

// 画面に試合結果を表示する関数です。
// createMatches で生成した試合と休憩者を受け取り、
// HTML を作成して画面に反映します。
function renderMatches(courtCount) {
  const safeCourtCount = Math.max(1, Number(courtCount) || 1);
  const totalCount = activeNumbers.length;
  // ペア作成時は保留メッセージを消す
  if (pendingNotice) pendingNotice.textContent = "";
  const { matches, restNumbers } = createMatches(courtCount);

  resultSummary.classList.remove("empty-state");
  resultSummary.textContent = `${totalCount}人で${safeCourtCount}コート、${matches.length}試合を作成しました。`;
  matchListElement.innerHTML = "";
  modeHint.textContent = "人数とコート数を変更するには「リセット」を押してください。";

  if (summaryParticipants) summaryParticipants.textContent = `${totalCount}人`;
  if (summaryCourts) summaryCourts.textContent = `${safeCourtCount}コート`;
  if (summaryRestCount) summaryRestCount.textContent = restNumbers.length > 0 ? `${restNumbers.length}` : "0";
  if (summaryNextMatch) summaryNextMatch.textContent = `${matches.length}試合`;

  if (safeCourtCount > Math.floor(totalCount / 4)) {
    const warning = document.createElement("p"); // 警告メッセージ要素を作成
    warning.className = "warning-text";
    warning.textContent = `コート数が多すぎるため、${Math.floor(totalCount / 4)}試合分しか作成できません。`;
    matchListElement.appendChild(warning);
  }

  matches.forEach((match) => {
    const card = document.createElement("div"); // 試合カード要素を作成
    card.className = "match-card";

    const title = document.createElement("p"); // コート番号を表示する要素
    title.className = "match-title";
    title.textContent = match.label;

    const text = document.createElement("p"); // 試合内容（ペア情報）を表示する要素
    text.className = "match-text";
    text.textContent = match.text;

    card.appendChild(title);
    card.appendChild(text);
    matchListElement.appendChild(card);
  });

  if (restNumbers.length > 0 || nextNumber > (activeNumbers.length)) {
    lastRestNumbers = [...restNumbers];
    const { restCard, restTableWrapper } = buildRestSection(restNumbers);
    matchListElement.appendChild(restCard);
    matchListElement.appendChild(restTableWrapper);
  }
}

function handleCreateMatches() {
  const courtCount = Math.max(1, Number(courtCountInput.value) || 1);

  // 初回は participantCountSelect の値で参加者を初期化
  if (activeNumbers.length === 0) {
    initializeParticipants(Number(participantCountSelect.value));
  }

  renderMatches(courtCount);
  isLocked = true;
  setControlsLocked(true);
}

function showCreateConfirm() {
  if (!confirmModal) {
    handleCreateMatches();
    return;
  }
  confirmModal.classList.remove("hidden");
}

function hideCreateConfirm() {
  if (confirmModal) {
    confirmModal.classList.add("hidden");
  }
}

// ペア作成ボタンが押されたときの処理です。
createMatchesButton.addEventListener("click", () => {
  showCreateConfirm();
});

if (confirmCreateButton) {
  confirmCreateButton.addEventListener("click", () => {
    hideCreateConfirm();
    handleCreateMatches();
  });
}

if (cancelCreateButton) {
  cancelCreateButton.addEventListener("click", () => {
    hideCreateConfirm();
  });
}

function activateTab(tabButton, screen) {
  [tabMatch, tabHistory, tabStats].forEach((tab) => {
    tab.classList.toggle("active", tab === tabButton);
  });
  [screenMatch, screenHistory, screenStats].forEach((panel) => {
    panel.classList.toggle("active", panel === screen);
  });
}

if (tabMatch) {
  tabMatch.addEventListener("click", () => {
    activateTab(tabMatch, screenMatch);
  });
}

if (tabHistory) {
  tabHistory.addEventListener("click", () => {
    activateTab(tabHistory, screenHistory);
  });
}

if (tabStats) {
  tabStats.addEventListener("click", () => {
    activateTab(tabStats, screenStats);
  });
}

// リセットボタンが押されたときの処理です。
resetButton.addEventListener("click", () => {
  isLocked = false;
  previousPairKeys = [];
  setControlsLocked(false);
  initializeParticipants(Number(participantCountSelect.value));
  resetResults();
});

// 途中参加: 新しい番号を追加する（追加時に確認ダイアログ）
addParticipantButton.addEventListener("click", () => {
  if (!confirm("本当に参加者を追加しますか？")) return;
  // 追加する番号を決め、休憩回数は現在の最大と同じにする
  const currentMaxRest = activeNumbers.length > 0
    ? Math.max(...activeNumbers.map((n) => { ensureRestCountExists(n); return restCounts[n]; }))
    : 0;
  const assigned = nextNumber;
  ensureRestCountExists(assigned);
  restCounts[assigned] = currentMaxRest;
  activeNumbers.push(assigned);
  nextNumber += 1;
  updateRemoveSelect();
  modeHint.textContent = `番号${assigned}を追加しました。ペア作成を押すと反映されます。`;
  // 休憩回数表だけを更新（試合作成は行わない）
  renderRestTable();
  if (pendingNotice) pendingNotice.textContent = `次の試合から${assigned}番さんが参加します。`;
});

// 途中退場: 指定番号を廃番（永久除外）にする
removeParticipantButton.addEventListener("click", () => {
  const value = Number(removeParticipantSelect.value);
  if (!value || value <= 0) {
    alert("有効な番号を入力してください");
    return;
  }
  if (retiredSet.has(value)) {
    alert("その番号は既に途中退場です");
    return;
  }
  const idx = activeNumbers.indexOf(value);
  if (idx === -1) {
    alert("現在参加中の番号から指定してください");
    return;
  }
  // 廃番化
  activeNumbers.splice(idx, 1);
  retiredSet.add(value);
  updateRemoveSelect();
  modeHint.textContent = `番号${value}を途中退場（廃番）にしました。ペア作成を押すと反映されます。`;
  // 休憩回数表だけを更新（試合作成は行わない）
  renderRestTable();
  if (pendingNotice) pendingNotice.textContent = `${value}番さんが次の試合から退場します。`;
});

// 最初に画面を初期状態にします。
resetResults();
setControlsLocked(false);
if (tabMatch) activateTab(tabMatch, screenMatch);

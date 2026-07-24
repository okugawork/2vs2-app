// === HTML 画面要素への参照 ===
const participantCountSelect = document.getElementById("participantCount"); // 人数選択ドロップボックス
const courtCountInput = document.getElementById("courtCount"); // コート数選択ドロップボックス
const createMatchesButton = document.getElementById("createMatchesButton"); // ペア作成ボタン
const resetButton = document.getElementById("resetButton"); // リセットボタン
const resultSummary = document.getElementById("resultSummary"); // 作成結果のサマリー表示エリア
const resultSubSummary = document.getElementById("resultSubSummary");
const matchListElement = document.getElementById("matchList"); // 試合内容表示エリア
const emptyStateVisual = document.getElementById("emptyStateVisual");
const modeHint = document.getElementById("modeHint"); // ヒントテキスト表示エリア
const addParticipantButton = document.getElementById("addParticipantButton"); // 途中参加ボタン
const removeParticipantSelect = document.getElementById("removeParticipantSelect"); // 途中退場番号セレクト
const removeParticipantButton = document.getElementById("removeParticipantButton"); // 途中退場ボタン
const pendingNotice = document.getElementById("pendingNotice"); // 追加/退場の保留メッセージ
const confirmModal = document.getElementById("confirmModal");
const confirmCreateButton = document.getElementById("confirmCreateButton");
const cancelCreateButton = document.getElementById("cancelCreateButton");
const resetConfirmModal = document.getElementById("resetConfirmModal");
const confirmResetButton = document.getElementById("confirmResetButton");
const cancelResetButton = document.getElementById("cancelResetButton");
const tabMatch = document.getElementById("tabMatch");
const tabHistory = document.getElementById("tabHistory");
const tabStats = document.getElementById("tabStats");
const screenMatch = document.getElementById("screen-match");
const screenHistory = document.getElementById("screen-history");
const screenStats = document.getElementById("screen-stats");
const summaryParticipants = document.getElementById("summaryParticipants");
const summaryParticipantDelta = document.getElementById("summaryParticipantDelta");
const summaryCourts = document.getElementById("summaryCourts");
const summaryRestMembers = document.getElementById("summaryRestMembers");
const historyList = document.getElementById("historyList");
const setupTitleLabel = document.getElementById("setupTitleLabel");
const currentRoundLabel = document.getElementById("currentRoundLabel");
const roundStatusBadge = document.getElementById("roundStatusBadge");
const panelSummary = document.querySelector(".panel-summary");
const panelControls = document.querySelector(".panel-controls");
const actionGroup = document.querySelector(".action-group");
const midControls = document.querySelector(".mid-controls");
const metaInfo = document.querySelector(".meta-info");
const liveControlsZone = document.getElementById("liveControlsZone");
const tabBar = document.querySelector(".tab-bar");
const statsRestTable = document.getElementById("statsRestTable");
const nextMatchZone = document.querySelector(".next-match-zone");

// === ゲーム状態管理用変数 ===
let restCounts = []; // 各プレイヤーの休憩回数を記録する配列（インデックス = プレイヤー番号）
let isLocked = false; // ペア作成後に人数・コート数の変更を禁止するフラグ
let previousPairKeys = []; // 前回作成時のペア組み合わせを保存（今回と同じペアを避けるため）

// 途中参加/途中退場管理
let activeNumbers = []; // 現在参加中のプレイヤー番号の配列
let retiredSet = new Set(); // 途中退場（廃番）になった番号の集合
let nextNumber = 1; // 次に割り当てる番号
let lastRestNumbers = []; // 直近で作成された休憩者リスト（表示用）
let pendingNotices = []; // 次回反映される追加/除外メッセージの配列
let matchRoundCount = 0; // 何試合目まで作成済みかを管理
let historyEntries = []; // 試合とメンバー変更を含む履歴エントリ

function updateCurrentRoundLabel() {
  if (!currentRoundLabel) return;
  const visibleRound = matchRoundCount > 0 ? matchRoundCount : 1;
  currentRoundLabel.textContent = `ROUND ${visibleRound}`;
}

function setSummaryValue(element, value, unit) {
  if (!element) return;
  element.innerHTML = `<span class="summary-number">${value}</span><span class="summary-unit">${unit}</span>`;
}

function setSetupStateVisibility(visible) {
  resultSummary.style.display = visible ? "block" : "none";
  if (resultSubSummary) resultSubSummary.style.display = visible ? "block" : "none";
  if (emptyStateVisual) emptyStateVisual.style.display = visible ? "grid" : "none";
  if (panelControls) panelControls.classList.toggle("hidden-panel", !visible);
  if (nextMatchZone) nextMatchZone.classList.toggle("empty", visible);
}

// 参加人数の右側に表示する +n / -n バッジを描画します。
function renderParticipantDelta() {
  if (!summaryParticipantDelta) return;
  summaryParticipantDelta.innerHTML = "";

  const addCount = pendingNotices.filter((notice) => notice.type === "add").length;
  const removeCount = pendingNotices.filter((notice) => notice.type === "remove").length;

  if (addCount > 0) {
    const addChip = document.createElement("span");
    addChip.className = "participant-delta-chip add";
    addChip.textContent = `+${addCount}`;
    summaryParticipantDelta.appendChild(addChip);
  }

  if (removeCount > 0) {
    const removeChip = document.createElement("span");
    removeChip.className = "participant-delta-chip remove";
    removeChip.textContent = `-${removeCount}`;
    summaryParticipantDelta.appendChild(removeChip);
  }
}

// ペア作成ボタン直下の保留メッセージを複数行で描画します。
// あわせて +n / -n バッジの表示も同期します。
function renderPendingNotices() {
  if (!pendingNotice) return;
  pendingNotice.textContent = "";
  pendingNotices.forEach((notice, index) => {
    const line = document.createElement("span");
    line.textContent = notice.text;
    if (notice.type === "remove") {
      line.classList.add("pending-notice-remove");
    }
    pendingNotice.appendChild(line);
    if (index < pendingNotices.length - 1) {
      pendingNotice.appendChild(document.createElement("br"));
    }
  });
  renderParticipantDelta();
}

// 履歴表示用に時刻を hh:mm 形式へ変換します。
function formatMatchStartTime(timestamp) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mi = String(parsed.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

// 1回のペア作成結果（第n試合）を履歴カードDOMに変換します。
function buildHistoryCard(entry) {
  const item = document.createElement("article");
  item.className = "timeline-item";

  const time = document.createElement("div");
  time.className = "timeline-time";
  time.textContent = formatMatchStartTime(entry.startedAt);

  const dot = document.createElement("div");
  dot.className = "timeline-dot";

  const card = document.createElement("div");
  card.className = "history-card";

  const top = document.createElement("div");
  top.className = "history-top";

  const title = document.createElement("span");
  title.textContent = `Round ${entry.round}`;

  top.appendChild(title);
  card.appendChild(top);

  const courtList = document.createElement("div");
  courtList.className = "history-courts";

  entry.courts.forEach((court) => {
    const courtCard = document.createElement("div");
    courtCard.className = "history-court-card";

    const courtTitle = document.createElement("p");
    courtTitle.className = "history-label history-court-title";
    const courtNumberText = String(court.label || "").replace("コート", "");
    courtTitle.textContent = `Court ${courtNumberText}`;

    const courtMatch = document.createElement("p");
    courtMatch.className = "history-court-match";
    courtMatch.textContent = court.text;

    courtCard.appendChild(courtTitle);
    courtCard.appendChild(courtMatch);
    courtList.appendChild(courtCard);
  });

  card.appendChild(courtList);

  const rest = document.createElement("p");
  rest.className = "history-rest";
  rest.textContent = `休憩: ${entry.restNumbers.length > 0 ? entry.restNumbers.join(", ") : "なし"}`;
  card.appendChild(rest);

  item.appendChild(time);
  item.appendChild(dot);
  item.appendChild(card);
  return item;
}

// 途中参加/除外の変更履歴を履歴カードDOMに変換します。
function buildMemberChangeCard(entry) {
  const item = document.createElement("article");
  item.className = "timeline-item";

  const time = document.createElement("div");
  time.className = "timeline-time";
  time.textContent = "";

  const dot = document.createElement("div");
  dot.className = "timeline-dot timeline-dot-soft";

  const card = document.createElement("div");
  card.className = "history-card member-change-card";

  const top = document.createElement("div");
  top.className = "history-top";

  const title = document.createElement("span");
  title.textContent = `メンバー変更（第${entry.targetRound}試合から反映）`;

  top.appendChild(title);
  card.appendChild(top);

  entry.changes.forEach((change) => {
    const detail = document.createElement("p");
    detail.className = `history-member-change ${change.changeType}`;
    detail.textContent = change.text;
    card.appendChild(detail);
  });

  item.appendChild(time);
  item.appendChild(dot);
  item.appendChild(card);
  return item;
}

// 履歴タブの一覧を最新順で再描画します。
function renderHistoryList() {
  if (!historyList) return;
  historyList.innerHTML = "";

  if (historyEntries.length === 0) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "history-card";
    const emptyText = document.createElement("p");
    emptyText.className = "history-rest";
    emptyText.textContent = "まだ履歴はありません。試合を作成するとここに表示されます。";
    emptyCard.appendChild(emptyText);
    historyList.appendChild(emptyCard);
    return;
  }

  [...historyEntries].reverse().forEach((entry) => {
    if (entry.type === "match") {
      historyList.appendChild(buildHistoryCard(entry));
      return;
    }
    historyList.appendChild(buildMemberChangeCard(entry));
  });
}

// 入力欄のロック/ロック解除を行います。
function setControlsLocked(locked) {
  participantCountSelect.disabled = locked;
  courtCountInput.disabled = locked;
  if (midControls) {
    midControls.style.display = locked ? "flex" : "none";
  }
  if (resetButton) {
    resetButton.style.display = locked ? "inline-flex" : "none";
  }
  addParticipantButton.disabled = !locked;
  removeParticipantSelect.disabled = !locked;
  removeParticipantButton.disabled = !locked;
  if (!locked && removeParticipantSelect) {
    removeParticipantSelect.style.display = "none";
    removeParticipantSelect.value = "";
    removeParticipantButton.textContent = "除外";
  }
  if (locked) updateRemoveSelect();
  updateModeLayout();
}

function moveControlsToSummary() {
  if (!liveControlsZone || !actionGroup || !midControls) return;
  // 試合進行モードでは操作ボタン群をサマリー側へ移動する
  liveControlsZone.appendChild(actionGroup);
  liveControlsZone.appendChild(midControls);
}

function moveControlsToSetup() {
  if (!panelControls || !actionGroup || !midControls || !metaInfo) return;
  // セットアップモードでは操作ボタン群を設定パネルへ戻す
  panelControls.insertBefore(actionGroup, metaInfo);
  panelControls.insertBefore(midControls, metaInfo);
}

// 現在モード（セットアップ/試合進行）に応じて表示レイアウトを切り替えます。
function updateModeLayout() {
  const setupMode = !isLocked;

  if (setupMode) {
    moveControlsToSetup();
  } else {
    moveControlsToSummary();
  }

  if (panelSummary) {
    panelSummary.classList.remove("hidden-panel");
    panelSummary.classList.toggle("setup-clean", setupMode);
  }
  if (setupTitleLabel) setupTitleLabel.classList.toggle("hidden-panel", !setupMode);
  if (currentRoundLabel) currentRoundLabel.classList.toggle("hidden-panel", setupMode);
  if (roundStatusBadge) roundStatusBadge.classList.toggle("hidden-panel", setupMode);
  if (panelControls) panelControls.classList.toggle("hidden-panel", !setupMode);
  if (tabBar) tabBar.classList.toggle("hidden-panel", setupMode);

  if (setupMode && tabMatch && screenMatch) {
    activateTab(tabMatch, screenMatch);
  }
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
  // 現在参加中メンバーだけで除外候補を作り直す
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
  // 参加中メンバーがいない場合、またはロック前は除外操作を無効化する
  removeParticipantSelect.disabled = activeNumbers.length === 0 || !isLocked;
  removeParticipantSelect.style.display = removeParticipantSelect.disabled ? "none" : removeParticipantSelect.style.display;
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
        text: `${firstPair[0]}, ${firstPair[1]} VS ${secondPair[0]}, ${secondPair[1]}`,
        teamA: [...firstPair],
        teamB: [...secondPair],
        courtIndex: index + 1
      });
    }
  }

  // 休憩した人の回数を記録に反映します。
  restNumbers.forEach((number) => {
    ensureRestCountExists(number);
    restCounts[number] += 1;
  });

  // 直近試合の休憩者番号として保持（将来の表示連携用）
  lastRestNumbers = [...restNumbers];

  // 次回の組み合わせで同じペアが出ないように、今回のペアを保存します。
  previousPairKeys = pairs.map((pair) => getPairKey(pair[0], pair[1]));

  return { matches, restNumbers };
}

function buildRestTable() {
  // 途中退場・未参加の状態も含めて、番号ごとの休憩回数一覧を組み立てる
  const maxNumberToShow = Math.max(nextNumber - 1, activeNumbers.length);

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

  return restTable;
}

function renderRestTable() {
  if (!statsRestTable) return;
  statsRestTable.innerHTML = '';
  const restTable = buildRestTable();
  statsRestTable.appendChild(restTable);
}

// 結果表示と状態を初期化します。
function resetResults() {
  setSetupStateVisibility(true);
  resultSummary.textContent = "まだ試合はありません";
  resultSummary.classList.add("empty-state");
  if (resultSubSummary) {
    resultSubSummary.textContent = "参加人数とコート数を設定して「試合開始」を押してください";
  }
  matchListElement.innerHTML = "";
  previousPairKeys = [];
  modeHint.textContent = "";
  pendingNotices = [];
  renderPendingNotices();
  updateCurrentRoundLabel();
  if (summaryRestMembers) summaryRestMembers.textContent = "";
}

// 画面に試合結果を表示する関数です。
// createMatches で生成した試合と休憩者を受け取り、
// HTML を作成して画面に反映します。
function renderMatches(courtCount) {
  const safeCourtCount = Math.max(1, Number(courtCount) || 1);
  const totalCount = activeNumbers.length;
  // ペア作成時は保留メッセージを消す
  pendingNotices = [];
  renderPendingNotices();
  const { matches, restNumbers } = createMatches(courtCount);

  resultSummary.classList.remove("empty-state");
  resultSummary.textContent = "";
  setSetupStateVisibility(false);
  matchListElement.innerHTML = "";
  modeHint.textContent = "人数とコート数を変更するには「リセット」を押してください。";

  setSummaryValue(summaryParticipants, totalCount, "人");
  setSummaryValue(summaryCourts, safeCourtCount, "面");
  if (summaryRestMembers) {
    summaryRestMembers.innerHTML = "";
    if (restNumbers.length === 0) {
      summaryRestMembers.textContent = 'なし';
    } else {
      restNumbers.forEach((number) => {
        const chip = document.createElement("span");
        chip.className = "rest-member-chip";
        chip.textContent = `${number}`;
        summaryRestMembers.appendChild(chip);
      });
    }
  }

  if (safeCourtCount > Math.floor(totalCount / 4)) {
    const warning = document.createElement("p"); // 警告メッセージ要素を作成
    warning.className = "warning-text";
    warning.textContent = `コート数が多すぎるため、${Math.floor(totalCount / 4)}試合分しか作成できません。`;
    matchListElement.appendChild(warning);
  }

  matches.forEach((match) => {
    const card = document.createElement("div"); // 試合カード要素を作成
    card.className = "match-card";

    const header = document.createElement("div");
    header.className = "match-card-header";

    const titleGroup = document.createElement("div");
    titleGroup.className = "match-title-group";

    const title = document.createElement("p");
    title.className = "match-title";
    title.textContent = `Court ${match.courtIndex}`;

    const status = document.createElement("span");
    status.className = "match-status";
    status.textContent = "試合中";

    titleGroup.appendChild(title);
    titleGroup.appendChild(status);

    const menu = document.createElement("span");
    menu.className = "match-menu";
    menu.textContent = "⋮";

    header.appendChild(titleGroup);
    header.appendChild(menu);

    const body = document.createElement("div");
    body.className = "match-body";

    const teamA = document.createElement("div");
    teamA.className = "team-block team-block-a";
    (match.teamA || []).forEach((member) => {
      const row = document.createElement("div");
      row.className = "team-row";
      row.innerHTML = `<span class="team-avatar">●</span><span class="team-member">${member}</span>`;
      teamA.appendChild(row);
    });

    const vs = document.createElement("p");
    vs.className = "match-vs";
    vs.textContent = "VS";

    const teamB = document.createElement("div");
    teamB.className = "team-block team-block-b";
    (match.teamB || []).forEach((member) => {
      const row = document.createElement("div");
      row.className = "team-row";
      row.innerHTML = `<span class="team-avatar">●</span><span class="team-member">${member}</span>`;
      teamB.appendChild(row);
    });

    body.appendChild(teamA);
    body.appendChild(vs);
    body.appendChild(teamB);

    card.appendChild(header);
    card.appendChild(body);
    matchListElement.appendChild(card);
  });

  lastRestNumbers = [...restNumbers];
  renderRestTable();
  return { matches, restNumbers };
}

function appendMatchHistory(matches, restNumbers) {
  if (!matches || matches.length === 0) return;
  // ペア作成1回を「第n試合」として履歴に追加する
  matchRoundCount += 1;
  updateCurrentRoundLabel();
  const entry = {
    type: "match",
    round: matchRoundCount,
    startedAt: new Date().toISOString(),
    courts: matches.map((match) => ({ label: match.label, text: match.text })),
    restNumbers: [...restNumbers]
  };
  historyEntries.push(entry);
  renderHistoryList();
}

// 途中参加/除外の変更を、次に反映される試合番号単位で履歴へ集約します。
function appendMemberChangeHistory(changeType, number) {
  const targetRound = matchRoundCount + 1;
  const text = changeType === "add"
    ? `第${targetRound}試合から${number}番が参加します。`
    : `第${targetRound}試合から${number}番が除外されます。`;

  const existingEntry = historyEntries.find(
    (entry) => entry.type === "member-change" && entry.targetRound === targetRound
  );

  if (existingEntry) {
    existingEntry.changes.push({ changeType, number, text });
  } else {
    historyEntries.push({
      type: "member-change",
      targetRound,
      changes: [{ changeType, number, text }]
    });
  }
  renderHistoryList();
}

// ペア作成の確定処理。初回のみ参加者初期化を行い、試合生成と履歴追加を実行します。
function handleCreateMatches() {
  const courtCount = Math.max(1, Number(courtCountInput.value) || 1);

  // 初回は participantCountSelect の値で参加者を初期化
  if (activeNumbers.length === 0) {
    initializeParticipants(Number(participantCountSelect.value));
  }

  const created = renderMatches(courtCount);
  appendMatchHistory(created.matches, created.restNumbers);
  isLocked = true;
  setControlsLocked(true);
}

// ペア作成確認モーダルを開きます（モーダル未使用時は即実行）。
function showCreateConfirm() {
  if (!confirmModal) {
    handleCreateMatches();
    return;
  }
  confirmModal.classList.remove("hidden");
}

// ペア作成確認モーダルを閉じます。
function hideCreateConfirm() {
  if (confirmModal) {
    confirmModal.classList.add("hidden");
  }
}

// アプリ状態を初期化し、試合結果/履歴/統計表示をリセットします。
function handleReset() {
  isLocked = false;
  setControlsLocked(false);
  activeNumbers = [];
  retiredSet = new Set();
  nextNumber = 1;
  restCounts = [];
  lastRestNumbers = [];
  matchRoundCount = 0;
  historyEntries = [];
  resetResults();
  renderHistoryList();
  renderRestTable();
}

// リセット確認モーダルを開きます（モーダル未使用時は即実行）。
function showResetConfirm() {
  if (!resetConfirmModal) {
    handleReset();
    return;
  }
  resetConfirmModal.classList.remove("hidden");
}

// リセット確認モーダルを閉じます。
function hideResetConfirm() {
  if (resetConfirmModal) {
    resetConfirmModal.classList.add("hidden");
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
  // タブ選択状態と表示スクリーンを同時に切り替える
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
  showResetConfirm();
});

if (confirmResetButton) {
  confirmResetButton.addEventListener("click", () => {
    hideResetConfirm();
    handleReset();
  });
}

if (cancelResetButton) {
  cancelResetButton.addEventListener("click", () => {
    hideResetConfirm();
  });
}

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
  modeHint.textContent = `番号${assigned}を追加しました。「次の試合を生成する」を押すと反映されます。`;
  // 休憩回数表だけを更新（試合作成は行わない）
  renderRestTable();
  pendingNotices.push({ text: `次から${assigned}番が参加します。`, type: "add" });
  renderPendingNotices();
  appendMemberChangeHistory("add", assigned);
});

// メンバー除外: まず選択欄を出し、選択後に除外します
removeParticipantButton.addEventListener("click", () => {
  if (!isLocked) return;
  if (removeParticipantSelect && removeParticipantSelect.style.display === "none") {
    removeParticipantSelect.style.display = "block";
    removeParticipantSelect.focus();
    removeParticipantButton.textContent = "除外する";
    return;
  }

  const value = Number(removeParticipantSelect.value);
  if (!value || value <= 0) {
    alert("除外するメンバーを選んでください");
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
  modeHint.textContent = `番号${value}を途中退場（廃番）にしました。「次の試合を生成する」を押すと反映されます。`;
  // 休憩回数表だけを更新（試合作成は行わない）
  renderRestTable();
  pendingNotices.push({ text: `次から${value}番が除外されます。`, type: "remove" });
  renderPendingNotices();
  appendMemberChangeHistory("remove", value);
  if (removeParticipantSelect) {
    removeParticipantSelect.style.display = "none";
    removeParticipantSelect.value = "";
  }
  removeParticipantButton.textContent = "除外";
});

// 最初に画面を初期状態にします。
resetResults();
setControlsLocked(false);
renderHistoryList();
renderRestTable();
if (tabMatch) activateTab(tabMatch, screenMatch);

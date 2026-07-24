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
const historyMemberSelect = document.getElementById("historyMemberSelect");
const statsRestTable = document.getElementById("statsRestTable");
const statsMemberSelect = document.getElementById("statsMemberSelect");
const statsMemberDetail = document.getElementById("statsMemberDetail");
const statsOpponentSelect = document.getElementById("statsOpponentSelect");
const statsOpponentDetail = document.getElementById("statsOpponentDetail");
const statsRankingArea = document.getElementById("statsRankingArea");
const nextMatchZone = document.querySelector(".next-match-zone");

// === ゲーム状態管理用変数 ===
let restCounts = []; // 各プレイヤーの休憩回数を記録する配列（インデックス = プレイヤー番号）
let isLocked = false; // ペア作成後に人数・コート数の変更を禁止するフラグ
let pairCounts = {}; // ペアごとの累積回数を記録するオブジェクト
let pairHistoryByMember = {}; // メンバーごとのペア履歴を記録するオブジェクト
let opponentCounts = {}; // ペア同士の対戦回数を記録するオブジェクト
let opponentHistoryByMember = {}; // メンバーごとの対戦相手履歴を記録するオブジェクト
let selectedMemberNumber = null;
let selectedOpponentMemberNumber = null;
let selectedHistoryMemberNumber = null;

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

function formatSavedScore(scoreA, scoreB) {
  if (scoreA === null || scoreB === null || scoreA === undefined || scoreB === undefined) {
    return "未入力";
  }
  if (scoreA === scoreB) {
    return "引き分け";
  }
  return scoreA > scoreB ? "A の勝利" : "B の勝利";
}

function formatTeamNames(team) {
  return (team || []).join(", ");
}

function parseScoreInput(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function normalizeScoreInputField(input) {
  input.value = input.value.replace(/\D/g, "").slice(0, 2);
}

function saveCourtScore(round, courtIndex, inputA, inputB) {
  const entry = historyEntries.find((item) => item.type === "match" && item.round === round);
  if (!entry || !entry.courts || !entry.courts[courtIndex - 1]) return;

  const scoreA = parseScoreInput(inputA);
  const scoreB = parseScoreInput(inputB);

  if (scoreA === null || scoreB === null) return;

  const court = entry.courts[courtIndex - 1];
  const hasScoreInput = inputA !== "" || inputB !== "";
  if (court.scoreA === scoreA && court.scoreB === scoreB && court.hasScoreInput === hasScoreInput) return;

  court.scoreA = scoreA;
  court.scoreB = scoreB;
  court.hasScoreInput = hasScoreInput;
  delete court.updatedAt;
  renderHistoryList();
  renderRankingStats();
}

function normalizeHistoryCourtScores() {
  historyEntries.forEach((entry) => {
    if (entry.type !== "match" || !entry.courts) return;
    entry.courts.forEach((court) => {
      if (court.scoreA === null || court.scoreA === undefined) {
        court.scoreA = 0;
      }
      if (court.scoreB === null || court.scoreB === undefined) {
        court.scoreB = 0;
      }
      if (court.hasScoreInput === undefined) {
        court.hasScoreInput = false;
      }
      if (court.updatedAt) {
        delete court.updatedAt;
      }
    });
  });
}

function buildCourtScorePanel(entry, court, courtIndex) {
  const panel = document.createElement("div");
  panel.className = "history-score-panel";

  const hasScore = court.hasScoreInput === true;
  if (hasScore) {
    if (court.scoreA > court.scoreB) {
      panel.classList.add("winner-a");
    } else if (court.scoreB > court.scoreA) {
      panel.classList.add("winner-b");
    } else {
      panel.classList.add("draw");
    }
  }

  const header = document.createElement("div");
  header.className = "history-score-header";

  const status = document.createElement("div");
  status.className = "history-score-status";
  const trophy = document.createElement("span");
  trophy.className = "history-score-trophy";
  trophy.textContent = "🏆";
  status.appendChild(trophy);

  const statusText = document.createElement("span");
  if (hasScore) {
    const winnerTeam = court.scoreA > court.scoreB ? court.teamA : court.scoreB > court.scoreA ? court.teamB : null;
    statusText.textContent = court.scoreA === court.scoreB
      ? "引き分け"
      : `${formatTeamNames(winnerTeam)} の勝利`;
    status.classList.add(court.scoreA === court.scoreB ? "draw" : court.scoreA > court.scoreB ? "winner-a" : "winner-b");
  } else {
    statusText.textContent = "点数未入力";
    status.classList.add("empty");
  }
  status.appendChild(statusText);

  header.appendChild(status);
  panel.appendChild(header);

  const form = document.createElement("form");
  form.className = "history-score-form";
  const commit = () => saveCourtScore(entry.round, courtIndex, inputA.value, inputB.value);
  let autoSaveTimer = null;
  const queueAutoSave = () => {
    window.clearTimeout(autoSaveTimer);
    autoSaveTimer = window.setTimeout(() => {
      if (form.contains(document.activeElement)) return;
      commit();
    }, 180);
  };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    commit();
  });

  const scoreGrid = document.createElement("div");
  scoreGrid.className = "history-score-grid";

  const inputAWrap = document.createElement("label");
  inputAWrap.className = "history-score-input-wrap";
  inputAWrap.setAttribute("aria-label", "Aの点数");
  const inputA = document.createElement("input");
  inputA.type = "text";
  inputA.min = "0";
  inputA.inputMode = "numeric";
  inputA.maxLength = 2;
  inputA.pattern = "[0-9]*";
  inputA.placeholder = "0";
  inputA.value = court.hasScoreInput ? String(court.scoreA ?? 0) : "";
  inputA.addEventListener("input", () => {
    normalizeScoreInputField(inputA);
    queueAutoSave();
  });
  inputA.addEventListener("blur", (event) => {
    if (event.relatedTarget && form.contains(event.relatedTarget)) return;
    queueAutoSave();
  });
  inputA.addEventListener("keydown", (event) => {
    if (event.key === "Enter") commit();
  });
  inputAWrap.appendChild(inputA);

  const dash = document.createElement("span");
  dash.className = "history-score-dash";
  dash.textContent = "-";

  const inputBWrap = document.createElement("label");
  inputBWrap.className = "history-score-input-wrap";
  inputBWrap.setAttribute("aria-label", "Bの点数");
  const inputB = document.createElement("input");
  inputB.type = "text";
  inputB.min = "0";
  inputB.inputMode = "numeric";
  inputB.maxLength = 2;
  inputB.pattern = "[0-9]*";
  inputB.placeholder = "0";
  inputB.value = court.hasScoreInput ? String(court.scoreB ?? 0) : "";
  inputB.addEventListener("input", () => {
    normalizeScoreInputField(inputB);
    queueAutoSave();
  });
  inputB.addEventListener("blur", (event) => {
    if (event.relatedTarget && form.contains(event.relatedTarget)) return;
    queueAutoSave();
  });
  inputB.addEventListener("keydown", (event) => {
    if (event.key === "Enter") commit();
  });
  inputBWrap.appendChild(inputB);

  scoreGrid.appendChild(inputAWrap);
  scoreGrid.appendChild(dash);
  scoreGrid.appendChild(inputBWrap);

  form.appendChild(scoreGrid);
  panel.appendChild(form);
  return panel;
}

function historyCourtIncludesMember(court, memberNumber) {
  const teamA = court.teamA || [];
  const teamB = court.teamB || [];
  return teamA.includes(memberNumber) || teamB.includes(memberNumber);
}

// 1回のペア作成結果（第n試合）を履歴カードDOMに変換します。
function buildHistoryCard(entry, filterMemberNumber = null) {
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

  const visibleCourts = filterMemberNumber === null
    ? entry.courts.map((court, courtIndex) => ({ court, courtIndex }))
    : entry.courts
      .map((court, courtIndex) => ({ court, courtIndex }))
      .filter(({ court }) => historyCourtIncludesMember(court, filterMemberNumber));

  if (visibleCourts.length === 0) {
    return null;
  }

  visibleCourts.forEach(({ court, courtIndex }) => {
    const courtCard = document.createElement("div");
    courtCard.className = "history-court-card";

    const courtMain = document.createElement("div");
    courtMain.className = "history-court-main";

    const courtTitle = document.createElement("p");
    courtTitle.className = "history-label history-court-title";
    const courtNumberText = String(court.label || "").replace("コート", "");
    courtTitle.textContent = `Court ${courtNumberText}`;

    const courtMatch = document.createElement("p");
    courtMatch.className = "history-court-match";
    courtMatch.textContent = court.text;

    courtMain.appendChild(courtTitle);
    courtMain.appendChild(courtMatch);

    courtCard.appendChild(courtMain);
    courtCard.appendChild(buildCourtScorePanel(entry, court, courtIndex + 1));
    courtList.appendChild(courtCard);
  });

  card.appendChild(courtList);

  if (filterMemberNumber === null) {
    const rest = document.createElement("p");
    rest.className = "history-rest";
    rest.textContent = `休憩: ${entry.restNumbers.length > 0 ? entry.restNumbers.join(", ") : "なし"}`;
    card.appendChild(rest);
  }

  item.appendChild(time);
  item.appendChild(dot);
  item.appendChild(card);
  return item;
}

function historyEntryIncludesMember(entry, memberNumber) {
  if (!entry) return false;

  if (entry.type === "match" && entry.courts) {
    return entry.courts.some((court) => {
      const teamA = court.teamA || [];
      const teamB = court.teamB || [];
      return teamA.includes(memberNumber) || teamB.includes(memberNumber);
    });
  }

  if (entry.type === "member-change" && Array.isArray(entry.changes)) {
    return entry.changes.some((change) => change.number === memberNumber);
  }

  return false;
}

function renderHistoryFilter() {
  if (!historyMemberSelect) return;

  const memberNumbers = getTrackedMemberNumbers();
  const previousValue = selectedHistoryMemberNumber === null ? "" : String(selectedHistoryMemberNumber);

  historyMemberSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "全件表示";
  historyMemberSelect.appendChild(allOption);

  memberNumbers.forEach((memberNumber) => {
    const option = document.createElement("option");
    option.value = String(memberNumber);
    option.textContent = retiredSet.has(memberNumber) ? `${memberNumber}番（途中退場）` : `${memberNumber}番`;
    historyMemberSelect.appendChild(option);
  });

  if (previousValue && memberNumbers.includes(Number(previousValue))) {
    historyMemberSelect.value = previousValue;
    selectedHistoryMemberNumber = Number(previousValue);
  } else {
    historyMemberSelect.value = "";
    selectedHistoryMemberNumber = null;
  }

  if (!historyMemberSelect.dataset.bound) {
    historyMemberSelect.addEventListener("change", () => {
      selectedHistoryMemberNumber = historyMemberSelect.value === "" ? null : Number(historyMemberSelect.value);
      renderHistoryList();
    });
    historyMemberSelect.dataset.bound = "true";
  }
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
  normalizeHistoryCourtScores();
  renderHistoryFilter();
  historyList.innerHTML = "";

  const filterMemberNumber = selectedHistoryMemberNumber;
  const filteredEntries = historyEntries.filter((entry) => {
    if (filterMemberNumber === null) return true;
    return historyEntryIncludesMember(entry, filterMemberNumber);
  });

  if (filteredEntries.length === 0) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "history-card";
    const emptyText = document.createElement("p");
    emptyText.className = "history-rest";
    emptyText.textContent = filterMemberNumber === null
      ? "まだ履歴はありません。試合を作成するとここに表示されます。"
      : `${filterMemberNumber}番が参加した履歴はまだありません。`;
    emptyCard.appendChild(emptyText);
    historyList.appendChild(emptyCard);
    return;
  }

  [...filteredEntries].reverse().forEach((entry) => {
    if (entry.type === "match") {
      const card = buildHistoryCard(entry, filterMemberNumber);
      if (card) historyList.appendChild(card);
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
    ensurePairHistoryExists(i);
  }
  updateRemoveSelect();
}

function ensureRestCountExists(number) {
  if (restCounts[number] === undefined) restCounts[number] = 0;
}

function ensurePairHistoryExists(number) {
  if (!pairHistoryByMember[number]) pairHistoryByMember[number] = {};
}

function ensureOpponentHistoryExists(number) {
  if (!opponentHistoryByMember[number]) opponentHistoryByMember[number] = {};
}

function getPairCount(firstNumber, secondNumber) {
  return pairCounts[getPairKey(firstNumber, secondNumber)] || 0;
}

function recordPairUsage(firstNumber, secondNumber) {
  const pairKey = getPairKey(firstNumber, secondNumber);
  pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;

  ensurePairHistoryExists(firstNumber);
  ensurePairHistoryExists(secondNumber);
  pairHistoryByMember[firstNumber][secondNumber] = (pairHistoryByMember[firstNumber][secondNumber] || 0) + 1;
  pairHistoryByMember[secondNumber][firstNumber] = (pairHistoryByMember[secondNumber][firstNumber] || 0) + 1;
}

function getOpponentKey(teamA, teamB) {
  const sortedTeams = [teamA, teamB].map((pair) => getPairKey(pair[0], pair[1])).sort((left, right) => {
    const [firstLeft, secondLeft] = left.split("-").map(Number);
    const [firstRight, secondRight] = right.split("-").map(Number);
    if (firstLeft !== firstRight) return firstLeft - firstRight;
    return secondLeft - secondRight;
  });
  return `${sortedTeams[0]}__${sortedTeams[1]}`;
}

function recordOpponentUsage(teamA, teamB) {
  const opponentKey = getOpponentKey(teamA, teamB);
  opponentCounts[opponentKey] = (opponentCounts[opponentKey] || 0) + 1;

  teamA.forEach((member) => {
    ensureOpponentHistoryExists(member);
    teamB.forEach((opponent) => {
      opponentHistoryByMember[member][opponent] = (opponentHistoryByMember[member][opponent] || 0) + 1;
    });
  });

  teamB.forEach((member) => {
    ensureOpponentHistoryExists(member);
    teamA.forEach((opponent) => {
      opponentHistoryByMember[member][opponent] = (opponentHistoryByMember[member][opponent] || 0) + 1;
    });
  });
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
// 未ペアを優先しつつ、候補が少ないメンバーを先に救うように組み合わせます。
function buildPairings(activeNumbers) {
  const remainingNumbers = [...activeNumbers]; // 未処理のプレイヤー番号リスト（選ぶたびに減る）
  const memo = new Map();

  function getMemberPartnerStats(member, remaining) {
    let bestPairCount = Infinity;
    let partnerCount = 0;

    for (const other of remaining) {
      if (other === member) continue;
      const currentCount = getPairCount(member, other);
      if (currentCount < bestPairCount) {
        bestPairCount = currentCount;
        partnerCount = 1;
      } else if (currentCount === bestPairCount) {
        partnerCount += 1;
      }
    }

    return { bestPairCount, partnerCount };
  }

  function pickAnchorMember(remaining) {
    const stats = remaining.map((member) => {
      const partnerStats = getMemberPartnerStats(member, remaining);
      return { member, ...partnerStats };
    });

    const smallestPartnerCount = Math.min(...stats.map((item) => item.partnerCount));
    const constrainedMembers = stats.filter((item) => item.partnerCount === smallestPartnerCount);
    const smallestBestPairCount = Math.min(...constrainedMembers.map((item) => item.bestPairCount));
    const bestCandidates = constrainedMembers.filter((item) => item.bestPairCount === smallestBestPairCount);
    return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
  }

  function isBetterScore(candidateScore, currentBestScore) {
    if (!currentBestScore) return true;
    if (candidateScore.zeroPairs !== currentBestScore.zeroPairs) {
      return candidateScore.zeroPairs > currentBestScore.zeroPairs;
    }
    if (candidateScore.totalPairCount !== currentBestScore.totalPairCount) {
      return candidateScore.totalPairCount < currentBestScore.totalPairCount;
    }
    if (candidateScore.rarityPenalty !== currentBestScore.rarityPenalty) {
      return candidateScore.rarityPenalty < currentBestScore.rarityPenalty;
    }
    return false;
  }

  function areSameScore(scoreA, scoreB) {
    return scoreA.zeroPairs === scoreB.zeroPairs
      && scoreA.totalPairCount === scoreB.totalPairCount
      && scoreA.rarityPenalty === scoreB.rarityPenalty;
  }

  function solve(remaining) {
    if (remaining.length < 2) {
      return { pairings: [], score: { zeroPairs: 0, totalPairCount: 0, rarityPenalty: 0 } };
    }

    const memoKey = remaining.join(",");
    if (memo.has(memoKey)) {
      return memo.get(memoKey);
    }

    const anchorStats = pickAnchorMember(remaining);
    const anchorMember = anchorStats.member;
    const partnerCandidates = remaining.filter((member) => member !== anchorMember);
    let bestSolution = null;

    for (const partnerMember of partnerCandidates) {
      const nextRemaining = remaining.filter((member) => member !== anchorMember && member !== partnerMember);
      const subSolution = solve(nextRemaining);
      const currentPairCount = getPairCount(anchorMember, partnerMember);
      const partnerStats = getMemberPartnerStats(partnerMember, remaining);
      const candidateScore = {
        zeroPairs: subSolution.score.zeroPairs + (currentPairCount === 0 ? 1 : 0),
        totalPairCount: subSolution.score.totalPairCount + currentPairCount,
        rarityPenalty: subSolution.score.rarityPenalty + anchorStats.partnerCount + partnerStats.partnerCount
      };
      const candidateSolution = {
        pairings: [[anchorMember, partnerMember].sort((a, b) => a - b), ...subSolution.pairings],
        score: candidateScore
      };

      if (!bestSolution || isBetterScore(candidateSolution.score, bestSolution.score)) {
        bestSolution = candidateSolution;
        continue;
      }

      if (bestSolution && areSameScore(candidateSolution.score, bestSolution.score) && Math.random() < 0.5) {
        bestSolution = candidateSolution;
      }
    }

    memo.set(memoKey, bestSolution);
    return bestSolution;
  }

  return solve(remainingNumbers).pairings;
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
  const pairs = buildPairings(playingNumbers);

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

  pairs.forEach((pair) => {
    if (pair && pair.length === 2) {
      recordPairUsage(pair[0], pair[1]);
    }
  });

  matches.forEach((match) => {
    if (match.teamA && match.teamB) {
      recordOpponentUsage(match.teamA, match.teamB);
    }
  });

  // 休憩した人の回数を記録に反映します。
  restNumbers.forEach((number) => {
    ensureRestCountExists(number);
    restCounts[number] += 1;
  });

  // 直近試合の休憩者番号として保持（将来の表示連携用）
  lastRestNumbers = [...restNumbers];

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

function getTrackedMemberNumbers() {
  const maxNumberToShow = Math.max(nextNumber - 1, activeNumbers.length);
  return Array.from({ length: maxNumberToShow }, (_, index) => index + 1);
}

function compareMemberPairEntries(left, right) {
  if (right.count !== left.count) return right.count - left.count;
  return left.number - right.number;
}

function compareMemberOpponentEntries(left, right) {
  if (right.count !== left.count) return right.count - left.count;
  return left.number - right.number;
}

function buildMemberPairDetail(memberNumber, memberNumbers) {
  const detail = document.createElement('div');
  detail.className = 'stats-member-detail';

  const title = document.createElement('p');
  title.className = 'stats-member-detail-title';
  title.textContent = `${memberNumber}番のペア相手`;
  detail.appendChild(title);

  const partnerEntries = memberNumbers
    .filter((number) => number !== memberNumber)
    .map((number) => ({
      number,
      count: pairHistoryByMember[memberNumber]?.[number] || 0
    }))
    .filter((entry) => entry.count > 0)
    .sort(compareMemberPairEntries);

  if (partnerEntries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'stats-member-detail-empty';
    empty.textContent = 'まだこのメンバーのペア履歴はありません。';
    detail.appendChild(empty);
    return detail;
  }

  const tableWrap = document.createElement('div');
  tableWrap.className = 'stats-member-detail-table';

  const table = document.createElement('table');
  table.className = 'rest-table';

  const headerRow = document.createElement('tr');
  const headerPartner = document.createElement('th');
  headerPartner.textContent = '相手';
  const headerCount = document.createElement('th');
  headerCount.textContent = '回数';
  headerRow.appendChild(headerPartner);
  headerRow.appendChild(headerCount);
  table.appendChild(headerRow);

  partnerEntries.forEach((entry) => {
    const row = document.createElement('tr');
    const partnerCell = document.createElement('td');
    partnerCell.textContent = `${entry.number}番`;
    const countCell = document.createElement('td');
    countCell.textContent = `${entry.count}回`;
    row.appendChild(partnerCell);
    row.appendChild(countCell);
    table.appendChild(row);
  });

  tableWrap.appendChild(table);
  detail.appendChild(tableWrap);
  return detail;
}

function renderMemberPairStats() {
  if (!statsMemberSelect || !statsMemberDetail) return;

  const memberNumbers = getTrackedMemberNumbers();
  statsMemberSelect.innerHTML = '';
  statsMemberDetail.innerHTML = '';

  if (memberNumbers.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'stats-member-detail-empty';
    empty.textContent = 'まだメンバー履歴はありません。';
    statsMemberDetail.appendChild(empty);
    selectedMemberNumber = null;
    return;
  }

  if (!selectedMemberNumber || !memberNumbers.includes(selectedMemberNumber)) {
    selectedMemberNumber = memberNumbers[0];
  }

  memberNumbers.forEach((memberNumber) => {
    const option = document.createElement('option');
    option.value = String(memberNumber);
    option.textContent = retiredSet.has(memberNumber) ? `${memberNumber}番（途中退場）` : `${memberNumber}番`;
    if (memberNumber === selectedMemberNumber) {
      option.selected = true;
    }
    statsMemberSelect.appendChild(option);
  });

  statsMemberSelect.value = String(selectedMemberNumber);
  if (!statsMemberSelect.dataset.bound) {
    statsMemberSelect.addEventListener('change', () => {
      selectedMemberNumber = Number(statsMemberSelect.value);
      renderMemberPairStats();
    });
    statsMemberSelect.dataset.bound = 'true';
  }

  statsMemberDetail.appendChild(buildMemberPairDetail(selectedMemberNumber, memberNumbers));
}

function buildMemberOpponentDetail(memberNumber, memberNumbers) {
  const detail = document.createElement('div');
  detail.className = 'stats-member-detail';

  const title = document.createElement('p');
  title.className = 'stats-member-detail-title';
  title.textContent = `${memberNumber}番の対戦相手`;
  detail.appendChild(title);

  const opponentEntries = memberNumbers
    .filter((number) => number !== memberNumber)
    .map((number) => ({
      number,
      count: opponentHistoryByMember[memberNumber]?.[number] || 0
    }))
    .filter((entry) => entry.count > 0)
    .sort(compareMemberOpponentEntries);

  if (opponentEntries.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'stats-member-detail-empty';
    empty.textContent = 'まだこのメンバーの対戦履歴はありません。';
    detail.appendChild(empty);
    return detail;
  }

  const tableWrap = document.createElement('div');
  tableWrap.className = 'stats-member-detail-table';

  const table = document.createElement('table');
  table.className = 'rest-table';

  const headerRow = document.createElement('tr');
  const headerOpponent = document.createElement('th');
  headerOpponent.textContent = '相手';
  const headerCount = document.createElement('th');
  headerCount.textContent = '回数';
  headerRow.appendChild(headerOpponent);
  headerRow.appendChild(headerCount);
  table.appendChild(headerRow);

  opponentEntries.forEach((entry) => {
    const row = document.createElement('tr');
    const opponentCell = document.createElement('td');
    opponentCell.textContent = `${entry.number}番`;
    const countCell = document.createElement('td');
    countCell.textContent = `${entry.count}回`;
    row.appendChild(opponentCell);
    row.appendChild(countCell);
    table.appendChild(row);
  });

  tableWrap.appendChild(table);
  detail.appendChild(tableWrap);
  return detail;
}

function renderOpponentStats() {
  if (!statsOpponentSelect || !statsOpponentDetail) return;

  const memberNumbers = getTrackedMemberNumbers();
  statsOpponentSelect.innerHTML = '';
  statsOpponentDetail.innerHTML = '';

  if (memberNumbers.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'stats-member-detail-empty';
    empty.textContent = 'まだメンバー履歴はありません。';
    statsOpponentDetail.appendChild(empty);
    selectedOpponentMemberNumber = null;
    return;
  }

  if (!selectedOpponentMemberNumber || !memberNumbers.includes(selectedOpponentMemberNumber)) {
    selectedOpponentMemberNumber = memberNumbers[0];
  }

  memberNumbers.forEach((memberNumber) => {
    const option = document.createElement('option');
    option.value = String(memberNumber);
    option.textContent = retiredSet.has(memberNumber) ? `${memberNumber}番（途中退場）` : `${memberNumber}番`;
    if (memberNumber === selectedOpponentMemberNumber) {
      option.selected = true;
    }
    statsOpponentSelect.appendChild(option);
  });

  statsOpponentSelect.value = String(selectedOpponentMemberNumber);
  if (!statsOpponentSelect.dataset.bound) {
    statsOpponentSelect.addEventListener('change', () => {
      selectedOpponentMemberNumber = Number(statsOpponentSelect.value);
      renderOpponentStats();
    });
    statsOpponentSelect.dataset.bound = 'true';
  }

  statsOpponentDetail.appendChild(buildMemberOpponentDetail(selectedOpponentMemberNumber, memberNumbers));
}

function getScoredCourts() {
  normalizeHistoryCourtScores();
  const scoredCourts = [];

  historyEntries.forEach((entry) => {
    if (entry.type !== "match" || !entry.courts) return;
    entry.courts.forEach((court) => {
      if (court.hasScoreInput !== true) {
        return;
      }
      scoredCourts.push({
        round: entry.round,
        courtIndex: court.label,
        teamA: [...(court.teamA || [])],
        teamB: [...(court.teamB || [])],
        scoreA: court.scoreA,
        scoreB: court.scoreB
      });
    });
  });

  return scoredCourts;
}

function buildRankingTable(headers, rows) {
  const table = document.createElement("table");
  table.className = "rest-table";

  const headerRow = document.createElement("tr");
  headers.forEach((headerText) => {
    const header = document.createElement("th");
    header.textContent = headerText;
    headerRow.appendChild(header);
  });
  table.appendChild(headerRow);

  if (rows.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = headers.length;
    emptyCell.textContent = "まだ点数が入力されていません。";
    emptyRow.appendChild(emptyCell);
    table.appendChild(emptyRow);
    return table;
  }

  rows.forEach((rowValues) => {
    const row = document.createElement("tr");
    rowValues.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    table.appendChild(row);
  });

  return table;
}

function compareRankingEntries(left, right) {
  if (right.wins !== left.wins) return right.wins - left.wins;
  if (right.appearances !== left.appearances) return right.appearances - left.appearances;
  return left.number - right.number;
}

function comparePairRankingEntries(left, right) {
  if (right.wins !== left.wins) return right.wins - left.wins;
  if (right.appearances !== left.appearances) return right.appearances - left.appearances;
  return comparePairKeys(left.pairKey, right.pairKey);
}

function comparePairKeys(pairKeyA, pairKeyB) {
  const [firstA, secondA] = pairKeyA.split("-").map(Number);
  const [firstB, secondB] = pairKeyB.split("-").map(Number);
  if (firstA !== firstB) return firstA - firstB;
  return secondA - secondB;
}

function getRankingData() {
  const scoredCourts = getScoredCourts();
  const individualMap = new Map();
  const pairMap = new Map();

  const ensureIndividual = (number) => {
    if (!individualMap.has(number)) {
      individualMap.set(number, { number, wins: 0, appearances: 0 });
    }
    return individualMap.get(number);
  };

  scoredCourts.forEach((court) => {
    const teamAIsWinner = court.scoreA > court.scoreB;
    const teamBIsWinner = court.scoreB > court.scoreA;
    const teams = [
      { members: court.teamA, winner: teamAIsWinner },
      { members: court.teamB, winner: teamBIsWinner }
    ];

    teams.forEach((team) => {
      (team.members || []).forEach((member) => {
        const entry = ensureIndividual(member);
        entry.appearances += 1;
        if (team.winner) {
          entry.wins += 1;
        }
      });

      if (team.winner && team.members && team.members.length === 2) {
        const pairKey = getPairKey(team.members[0], team.members[1]);
        pairMap.set(pairKey, (pairMap.get(pairKey) || 0) + 1);
      }
    });
  });

  const individualRows = [...individualMap.values()]
    .sort(compareRankingEntries);

  const pairRows = [...pairMap.entries()]
    .map(([pairKey, wins]) => ({
      pairKey,
      wins,
      appearances: wins
    }))
    .sort(comparePairRankingEntries);

  return { individualRows, pairRows };
}

function renderRankingStats() {
  if (!statsRankingArea) return;

  const { individualRows, pairRows } = getRankingData();
  statsRankingArea.innerHTML = "";

  const individualSection = document.createElement("div");
  individualSection.className = "ranking-section";

  const individualTitle = document.createElement("p");
  individualTitle.className = "stats-member-detail-title";
  individualTitle.textContent = "個人勝利数";
  individualSection.appendChild(individualTitle);

  const individualRowsData = individualRows.slice(0, 5).map((entry, index) => [
    `${index + 1}位`,
    `${entry.number}番`,
    `${entry.wins}勝`
  ]);
  individualSection.appendChild(buildRankingTable(["順位", "メンバー", "勝利数"], individualRowsData));

  const pairSection = document.createElement("div");
  pairSection.className = "ranking-section";

  const pairTitle = document.createElement("p");
  pairTitle.className = "stats-member-detail-title";
  pairTitle.textContent = "ペア勝利数";
  pairSection.appendChild(pairTitle);

  const pairRowsData = pairRows.slice(0, 5).map((entry, index) => [
    `${index + 1}位`,
    entry.pairKey,
    `${entry.wins}勝`
  ]);
  pairSection.appendChild(buildRankingTable(["順位", "ペア", "勝利数"], pairRowsData));

  if (individualRows.length === 0 && pairRows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "stats-member-detail-empty";
    empty.textContent = "まだ点数が入力されていません。";
    statsRankingArea.appendChild(empty);
    return;
  }

  statsRankingArea.appendChild(individualSection);
  statsRankingArea.appendChild(pairSection);
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
    courts: matches.map((match) => ({
      label: match.label,
      text: match.text,
      teamA: [...(match.teamA || [])],
      teamB: [...(match.teamB || [])],
      scoreA: 0,
      scoreB: 0,
      hasScoreInput: false
    })),
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
  renderMemberPairStats();
  renderOpponentStats();
  renderRankingStats();
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
  pairCounts = {};
  pairHistoryByMember = {};
  opponentCounts = {};
  opponentHistoryByMember = {};
  selectedMemberNumber = null;
  selectedOpponentMemberNumber = null;
  lastRestNumbers = [];
  matchRoundCount = 0;
  historyEntries = [];
  resetResults();
  renderHistoryList();
  renderRestTable();
  renderMemberPairStats();
  renderOpponentStats();
  renderRankingStats();
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
  ensurePairHistoryExists(assigned);
  ensureOpponentHistoryExists(assigned);
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
  renderMemberPairStats();
  renderOpponentStats();
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
  renderMemberPairStats();
  renderOpponentStats();
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
renderMemberPairStats();
renderOpponentStats();
renderRankingStats();
if (tabMatch) activateTab(tabMatch, screenMatch);

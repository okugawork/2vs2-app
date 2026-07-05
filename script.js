// DOM 要素の参照を取得します。
const participantCountSelect = document.getElementById("participantCount");
const courtCountInput = document.getElementById("courtCount");
const createMatchesButton = document.getElementById("createMatchesButton");
const resetButton = document.getElementById("resetButton");
const resultSummary = document.getElementById("resultSummary");
const matchListElement = document.getElementById("matchList");
const modeHint = document.getElementById("modeHint");

// 休憩回数や状態を保持する変数です。
let restCounts = [];
let isLocked = false;
let previousPairKeys = [];

// 入力欄のロック/ロック解除を行います。
function setControlsLocked(locked) {
  participantCountSelect.disabled = locked;
  courtCountInput.disabled = locked;
}

// 休憩回数管理用の配列を初期化します。
function initializeRestCounts(totalCount) {
  restCounts = Array.from({ length: totalCount + 1 }, () => 0);
}

// 休憩者を選ぶ関数です。
// 休憩回数が少ない人を優先し、偏りを抑えながらランダムに休憩者を選びます。
function chooseRestNumbers(totalCount, restCount) {
  if (restCount <= 0) {
    return [];
  }

  const selected = [];
  const workingCounts = [...restCounts];

  for (let index = 0; index < restCount; index += 1) {
    const minimumCount = Math.min(...workingCounts.slice(1));
    const candidates = [];

    for (let number = 1; number <= totalCount; number += 1) {
      if (!selected.includes(number) && workingCounts[number] === minimumCount) {
        candidates.push(number);
      }
    }

    const pickedNumber = candidates[Math.floor(Math.random() * candidates.length)];
    selected.push(pickedNumber);
    workingCounts[pickedNumber] += 1;
  }

  return selected.sort((a, b) => a - b);
}

// 配列をシャッフルするユーティリティ関数です。
function shuffle(array) {
  const copied = [...array];
  for (let index = copied.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[swapIndex]] = [copied[swapIndex], copied[index]];
  }
  return copied;
}

// ペアの一意なキーを生成し、同じ組み合わせを比較しやすくします。
function getPairKey(firstNumber, secondNumber) {
  const sortedPair = [firstNumber, secondNumber].sort((a, b) => a - b);
  return `${sortedPair[0]}-${sortedPair[1]}`;
}

// 有効なプレイヤーの中からペアを作成します。
// 前回のペアと同じ組み合わせはなるべく避けるようにします。
function buildPairings(activeNumbers, bannedPairKeys) {
  const remainingNumbers = [...activeNumbers];
  const pairings = [];

  while (remainingNumbers.length >= 2) {
    const candidatePairs = [];

    for (let index = 0; index < remainingNumbers.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < remainingNumbers.length; nextIndex += 1) {
        const firstNumber = remainingNumbers[index];
        const secondNumber = remainingNumbers[nextIndex];
        const pair = [firstNumber, secondNumber].sort((a, b) => a - b);
        const pairKey = getPairKey(firstNumber, secondNumber);

        if (!bannedPairKeys.includes(pairKey)) {
          candidatePairs.push({ pair, pairKey });
        }
      }
    }

    const selectedPair = candidatePairs.length > 0
      ? candidatePairs[Math.floor(Math.random() * candidatePairs.length)]
      : {
        pair: [remainingNumbers[0], remainingNumbers[1]].sort((a, b) => a - b),
        pairKey: getPairKey(remainingNumbers[0], remainingNumbers[1])
      };

    pairings.push(selectedPair.pair);

    const firstNumber = selectedPair.pair[0];
    const secondNumber = selectedPair.pair[1];
    remainingNumbers.splice(remainingNumbers.indexOf(firstNumber), 1);
    remainingNumbers.splice(remainingNumbers.indexOf(secondNumber), 1);
  }

  return pairings;
}

// 試合を作成するメインの関数です。
// コート数・参加人数・休憩者の選択・ペア生成を行います。
function createMatches(totalCount, courtCount) {
  const safeCourtCount = Math.max(1, Number(courtCount) || 1);
  const possibleMatchCount = Math.min(safeCourtCount, Math.floor(totalCount / 4));
  const restCount = totalCount - possibleMatchCount * 4;
  const restNumbers = chooseRestNumbers(totalCount, restCount);

  const playingNumbers = Array.from({ length: totalCount }, (_, index) => index + 1)
    .filter((number) => !restNumbers.includes(number));
  const pairs = buildPairings(playingNumbers, previousPairKeys);

  const matches = [];
  for (let index = 0; index < possibleMatchCount; index += 1) {
    const firstPair = pairs[index * 2];
    const secondPair = pairs[index * 2 + 1];
    if (firstPair && secondPair) {
      matches.push({
        label: `コート${index + 1}`,
        text: `${firstPair[0]}, ${firstPair[1]} VS ${secondPair[0]}, ${secondPair[1]}`
      });
    }
  }

  // 休憩した人の回数を記録に反映します。
  restNumbers.forEach((number) => {
    restCounts[number] += 1;
  });

  // 次回の組み合わせで同じペアが出ないように、今回のペアを保存します。
  previousPairKeys = pairs.map((pair) => getPairKey(pair[0], pair[1]));

  return { matches, restNumbers };
}

// 結果表示と状態を初期化します。
function resetResults() {
  resultSummary.textContent = "まだ作成結果はありません。人数を選んで「ペア作成」を押してください。";
  resultSummary.classList.add("empty-state");
  matchListElement.innerHTML = "";
  previousPairKeys = [];
  modeHint.textContent = "初回のペア作成前に人数とコート数を変更できます。変更する場合は「リセット」を押してください。";
}

// 画面に試合結果を表示する関数です。
// createMatches で生成した試合と休憩者を受け取り、
// HTML を作成して画面に反映します。
function renderMatches(totalCount, courtCount) {
  const safeCourtCount = Math.max(1, Number(courtCount) || 1);
  const { matches, restNumbers } = createMatches(totalCount, courtCount);

  resultSummary.classList.remove("empty-state");
  resultSummary.textContent = `${totalCount}人で${safeCourtCount}コート、${matches.length}試合を作成しました。`;
  matchListElement.innerHTML = "";
  modeHint.textContent = "人数とコート数を変更するには「リセット」を押してください。";

  if (safeCourtCount > Math.floor(totalCount / 4)) {
    const warning = document.createElement("p");
    warning.className = "warning-text";
    warning.textContent = `コート数が多すぎるため、${Math.floor(totalCount / 4)}試合分しか作成できません。`;
    matchListElement.appendChild(warning);
  }

  matches.forEach((match) => {
    const card = document.createElement("div");
    card.className = "match-card";

    const title = document.createElement("p");
    title.className = "match-title";
    title.textContent = match.label;

    const text = document.createElement("p");
    text.className = "match-text";
    text.textContent = match.text;

    card.appendChild(title);
    card.appendChild(text);
    matchListElement.appendChild(card);
  });

  if (restNumbers.length > 0) {
    const restCard = document.createElement("div");
    restCard.className = "rest-card";

    const restTitle = document.createElement("p");
    restTitle.className = "match-title";
    restTitle.textContent = "休憩者";

    const restMembers = document.createElement("p");
    restMembers.className = "match-text";
    restMembers.textContent = restNumbers.join(", ");

    const restTableWrapper = document.createElement("div");
    restTableWrapper.className = "rest-table-wrapper";
    const restTableTitle = document.createElement("p");
    restTableTitle.className = "rest-table-title";
    restTableTitle.textContent = "休憩回数表";
    const restTable = document.createElement("table");
    restTable.className = "rest-table";

    const headerRow = document.createElement("tr");
    const headerNumber = document.createElement("th");
    headerNumber.textContent = "番号";
    const headerCount = document.createElement("th");
    headerCount.textContent = "回数";
    headerRow.appendChild(headerNumber);
    headerRow.appendChild(headerCount);
    restTable.appendChild(headerRow);

    for (let number = 1; number <= totalCount; number += 1) {
      const row = document.createElement("tr");
      const numberCell = document.createElement("td");
      numberCell.textContent = `${number}番`;
      const countCell = document.createElement("td");
      countCell.textContent = `${restCounts[number]}回`;
      row.appendChild(numberCell);
      row.appendChild(countCell);
      restTable.appendChild(row);
    }

    restCard.appendChild(restTitle);
    restCard.appendChild(restMembers);
    matchListElement.appendChild(restCard);

    restTableWrapper.appendChild(restTableTitle);
    restTableWrapper.appendChild(restTable);
    matchListElement.appendChild(restTableWrapper);
  }
}

// ペア作成ボタンが押されたときの処理です。
createMatchesButton.addEventListener("click", () => {
  const totalCount = Number(participantCountSelect.value);
  const courtCount = Math.max(1, Number(courtCountInput.value) || 1);

  if (!isLocked || restCounts.length !== totalCount + 1) {
    initializeRestCounts(totalCount);
  }

  renderMatches(totalCount, courtCount);
  isLocked = true;
  setControlsLocked(true);
});

// リセットボタンが押されたときの処理です。
resetButton.addEventListener("click", () => {
  isLocked = false;
  restCounts = [];
  previousPairKeys = [];
  setControlsLocked(false);
  resetResults();
});

// 最初に画面を初期状態にします。
resetResults();

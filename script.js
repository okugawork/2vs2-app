const participantCountSelect = document.getElementById("participantCount");
const courtCountInput = document.getElementById("courtCount");
const createMatchesButton = document.getElementById("createMatchesButton");
const resetButton = document.getElementById("resetButton");
const resultSummary = document.getElementById("resultSummary");
const matchListElement = document.getElementById("matchList");
const modeHint = document.getElementById("modeHint");

let restCounts = [];
let isLocked = false;

function setControlsLocked(locked) {
  participantCountSelect.disabled = locked;
  courtCountInput.disabled = locked;
}

function initializeRestCounts(totalCount) {
  restCounts = Array.from({ length: totalCount + 1 }, () => 0);
}

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

function shuffle(array) {
  const copied = [...array];
  for (let index = copied.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[swapIndex]] = [copied[swapIndex], copied[index]];
  }
  return copied;
}

function createMatches(totalCount, courtCount) {
  const safeCourtCount = Math.max(1, Number(courtCount) || 1);
  const possibleMatchCount = Math.min(safeCourtCount, Math.floor(totalCount / 4));
  const restCount = totalCount - possibleMatchCount * 4;
  const restNumbers = chooseRestNumbers(totalCount, restCount);

  const playingNumbers = Array.from({ length: totalCount }, (_, index) => index + 1)
    .filter((number) => !restNumbers.includes(number));
  const shuffledPlayers = shuffle(playingNumbers);
  const pairs = [];

  for (let index = 0; index < shuffledPlayers.length; index += 2) {
    const pair = [shuffledPlayers[index], shuffledPlayers[index + 1]].sort((a, b) => a - b);
    pairs.push(pair);
  }

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

  restNumbers.forEach((number) => {
    restCounts[number] += 1;
  });

  return { matches, restNumbers };
}

function resetResults() {
  resultSummary.textContent = "まだ作成結果はありません。人数を選んで「ペア作成」を押してください。";
  resultSummary.classList.add("empty-state");
  matchListElement.innerHTML = "";
  modeHint.textContent = "初回のペア作成前に人数とコート数を変更できます。変更する場合は「リセット」を押してください。";
}

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

resetButton.addEventListener("click", () => {
  isLocked = false;
  restCounts = [];
  setControlsLocked(false);
  resetResults();
});

resetResults();

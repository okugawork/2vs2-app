const participantCountSelect = document.getElementById("participantCount");
const createMatchesButton = document.getElementById("createMatchesButton");
const resultSummary = document.getElementById("resultSummary");
const matchListElement = document.getElementById("matchList");
const remainderText = document.getElementById("remainderText");

function shuffle(array) {
  const copied = [...array];
  for (let index = copied.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[swapIndex]] = [copied[swapIndex], copied[index]];
  }
  return copied;
}

function createMatches(totalCount) {
  const fullMatchCount = Math.floor(totalCount / 4);
  const shuffledPlayers = shuffle(Array.from({ length: totalCount }, (_, index) => index + 1));
  const playersForMatches = shuffledPlayers.slice(0, fullMatchCount * 4);
  const leftovers = shuffledPlayers.slice(fullMatchCount * 4).sort((a, b) => a - b);

  const pairs = [];
  for (let index = 0; index < playersForMatches.length; index += 2) {
    const pair = [playersForMatches[index], playersForMatches[index + 1]].sort((a, b) => a - b);
    pairs.push(pair);
  }

  const matches = [];
  for (let index = 0; index < fullMatchCount; index += 1) {
    const firstPair = pairs[index * 2];
    const secondPair = pairs[index * 2 + 1];
    matches.push(`${firstPair[0]}, ${firstPair[1]} VS ${secondPair[0]}, ${secondPair[1]}`);
  }

  return { matches, leftovers };
}

function resetResults() {
  resultSummary.textContent = "まだ作成結果はありません。人数を選んで「ペア作成」を押してください。";
  resultSummary.classList.add("empty-state");
  matchListElement.innerHTML = "";
  remainderText.textContent = "";
}

function renderMatches(totalCount) {
  const { matches, leftovers } = createMatches(totalCount);

  resultSummary.classList.remove("empty-state");
  resultSummary.textContent = `${totalCount}人で${matches.length}試合を作成しました。`;
  matchListElement.innerHTML = "";

  matches.forEach((match, index) => {
    const card = document.createElement("div");
    card.className = "match-card";

    const title = document.createElement("p");
    title.className = "match-title";
    title.textContent = `試合${index + 1}`;

    const text = document.createElement("p");
    text.className = "match-text";
    text.textContent = match;

    card.appendChild(title);
    card.appendChild(text);
    matchListElement.appendChild(card);
  });

  if (leftovers.length > 0) {
    remainderText.textContent = `休憩: ${leftovers.join(", ")}`;
  } else {
    remainderText.textContent = "";
  }
}

createMatchesButton.addEventListener("click", () => {
  const totalCount = Number(participantCountSelect.value);
  renderMatches(totalCount);
});

resetResults();

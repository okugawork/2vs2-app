const participantListElement = document.getElementById("participantList");
const playerNameInput = document.getElementById("playerName");
const registerButton = document.getElementById("registerButton");

const participants = [];

function renderParticipants() {
  participantListElement.innerHTML = "";

  if (participants.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";
    emptyItem.textContent = "まだ参加者が登録されていません。";
    participantListElement.appendChild(emptyItem);
    return;
  }

  participants.forEach((name) => {
    const item = document.createElement("li");
    item.className = "participant-item";
    item.textContent = name;
    participantListElement.appendChild(item);
  });
}

function addParticipant() {
  const name = playerNameInput.value.trim();
  if (!name) {
    playerNameInput.focus();
    return;
  }

  participants.push(name);
  playerNameInput.value = "";
  playerNameInput.focus();
  renderParticipants();
}

registerButton.addEventListener("click", addParticipant);
playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addParticipant();
  }
});

renderParticipants();

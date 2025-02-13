// Create an instance of our final game logic
const game = new DartsGame();

// Turn-based flow
let currentPlayerIndex = 0;

// Redemption state
let redemptionInProgress = false;
let redemptionShots = [];         // Collects one shot each from redemption players
let redemptionPlayersLeft = [];   // The set of players who need a redemption turn

// Helper to set UI messages
function setStatusMessage(msg) {
  const statusEl = document.getElementById("statusMessage");
  statusEl.textContent = msg || "";
}

// Add a player
function addPlayer() {
  const playerNameInput = document.getElementById("playerName");
  const name = playerNameInput.value.trim();
  if (name) {
    game.addPlayer(name);
    updatePlayerList();
    playerNameInput.value = "";
  }
}

// Rebuild the visible list of players
function updatePlayerList() {
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = "";

  game.players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p;
    playerList.appendChild(li);
  });

  if (game.players.length > 1) {
    // Show main game UI
    document.getElementById("gameSection").style.display = "block";
    rebuildScoreboard();
    currentPlayerIndex = 0;
    updateCurrentPlayerDisplay();
  }
}

// Refresh scoreboard
function rebuildScoreboard() {
  const scoreboardDiv = document.getElementById("scoreboard");
  scoreboardDiv.innerHTML = "";

  game.players.forEach(player => {
    const row = document.createElement("div");
    row.classList.add("score-row");

    const playerNameDiv = document.createElement("div");
    playerNameDiv.classList.add("player-name");
    playerNameDiv.textContent = player;

    const scoreDiv = document.createElement("div");
    scoreDiv.classList.add("current-score");
    scoreDiv.textContent = game.scores[player];

    row.appendChild(playerNameDiv);
    row.appendChild(scoreDiv);
    scoreboardDiv.appendChild(row);
  });
}

// Determine whose turn it is
function updateCurrentPlayerDisplay() {
  const currentPlayerSpan = document.getElementById("currentPlayer");
  if (redemptionInProgress) {
    // If no more redemption players left, finalize
    if (redemptionPlayersLeft.length === 0) {
      finalizeRedemptionShots();
      return;
    }
    if (currentPlayerIndex >= redemptionPlayersLeft.length) {
      finalizeRedemptionShots();
      return;
    }
    const p = redemptionPlayersLeft[currentPlayerIndex];
    currentPlayerSpan.textContent = p;
  } else {
    // Normal flow
    if (currentPlayerIndex >= game.players.length) {
      currentPlayerIndex = 0;
    }
    currentPlayerSpan.textContent = game.players[currentPlayerIndex];
  }
}

// Main entry point when a user enters a score
function submitScore() {
  // If a final winner has been declared (and not in redemption), do nothing
  if (game.getWinner() && !redemptionInProgress) {
    setStatusMessage(`Game over. ${game.getWinner()} was the final winner.`);
    return;
  }

  const inputEl = document.getElementById("currentScoreInput");
  const enteredScore = parseInt(inputEl.value, 10) || 0;
  inputEl.value = "";

  if (redemptionInProgress) {
    // We're collecting one redemption shot per redemption player
    handleRedemptionShot(enteredScore);
  } else {
    // Normal scoring flow
    normalFlowScore(enteredScore);
  }
}

// Normal (non-redemption) single-turn flow
function normalFlowScore(enteredScore) {
  const currentPlayerName = game.players[currentPlayerIndex];
  const result = game.recordScore(currentPlayerName, enteredScore);

  if (result === "Bust") {
    setStatusMessage(`${currentPlayerName} busted. Score stays at ${game.scores[currentPlayerName]}.`);
  } else if (result === "Redemption Round Begins") {
    setStatusMessage(`${currentPlayerName} reached ${game.targetScore}! Redemption for others...`);
    startRedemption();
    rebuildScoreboard();
    return; // stop here
  } else if (result === "Overtime Redemption Round Begins") {
    setStatusMessage(`${currentPlayerName} reached ${game.targetScore} in overtime! Redemption for others...`);
    startRedemption();
    rebuildScoreboard();
    return; // stop here
  }

  // If a single winner is declared (no tie), finalize
  if (game.getWinner()) {
    setStatusMessage(`Winner: ${game.getWinner()}. Game Over.`);
    rebuildScoreboard();
    return;
  }

  // Otherwise continue normal turn
  rebuildScoreboard();
  currentPlayerIndex++;
  if (currentPlayerIndex >= game.players.length) {
    currentPlayerIndex = 0;
  }
  updateCurrentPlayerDisplay();
}

// Start redemption: all players in game.redemptionPlayers get exactly one shot
function startRedemption() {
  redemptionInProgress = true;
  redemptionShots = [];
  redemptionPlayersLeft = [...game.redemptionPlayers]; // copy
  currentPlayerIndex = 0;
  updateCurrentPlayerDisplay();
}

// Handle exactly one redemption shot for the current redemption player
function handleRedemptionShot(enteredScore) {
  if (redemptionPlayersLeft.length === 0) {
    // no more redemption players
    finalizeRedemptionShots();
    return;
  }
  const currentRedemptionPlayer = redemptionPlayersLeft[currentPlayerIndex];

  // Record the shot in an array
  redemptionShots.push({
    player: currentRedemptionPlayer,
    score: enteredScore,
  });

  setStatusMessage(`${currentRedemptionPlayer} tries redemption with ${enteredScore} points.`);

  // Move to the next redemption player (no second tries)
  currentPlayerIndex++;
  if (currentPlayerIndex >= redemptionPlayersLeft.length) {
    // Everyone had exactly one redemption shot
    finalizeRedemptionShots();
  } else {
    updateCurrentPlayerDisplay();
  }
}

// Once all redemption players have one shot, call processRedemption
function finalizeRedemptionShots() {
  redemptionInProgress = false;
  currentPlayerIndex = 0;

  if (redemptionShots.length > 0) {
    // Pass all redemptionShots in a single call to processRedemption
    const redemptionResult = game.processRedemption(redemptionShots);
    setStatusMessage(redemptionResult);
  } else {
    setStatusMessage(`No redemption shots were taken.`);
  }

  redemptionShots = [];
  redemptionPlayersLeft = [];

  // Refresh scoreboard with updated totals
  rebuildScoreboard();

  // Check if we have a final winner or if we are in overtime
  if (!game.inOvertime && game.getWinner()) {
    // No tie => original winner stands
    setStatusMessage(`Final Winner: ${game.getWinner()}. Game Over.`);
  } else if (game.inOvertime) {
    // multiple advanced => next turn continues with the new target
    setStatusMessage(`Overtime in progress! Target = ${game.targetScore}. Players = ${game.players.join(", ")}`);
  }

  updateCurrentPlayerDisplay();
}

// We'll assume you're using the final "darts_scoring_game.js" logic that handles multi-overtime, etc.
const game = new DartsGame();

// Track the current player's turn index
let currentPlayerIndex = 0;

// Flags + arrays for redemption
let redemptionInProgress = false;
let redemptionShots = [];
let redemptionPlayersLeft = [];

// Helper to set a status message
function setStatusMessage(msg) {
  const statusEl = document.getElementById("statusMessage");
  statusEl.textContent = msg || "";
}

// Adding a new player
function addPlayer() {
  const nameEl = document.getElementById("playerName");
  const playerName = nameEl.value.trim();
  if (playerName) {
    game.addPlayer(playerName);
    nameEl.value = "";
    updatePlayerList();
  }
}

// Rebuild the list of players
function updatePlayerList() {
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = "";

  game.players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = p;
    playerList.appendChild(li);
  });

  // If we have at least 2 players, show the game section
  if (game.players.length > 1) {
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

    const currentScoreDiv = document.createElement("div");
    currentScoreDiv.classList.add("current-score");
    currentScoreDiv.textContent = game.scores[player];

    row.appendChild(playerNameDiv);
    row.appendChild(currentScoreDiv);
    scoreboardDiv.appendChild(row);
  });
}

// Update the displayed current player
function updateCurrentPlayerDisplay() {
  const currentSpan = document.getElementById("currentPlayer");

  if (redemptionInProgress) {
    if (redemptionPlayersLeft.length === 0) {
      finalizeRedemptionShots();
      return;
    }
    if (currentPlayerIndex >= redemptionPlayersLeft.length) {
      finalizeRedemptionShots();
      return;
    }
    const p = redemptionPlayersLeft[currentPlayerIndex];
    currentSpan.textContent = p;
  } else {
    if (currentPlayerIndex >= game.players.length) {
      currentPlayerIndex = 0;
    }
    currentSpan.textContent = game.players[currentPlayerIndex];
  }
}

// Called when the user clicks "Enter Score"
function submitScore() {
  // If there's already a final winner (and we're not in redemption), do nothing
  if (game.getWinner() && !redemptionInProgress) {
    setStatusMessage(`Game over. ${game.getWinner()} was already declared winner.`);
    return;
  }

  const scoreInput = document.getElementById("currentScoreInput");
  const enteredScore = parseInt(scoreInput.value, 10) || 0;
  scoreInput.value = "";

  if (redemptionInProgress) {
    handleRedemptionShot(enteredScore);
  } else {
    handleNormalTurn(enteredScore);
  }
}

// Normal turn (non-redemption)
function handleNormalTurn(enteredScore) {
  const currentPlayerName = game.players[currentPlayerIndex];
  const result = game.recordScore(currentPlayerName, enteredScore);

  if (result === "Bust") {
    setStatusMessage(`${currentPlayerName} busted. Score stays at ${game.scores[currentPlayerName]}.`);
  } else if (result === "Redemption Round Begins") {
    setStatusMessage(`${currentPlayerName} reached ${game.targetScore}! Redemption for others in regulation...`);
    startRedemption();
    rebuildScoreboard();
    return;
  } else if (result === "Overtime Redemption Round Begins") {
    setStatusMessage(`${currentPlayerName} reached ${game.targetScore} in Overtime! Redemption for others...`);
    startRedemption();
    rebuildScoreboard();
    return;
  }

  // If there's a single final winner (no tie), display
  if (game.getWinner()) {
    setStatusMessage(`Winner: ${game.getWinner()}. Game Over.`);
    rebuildScoreboard();
    return;
  }

  // Otherwise normal next turn
  rebuildScoreboard();
  currentPlayerIndex++;
  if (currentPlayerIndex >= game.players.length) {
    currentPlayerIndex = 0;
  }
  updateCurrentPlayerDisplay();
}

// Start redemption for all players in game.redemptionPlayers
function startRedemption() {
  redemptionInProgress = true;
  redemptionShots = [];
  redemptionPlayersLeft = [...game.redemptionPlayers];
  currentPlayerIndex = 0;
  updateCurrentPlayerDisplay();
}

// Each redemption player gets exactly one shot
function handleRedemptionShot(enteredScore) {
  if (redemptionPlayersLeft.length === 0) {
    finalizeRedemptionShots();
    return;
  }
  const currentP = redemptionPlayersLeft[currentPlayerIndex];

  // Collect the shot
  redemptionShots.push({
    player: currentP,
    score: enteredScore,
  });
  setStatusMessage(`${currentP} tries redemption with ${enteredScore} points...`);

  // Move to next redemption player
  currentPlayerIndex++;
  if (currentPlayerIndex >= redemptionPlayersLeft.length) {
    finalizeRedemptionShots();
  } else {
    updateCurrentPlayerDisplay();
  }
}

// This is where we fix the bug: If the redemption player fails to tie, we finalize with the existing winner.
function finalizeRedemptionShots() {
  redemptionInProgress = false;
  currentPlayerIndex = 0;

  // If no shots => no redemption
  if (redemptionShots.length === 0) {
    setStatusMessage(`No redemption shots taken.`);
    return;
  }

  // Now call processRedemption
  const redemptionResult = game.processRedemption(redemptionShots);
  setStatusMessage(redemptionResult);

  redemptionShots = [];
  redemptionPlayersLeft = [];

  // Rebuild scoreboard with updated totals
  rebuildScoreboard();

  // CASE 1: If the return string is something like "Winner: Player1"
  // Then we finalize immediately with no tie
  if (redemptionResult.startsWith("Winner: ")) {
    // Example: "Winner: Alice"
    // This means the existing winner stands, no tie was found
    setStatusMessage(`${redemptionResult}. Game Over.`);
    return;
  }

  // CASE 2: If the return string is "Players advancing to 401" (or new target),
  // we are in OVERTIME => multi players tied
  if (game.inOvertime && !game.getWinner()) {
    // We have advanced to next target
    setStatusMessage(`Overtime in progress! Target now ${game.targetScore}. Players in game: ${game.players.join(", ")}`);
  }

  // Resume normal flow
  updateCurrentPlayerDisplay();
}

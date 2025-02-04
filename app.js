// Create an instance of our game logic (must be the final darts_scoring_game.js)
const game = new DartsGame();

// We'll track the current player's index, turn by turn
let currentPlayerIndex = 0;

// Flags for redemption
let redemptionInProgress = false;
let redemptionShots = []; // We'll store {player, score} for each redemption shot
let redemptionPlayersLeft = []; // The players who need to do their redemption shot

// Helper: set a user-friendly message in the UI
function setStatusMessage(msg) {
  const statusEl = document.getElementById("statusMessage");
  statusEl.textContent = msg || "";
}

// Called to add a new player to the game
function addPlayer() {
  const playerNameInput = document.getElementById("playerName");
  const playerName = playerNameInput.value.trim();
  if (playerName) {
    game.addPlayer(playerName);
    updatePlayerList();
    playerNameInput.value = "";
  }
}

// Update the visible list of players
function updatePlayerList() {
  const playerList = document.getElementById("playerList");
  playerList.innerHTML = "";

  game.players.forEach(player => {
    const li = document.createElement("li");
    li.textContent = player;
    playerList.appendChild(li);
  });

  // If we have at least 2 players, show the main game section
  if (game.players.length > 1) {
    document.getElementById("gameSection").style.display = "block";
    rebuildScoreboard();
    currentPlayerIndex = 0;
    updateCurrentPlayerDisplay();
  }
}

// Refresh the scoreboard so we see updated totals
function rebuildScoreboard() {
  const scoreboardDiv = document.getElementById("scoreboard");
  scoreboardDiv.innerHTML = "";

  game.players.forEach(player => {
    const scoreRow = document.createElement("div");
    scoreRow.classList.add("score-row");

    const playerNameDiv = document.createElement("div");
    playerNameDiv.classList.add("player-name");
    playerNameDiv.textContent = player;

    const currentScoreDiv = document.createElement("div");
    currentScoreDiv.classList.add("current-score");
    currentScoreDiv.textContent = game.scores[player];

    scoreRow.appendChild(playerNameDiv);
    scoreRow.appendChild(currentScoreDiv);
    scoreboardDiv.appendChild(scoreRow);
  });
}

// Update the UI to show whose turn it is
function updateCurrentPlayerDisplay() {
  if (game.players.length === 0) return;

  // If we are in redemption, we only cycle among redemptionPlayersLeft
  if (redemptionInProgress) {
    if (redemptionPlayersLeft.length === 0) {
      // everyone has done their shot, finalize
      finalizeRedemptionShots();
      return;
    }

    // If current index is out of range, wrap around
    if (currentPlayerIndex >= redemptionPlayersLeft.length) {
      currentPlayerIndex = 0;
    }
    document.getElementById("currentPlayer").textContent = redemptionPlayersLeft[currentPlayerIndex];
  } else {
    // normal flow
    if (currentPlayerIndex >= game.players.length) {
      currentPlayerIndex = 0;
    }
    document.getElementById("currentPlayer").textContent = game.players[currentPlayerIndex];
  }
}

// Called when the user clicks "Enter Score" for the current player
function submitScore() {
  // If there's already a final winner (and not in redemption), do nothing
  if (game.getWinner() && !redemptionInProgress) {
    setStatusMessage(`Game over. ${game.getWinner()} was the final winner.`);
    return;
  }

  const scoreInputEl = document.getElementById("currentScoreInput");
  const enteredScore = parseInt(scoreInputEl.value, 10) || 0;
  scoreInputEl.value = ""; // clear

  if (redemptionInProgress) {
    // We are in redemption flow
    handleRedemptionShot(enteredScore);
  } else {
    // Normal scoring flow
    const currentPlayerName = game.players[currentPlayerIndex];
    const result = game.recordScore(currentPlayerName, enteredScore);

    if (result === "Bust") {
      setStatusMessage(`${currentPlayerName} busted! Score remains at ${game.scores[currentPlayerName]}.`);
    } else if (result === "Redemption Round Begins") {
      // We have a provisional winner, others get redemption
      setStatusMessage(`${currentPlayerName} reached ${game.targetScore}. Redemption for everyone else!`);
      startRedemption(); // sets redemptionInProgress + redemption players
      rebuildScoreboard();
      return; 
    } else if (result === "Overtime Redemption Round Begins") {
      // Overtime scenario
      setStatusMessage(`${currentPlayerName} reached ${game.targetScore} in Overtime. Redemption for others!`);
      startRedemption();
      rebuildScoreboard();
      return;
    }

    // If there's a final single winner (no redemption triggered), show a message
    if (game.getWinner()) {
      // We do NOT reload. Instead, we finalize only if no tie is possible
      // If there's still a redemption scenario, it wouldn't be triggered by recordScore logic
      setStatusMessage(`Winner: ${game.getWinner()}. Game Over.`);
      rebuildScoreboard();
      return;
    }

    // If no redemption started or bust/win => normal next turn
    rebuildScoreboard();
    currentPlayerIndex++;
    if (currentPlayerIndex >= game.players.length) {
      currentPlayerIndex = 0;
    }
    updateCurrentPlayerDisplay();
  }
}

// Kick off redemption
function startRedemption() {
  redemptionInProgress = true;
  redemptionShots = [];
  redemptionPlayersLeft = [...game.redemptionPlayers];
  currentPlayerIndex = 0;
  updateCurrentPlayerDisplay();
}

// Handle a single redemption shot from the user
function handleRedemptionShot(enteredScore) {
  // If no redemption players left, finalize
  if (redemptionPlayersLeft.length === 0) {
    finalizeRedemptionShots();
    return;
  }

  const current = redemptionPlayersLeft[currentPlayerIndex];
  // We just collect the shot data for now
  redemptionShots.push({ player: current, score: enteredScore });
  setStatusMessage(`${current} attempts redemption with ${enteredScore} points.`);

  // Move to next redemption player
  currentPlayerIndex++;
  if (currentPlayerIndex >= redemptionPlayersLeft.length) {
    // Everyone has done their single redemption shot
    finalizeRedemptionShots();
  } else {
    updateCurrentPlayerDisplay();
  }
}

// Finalize redemption => call processRedemption with all the shots we collected
function finalizeRedemptionShots() {
  const result = game.processRedemption(redemptionShots);
  setStatusMessage(result); 

  // If no tie, result might be "Winner: X"
  // If tie, we move to overtime => game.inOvertime = true, new target, winner reset to null
  // either way, we've finished redemption
  redemptionInProgress = false;
  redemptionShots = [];
  redemptionPlayersLeft = [];
  currentPlayerIndex = 0;

  rebuildScoreboard();

  // Now check if we have an actual final winner or if we are in overtime
  if (!game.inOvertime && game.getWinner()) {
    // no tie => original winner stands
    setStatusMessage(`Final Winner: ${game.getWinner()}. Game Over.`);
  } else if (game.inOvertime) {
    // multiple advanced => next turn continues in overtime with game.players
    setStatusMessage(`Overtime in progress! Target is now ${game.targetScore}.`);
  }

  // Resume normal flow with the new set of players if we are in overtime
  updateCurrentPlayerDisplay();
}

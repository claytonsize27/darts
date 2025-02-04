////////////////////////////////////////////////////////////////////////////////
// DartsGame CLASS (final version with redemption score updates)
////////////////////////////////////////////////////////////////////////////////
class DartsGame {
    constructor() {
        this.players = [];
        this.scores = {};
        this.targetScore = 301;
        this.overtimeIncrement = 100;
        this.inOvertime = false;
        this.winner = null;
        this.redemptionPlayers = [];
    }

    addPlayer(name) {
        if (!this.players.includes(name)) {
            this.players.push(name);
            this.scores[name] = 0;
        }
    }

    recordScore(player, score) {
        if (!this.players.includes(player) || this.winner) {
            return;
        }

        const oldScore = this.scores[player];
        const newScore = oldScore + score;

        // If overshoot => revert
        if (newScore > this.targetScore) {
            this.scores[player] = oldScore;
            return "Bust";
        }
        // If exact match
        else if (newScore === this.targetScore) {
            this.scores[player] = newScore;
            if (!this.inOvertime) {
                // During regulation
                this.winner = player;
                // Everyone else gets redemption
                this.redemptionPlayers = this.players.filter(p => p !== player);
                return "Redemption Round Begins";
            } else {
                // During overtime
                this.redemptionPlayers.push(player);
                return "Overtime Redemption Round Begins";
            }
        }
        // Otherwise just update
        else {
            this.scores[player] = newScore;
        }
    }

    startOvertime() {
        this.inOvertime = true;
        this.targetScore += this.overtimeIncrement;
        this.redemptionPlayers = [];
    }

    getWinner() {
        return this.winner;
    }

    processRedemption(scores) {
        /*
          For each redemption shot:
            1) Add their score to the player's total if it doesn't overshoot.
            2) If exact match => tie the winner => they can advance to overtime.
          If none tie => the original winner stands.
        */
        let advancingPlayers = [];

        for (const { player, score } of scores) {
            // Only process players who are actually in redemption
            if (!this.redemptionPlayers.includes(player)) {
                continue;
            }

            const oldScore = this.scores[player];
            const newScore = oldScore + score;

            // Overshoot => revert
            if (newScore > this.targetScore) {
                this.scores[player] = oldScore;
            } 
            // Exact match => tie
            else if (newScore === this.targetScore) {
                this.scores[player] = newScore;
                advancingPlayers.push(player);
            } 
            // Normal update
            else {
                this.scores[player] = newScore;
            }
        }

        if (advancingPlayers.length === 0) {
            // No new ties => the original winner stands
            return `Winner: ${this.winner}`;
        } else {
            // At least one other player tied the original winner => multiple players advance
            advancingPlayers.push(this.winner);
            this.players = advancingPlayers;
            this.winner = null; // reset, no single winner
            this.startOvertime();
            return `Players advancing to ${this.targetScore}`;
        }
    }
}

////////////////////////////////////////////////////////////////////////////////
// TEST SUITE
////////////////////////////////////////////////////////////////////////////////
(function runTests() {
    console.log("Running Tests...\n");

    ////////////////////////////////////////////////////////////////////////////
    // Test 1: Adding players
    ////////////////////////////////////////////////////////////////////////////
    {
        const game = new DartsGame();
        game.addPlayer("Alice");
        game.addPlayer("Bob");
        game.addPlayer("Charlie");

        const testCondition = JSON.stringify(game.players) === JSON.stringify(["Alice", "Bob", "Charlie"]);
        console.assert(testCondition, "Test 1: Players not added in correct order.");
        console.log("Test 1 Passed?", testCondition);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Test 2: Inputting scores per round
    ////////////////////////////////////////////////////////////////////////////
    {
        const game = new DartsGame();
        game.addPlayer("Alice");
        game.addPlayer("Bob");
        game.addPlayer("Charlie");

        game.recordScore("Alice", 50);
        game.recordScore("Bob", 60);
        game.recordScore("Charlie", 40);

        const testAlice = (game.scores["Alice"] === 50);
        const testBob = (game.scores["Bob"] === 60);
        const testCharlie = (game.scores["Charlie"] === 40);

        console.assert(testAlice, "Test 2 (Alice): Score mismatch.");
        console.assert(testBob, "Test 2 (Bob): Score mismatch.");
        console.assert(testCharlie, "Test 2 (Charlie): Score mismatch.");
        console.log("Test 2 Passed?", testAlice && testBob && testCharlie);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Test 3: Winning the game in regulation (301)
    ////////////////////////////////////////////////////////////////////////////
    {
        const game = new DartsGame();
        game.addPlayer("Alice");
        game.addPlayer("Bob");
        game.addPlayer("Charlie");

        // Setup
        game.scores["Alice"] = 250;
        game.scores["Bob"] = 100;
        game.scores["Charlie"] = 100;

        // Execution: Alice hits 301
        const result = game.recordScore("Alice", 51);

        const testAliceScore = (game.scores["Alice"] === 301);
        const testRedemptionBegins = (result === "Redemption Round Begins");
        const testWinnerIsAlice = (game.winner === "Alice");
        const testRedemptionPlayers = (JSON.stringify(game.redemptionPlayers) === JSON.stringify(["Bob", "Charlie"]));

        console.assert(testAliceScore, "Test 3: Alice not at 301.");
        console.assert(testRedemptionBegins, "Test 3: Should indicate redemption round.");
        console.assert(testWinnerIsAlice, "Test 3: Winner should be Alice.");
        console.assert(testRedemptionPlayers, "Test 3: Redemption players not set correctly.");

        console.log("Test 3 Passed?", testAliceScore && testRedemptionBegins && testWinnerIsAlice && testRedemptionPlayers);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Test 4: Redemption round failure
    ////////////////////////////////////////////////////////////////////////////
    {
        const game = new DartsGame();
        game.addPlayer("Alice");
        game.addPlayer("Bob");
        game.addPlayer("Charlie");

        game.scores["Alice"] = 250;
        game.scores["Bob"] = 100;
        game.scores["Charlie"] = 100;

        // Alice hits 301
        game.recordScore("Alice", 51);

        // Bob and Charlie both fail
        const redemptionScores = [
            { player: "Bob", score: 199 },    // total 299
            { player: "Charlie", score: 180 } // total 280
        ];
        const redemptionResult = game.processRedemption(redemptionScores);

        const testWinner = (redemptionResult === "Winner: Alice");
        console.assert(testWinner, "Test 4: Should declare Alice winner after failed redemption.");
        console.log("Test 4 Passed?", testWinner);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Test 5: Redemption success leading to overtime (Bob ties Alice)
    ////////////////////////////////////////////////////////////////////////////
    {
        const game = new DartsGame();
        game.addPlayer("Alice");
        game.addPlayer("Bob");
        game.addPlayer("Charlie");

        // Alice 250, Bob 200, Charlie 280
        game.scores["Alice"] = 250;
        game.scores["Bob"] = 200;
        game.scores["Charlie"] = 280;

        // Alice hits 301
        game.recordScore("Alice", 51);

        // Bob also hits 301, Charlie doesn't
        const redemptionScores2 = [
            { player: "Bob", score: 101 },    // 301
            { player: "Charlie", score: 20 }  // 300
        ];
        const overtimeResult = game.processRedemption(redemptionScores2);

        const testOvertimeMsg = (overtimeResult === "Players advancing to 401");
        const testPlayersNow = JSON.stringify(game.players) === JSON.stringify(["Bob", "Alice"]);
        const testTargetScore = (game.targetScore === 401);
        const testNoWinnerYet = (game.getWinner() === null);

        console.assert(testOvertimeMsg, "Test 5: Should indicate next overtime round.");
        console.assert(testPlayersNow, "Test 5: Should only have Bob and Alice in players.");
        console.assert(testTargetScore, "Test 5: Should now be playing to 401.");
        console.assert(testNoWinnerYet, "Test 5: Should reset winner to null in a tie scenario.");

        console.log("Test 5 Passed?", testOvertimeMsg && testPlayersNow && testTargetScore && testNoWinnerYet);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Test 6: Single Player Edge Case
    ////////////////////////////////////////////////////////////////////////////
    {
        const game = new DartsGame();
        game.addPlayer("SoloPlayer");

        const result = game.recordScore("SoloPlayer", 50);
        const testNoWinner = (game.getWinner() === null);
        console.assert(testNoWinner, "Test 6: Single player shouldn't produce a winner in normal flow.");
        console.log("Test 6 Passed?", testNoWinner);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Test 7: Overshooting the Target => 'Bust'
    ////////////////////////////////////////////////////////////////////////////
    {
        const game = new DartsGame();
        game.addPlayer("Alice");
        game.addPlayer("Bob");

        // Suppose Alice is at 300, target is 301
        game.scores["Alice"] = 300;

        // She attempts to add 10 => overshoot => revert to 300
        const result = game.recordScore("Alice", 10);
        const testBustMessage = (result === "Bust");
        const testBustScore = (game.scores["Alice"] === 300);
        const testNoWinnerYet = (game.getWinner() === null);

        console.assert(testBustMessage, "Test 7: Should return 'Bust' on overshoot.");
        console.assert(testBustScore, "Test 7: Score should revert to 300 after overshoot.");
        console.assert(testNoWinnerYet, "Test 7: No winner declared on bust.");

        console.log("Test 7 Passed?", testBustMessage && testBustScore && testNoWinnerYet);
    }

// Test 8: Multiple Overtimes
{
    const game = new DartsGame();
    // Setup players: Alice and Bob
    game.addPlayer("Alice");
    game.addPlayer("Bob");

    // Bring them close to 301
    game.scores["Alice"] = 300; 
    game.scores["Bob"] = 300;   

    // Suppose Alice hits 1 => 301 => winner = Alice
    game.recordScore("Alice", 1);

    // Bob tries redemption => also hits 1 => tie
    const redemptionScores = [ { player: "Bob", score: 1 } ];
    game.processRedemption(redemptionScores);
    // Now target = 401

    // Suppose they both get to 400 => 1 away
    game.scores["Alice"] = 400;
    game.scores["Bob"] = 400;

    // Alice hits 1 => 401 => potential winner
    game.recordScore("Alice", 1);

    // Bob tries redemption => also hits 1 => tie again
    const redemptionScores2 = [ { player: "Bob", score: 1 } ];
    game.processRedemption(redemptionScores2);
    // Now target = 501

    const testTarget501 = (game.targetScore === 501);
    console.assert(testTarget501, "Test 8: Should be at 501 after second tie.");

    console.log("Test 8 Passed?", testTarget501);
}


    ////////////////////////////////////////////////////////////////////////////
    // Test 9: Large Number of Players & Multi-Way Tie
    ////////////////////////////////////////////////////////////////////////////
    {
        const game = new DartsGame();
        // Add 5 players
        game.addPlayer("Alice");
        game.addPlayer("Bob");
        game.addPlayer("Charlie");
        game.addPlayer("Dave");
        game.addPlayer("Eve");

        // Dave hits 301 first
        game.scores["Alice"] = 100;
        game.scores["Bob"] = 150;
        game.scores["Charlie"] = 250;
        game.scores["Dave"] = 300;
        game.scores["Eve"] = 200;

        game.recordScore("Dave", 1); // Dave => 301
        // Everyone else tries redemption
        const redemptionScores = [
            { player: "Alice", score: 201 },   // 301
            { player: "Bob", score: 151 },     // 301
            { player: "Charlie", score: 51 },  // 301
            { player: "Eve", score: 100 }      // 300
        ];

        const redemptionResult = game.processRedemption(redemptionScores);
        const newPlayers = game.players;
        const testPlayers = JSON.stringify(newPlayers.sort()) === JSON.stringify(["Alice","Bob","Charlie","Dave"].sort());
        const testTargetScore = (game.targetScore === 401);
        const testNullWinner = (game.getWinner() === null);

        console.assert(
            (redemptionResult === "Players advancing to 401"),
            "Test 9: Should indicate multiple players going to 401."
        );
        console.assert(testPlayers, "Test 9: Should have Alice, Bob, Charlie, Dave in next round.");
        console.assert(testTargetScore, "Test 9: Target should be 401 now.");
        console.assert(testNullWinner, "Test 9: Winner should be reset to null with multiple ties.");

        console.log("Test 9 Passed?",
            (redemptionResult === "Players advancing to 401") && testPlayers && testTargetScore && testNullWinner
        );
    }

    ////////////////////////////////////////////////////////////////////////////
    // Test 10: Single-turn approach (UI simulation stub)
    ////////////////////////////////////////////////////////////////////////////
    {
        const game = new DartsGame();
        game.addPlayer("Alice");
        game.addPlayer("Bob");

        // Suppose we simulate turn-based scoring
        let currentPlayerIndex = 0;

        function simulateOneTurn(score) {
            const player = game.players[currentPlayerIndex];
            game.recordScore(player, score);
            currentPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
        }

        // Start both at 0. Let's do 2 'rounds' in a single-turn style:
        simulateOneTurn(50);  // Alice
        simulateOneTurn(40);  // Bob
        simulateOneTurn(25);  // Alice
        simulateOneTurn(60);  // Bob

        const testAliceScore = (game.scores["Alice"] === 75); // 50 + 25
        const testBobScore = (game.scores["Bob"] === 100);    // 40 + 60

        console.assert(testAliceScore, "Test 10 (Alice) turn-based mismatch.");
        console.assert(testBobScore, "Test 10 (Bob) turn-based mismatch.");
        console.log("Test 10 Passed?", testAliceScore && testBobScore);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Test 11: Redemption scenario from user bug:
    // Player A (200) hits 301 => redemption. B fails, C ties => leads to OT
    ////////////////////////////////////////////////////////////////////////////
    {
        const game = new DartsGame();
        game.addPlayer("A");
        game.addPlayer("B");
        game.addPlayer("C");

        // Setup
        game.scores["A"] = 200;
        game.scores["B"] = 250;
        game.scores["C"] = 250;

        // A hits 301
        const resultA = game.recordScore("A", 101); 
        console.assert(resultA === "Redemption Round Begins", "Test 11: A should trigger redemption.");
        console.assert(game.winner === "A", "Test 11: A is initial winner pre-redemption.");
        console.assert(JSON.stringify(game.redemptionPlayers.sort()) === JSON.stringify(["B", "C"].sort()), "Test 11: B, C in redemptionPlayers.");

        // B fails, C ties
        const redemptionScores = [
          { player: "B", score: 10 },  // B => 260
          { player: "C", score: 51 }   // C => 301
        ];

        const redemptionResult = game.processRedemption(redemptionScores);
        console.assert(redemptionResult === "Players advancing to 401", "Test 11: Should go to OT with A, C.");
        console.assert(game.getWinner() === null, "Test 11: Winner reset to null after tie in redemption.");
        console.assert(game.inOvertime, "Test 11: Should be in overtime now.");
        console.assert(game.targetScore === 401, "Test 11: Target should be 401 in OT.");
        console.assert(JSON.stringify(game.players.sort()) === JSON.stringify(["A", "C"].sort()), "Test 11: Only A, C remain in the game.");

        console.log("Test 11 Passed?", 
          redemptionResult === "Players advancing to 401" &&
          game.getWinner() === null &&
          game.inOvertime &&
          game.targetScore === 401 &&
          JSON.stringify(game.players.sort()) === JSON.stringify(["A","C"].sort())
        );
    }

    ////////////////////////////////////////////////////////////////////////////
    // Test 12: Redemption scores are properly ADDED to totals
    // Tests the fix to ensure redemption increments the player's total
    ////////////////////////////////////////////////////////////////////////////
    {
        const game = new DartsGame();
        game.addPlayer("A");
        game.addPlayer("B");
        // A hits 301 from 200 => redemption for B
        game.scores["A"] = 200;
        game.scores["B"] = 200;

        const resultA = game.recordScore("A", 101); // A => 301
        console.assert(resultA === "Redemption Round Begins", "Test 12: Should enter redemption for B");
        console.assert(game.getWinner() === "A", "Test 12: A is winner pending redemption");
        console.assert(JSON.stringify(game.redemptionPlayers) === JSON.stringify(["B"]), "Test 12: B is redemption player");

        // Suppose B tries redemption with two attempts in one pass
        // (An overshoot then a valid tie).
        const redemptionScores = [
            { player: "B", score: 105 }, // overshoot => revert to 200
            { player: "B", score: 101 } // exactly 301 => tie
        ];
        const redemptionResult = game.processRedemption(redemptionScores);

        console.assert(redemptionResult === "Players advancing to 401", "Test 12: Should move to OT if B eventually ties");
        console.assert(game.scores["B"] === 301, "Test 12: B should end up at 301 after redemption");
        console.assert(game.scores["A"] === 301, "Test 12: A remains at 301");
        console.assert(game.inOvertime, "Test 12: Overtime triggered");
        console.assert(game.targetScore === 401, "Test 12: New target is 401");
        console.assert(game.getWinner() === null, "Test 12: No single final winner after tie");
        console.assert(JSON.stringify(game.players.sort()) === JSON.stringify(["A","B"].sort()), "Test 12: A and B remain");

        console.log("Test 12 Passed?", 
          redemptionResult === "Players advancing to 401" &&
          game.scores["B"] === 301 &&
          game.scores["A"] === 301 &&
          game.inOvertime &&
          game.targetScore === 401 &&
          game.getWinner() === null &&
          JSON.stringify(game.players.sort()) === JSON.stringify(["A","B"].sort())
        );
    }

    console.log("\nAll tests completed.");
})();

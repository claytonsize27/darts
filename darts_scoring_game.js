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
        // If the player doesn't exist or a final winner is already set, do nothing
        if (!this.players.includes(player) || this.winner) {
            return;
        }

        const oldScore = this.scores[player];
        const newScore = oldScore + score;

        // Overshoot => revert
        if (newScore > this.targetScore) {
            this.scores[player] = oldScore;
            return "Bust";
        }
        // Exact match
        else if (newScore === this.targetScore) {
            this.scores[player] = newScore;

            // REGULATION scenario
            if (!this.inOvertime) {
                // This player becomes the provisional winner
                this.winner = player;
                // The rest get one redemption shot
                this.redemptionPlayers = this.players.filter(p => p !== player);
                return "Redemption Round Begins";
            } 
            // OVERTIME scenario
            else {
                // The player who hits target is the provisional winner
                // Everyone else in the game gets redemption
                this.winner = player;
                this.redemptionPlayers = this.players.filter(p => p !== player);
                return "Overtime Redemption Round Begins";
            }
        }
        // Otherwise, just update the score
        else {
            this.scores[player] = newScore;
        }
    }

    startOvertime() {
        this.inOvertime = true;
        this.targetScore += this.overtimeIncrement;  // e.g. 301->401->501
        this.redemptionPlayers = [];
    }

    getWinner() {
        return this.winner;
    }

    processRedemption(scores) {
        /*
          For each redemption shot among this.redemptionPlayers:
            - If overshoot, revert to oldScore.
            - If exact match => tie => they can advance to next overtime.
          If none tie => the existing winner stands.
        */
        let advancingPlayers = [];

        for (const { player, score } of scores) {
            // Only process players who are actually in redemption
            if (!this.redemptionPlayers.includes(player)) {
                continue;
            }

            const oldScore = this.scores[player];
            const newScore = oldScore + score;

            if (newScore > this.targetScore) {
                // Overshoot => revert
                this.scores[player] = oldScore;
            } 
            else if (newScore === this.targetScore) {
                // Ties the winner
                this.scores[player] = newScore;
                advancingPlayers.push(player);
            } 
            else {
                // Normal update
                this.scores[player] = newScore;
            }
        }

        if (advancingPlayers.length === 0) {
            // No tie => existing winner stands
            return `Winner: ${this.winner}`;
        } else {
            // Multiple players (including the original winner) advance
            advancingPlayers.push(this.winner);
            this.players = advancingPlayers;
            // No single winner once there's a tie
            this.winner = null;
            this.startOvertime();
            return `Players advancing to ${this.targetScore}`;
        }
    }
}

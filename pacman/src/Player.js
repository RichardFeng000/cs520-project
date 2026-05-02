//////////////////////////////////////////////////////////////////////////////////////
// Player is the controllable character (Pac-Man)

// Player constructor
var Player = function() {

    // inherit data from Actor
    Actor.apply(this);
    if (gameMode == GAME_MSPACMAN || gameMode == GAME_COOKIE) {
        this.frames = 1; // start with mouth open
    }

    this.nextDir = {};
    this.lastMeal = { x:-1, y:-1 };

    // determines if this player should be AI controlled
    this.ai = false;
    this.aiMode = AI_STRATEGY_ASTAR;
    this.invincible = false;

    this.savedNextDirEnum = {};
    this.savedStopped = {};
    this.savedEatPauseFramesLeft = {};
    this.savedAiMode = {};
};

// inherit functions from Actor
Player.prototype = newChildObject(Actor.prototype);

Player.prototype.save = function(t) {
    this.savedEatPauseFramesLeft[t] = this.eatPauseFramesLeft;
    this.savedNextDirEnum[t] = this.nextDirEnum;
    this.savedStopped[t] = this.stopped;
    this.savedAiMode[t] = this.aiMode;

    Actor.prototype.save.call(this,t);
};

Player.prototype.load = function(t) {
    this.eatPauseFramesLeft = this.savedEatPauseFramesLeft[t];
    this.setNextDir(this.savedNextDirEnum[t]);
    this.stopped = this.savedStopped[t];
    this.setAiMode(this.savedAiMode[t]);

    Actor.prototype.load.call(this,t);
};

// reset the state of the player on new level or level restart
Player.prototype.reset = function() {

    this.setNextDir(this.startDirEnum);
    this.stopped = !this.ai;
    this.inputDirEnum = undefined;

    this.eatPauseFramesLeft = 0;   // current # of frames left to pause after eating

    // call Actor's reset function to reset to initial position and direction
    Actor.prototype.reset.apply(this);

};

// sets the next direction and updates its dependent variables
Player.prototype.setNextDir = function(nextDirEnum) {
    setDirFromEnum(this.nextDir, nextDirEnum);
    this.nextDirEnum = nextDirEnum;
};

Player.prototype.setAiMode = function(aiMode) {
    if (AI_STRATEGY_ORDER.indexOf(aiMode) < 0) {
        aiMode = AI_STRATEGY_ASTAR;
    }
    if (aiMode != this.aiMode) {
        this._astarPlan = undefined;
        this._astarTarget = undefined;
    }
    this.aiMode = aiMode;
};

Player.prototype.enableAiControl = function(aiMode) {
    var openTiles;
    var chosenDir;

    this.ai = true;
    this.setAiMode(aiMode);
    this.clearInputDir();
    this.stopped = false;

    if (map && this.distToMid.x == 0 && this.distToMid.y == 0) {
        openTiles = getOpenTiles(this.tile, this.dirEnum);
        chosenDir = this.chooseAiDir(openTiles);
        this.setDir(chosenDir);
        this.setNextDir(chosenDir);
    }
};

Player.prototype.disableAiControl = function() {
    this.ai = false;
    this.clearInputDir();
    this.stopped = true;
    this.targetting = undefined;
};

Player.prototype.cycleAiMode = function() {
    var i;
    for (i=0; i<AI_STRATEGY_ORDER.length; i++) {
        if (AI_STRATEGY_ORDER[i] == this.aiMode) {
            this.setAiMode(AI_STRATEGY_ORDER[(i+1)%AI_STRATEGY_ORDER.length]);
            return this.aiMode;
        }
    }
    this.setAiMode(AI_STRATEGY_ASTAR);
    return this.aiMode;
};

Player.prototype.getAiModeLabel = function() {
    return getAiStrategyLabel(this.aiMode);
};

var AI_COLLECTIBLE_SEARCH_LIMIT = 40;
var AI_RL_ROLLOUT_DEPTH = 6;
var AI_RL_DISCOUNT = 0.82;
var AI_RL_STATE_MAX_DANGER = 6;
var AI_RL_STATE_MAX_PATH = 8;
var AI_RL_STATE_NO_FRUIT = 9;

var getAiTileKey = function(tile) {
    return tile.x + "," + tile.y;
};

var getAiTileInDir = function(tile, dirEnum) {
    var dir = {};
    setDirFromEnum(dir, dirEnum);
    return {
        x: tile.x + dir.x,
        y: tile.y + dir.y,
    };
};

var copyAiConsumed = function(consumed) {
    var clone = {};
    var key;
    for (key in consumed) {
        if (consumed.hasOwnProperty(key)) {
            clone[key] = consumed[key];
        }
    }
    return clone;
};

var getAiTileChar = function(tile, consumed) {
    var key = getAiTileKey(tile);
    if (consumed && consumed[key]) {
        return ' ';
    }
    return map.getTile(tile.x, tile.y);
};

var getAiActionLabel = function(dirEnum) {
    if (dirEnum == DIR_UP) return "UP";
    if (dirEnum == DIR_LEFT) return "LEFT";
    if (dirEnum == DIR_DOWN) return "DOWN";
    return "RIGHT";
};

var getAiDistanceBucket = function(distance, maxBucket) {
    if (distance == Infinity) {
        return maxBucket;
    }
    return Math.min(maxBucket, Math.max(0, Math.floor(distance)));
};

var getAiOpenCount = function(tile) {
    var count = 0;
    if (map.isFloorTile(tile.x, tile.y-1)) count++;
    if (map.isFloorTile(tile.x+1, tile.y)) count++;
    if (map.isFloorTile(tile.x, tile.y+1)) count++;
    if (map.isFloorTile(tile.x-1, tile.y)) count++;
    return count;
};

var getAiCorridorDepth = function(tile, dirEnum, limit) {
    var depth = 0;
    var currentTile = { x: tile.x, y: tile.y };
    var currentDir = dirEnum;
    var openTiles;
    var onlyTurn;
    while (depth < limit) {
        openTiles = getOpenTiles(currentTile, currentDir);
        onlyTurn = undefined;
        for (var i=0; i<4; i++) {
            if (openTiles[i]) {
                if (onlyTurn != undefined) {
                    return depth;
                }
                onlyTurn = i;
            }
        }
        if (onlyTurn == undefined) {
            return depth;
        }
        currentDir = onlyTurn;
        currentTile = getAiTileInDir(currentTile, currentDir);
        depth++;
    }
    return depth;
};

var getAiThreatMetrics = function(tile, futureSteps) {
    var nearest = Infinity;
    var pressure = 0;
    var i;
    var g;
    var dist;
    var sameLane;
    for (i=0; i<4; i++) {
        g = ghosts[i];
        if (g.mode != GHOST_OUTSIDE || g.scared) {
            continue;
        }
        dist = Math.abs(tile.x - g.tile.x) + Math.abs(tile.y - g.tile.y);
        sameLane = (tile.x == g.tile.x || tile.y == g.tile.y);
        if (sameLane) {
            dist -= 0.5;
        }
        dist -= futureSteps*0.6;
        if (dist < nearest) {
            nearest = dist;
        }
        pressure += 1 / Math.max(1, dist + 1);
    }
    return {
        nearest: nearest,
        pressure: pressure,
    };
};

var getAiNearestGhostDistance = function(tile, wantScared) {
    var nearest = Infinity;
    var i;
    var g;
    var dist;
    for (i=0; i<4; i++) {
        g = ghosts[i];
        if (g.mode != GHOST_OUTSIDE || g.scared != wantScared) {
            continue;
        }
        dist = Math.abs(tile.x - g.tile.x) + Math.abs(tile.y - g.tile.y);
        if (dist < nearest) {
            nearest = dist;
        }
    }
    return nearest;
};

var getAiNearestCollectibleDistance = function(startTile, consumed, targetChar) {
    var queue = [{
        x: startTile.x,
        y: startTile.y,
        dist: 0,
    }];
    var visited = {};
    var head = 0;
    var current;
    var key;
    var nextTile;
    var i;
    while (head < queue.length) {
        current = queue[head++];
        key = getAiTileKey(current);
        if (visited[key]) {
            continue;
        }
        visited[key] = true;
        if (current.dist > AI_COLLECTIBLE_SEARCH_LIMIT) {
            continue;
        }
        if (current.dist > 0) {
            if (targetChar) {
                if (getAiTileChar(current, consumed) == targetChar) {
                    return current.dist;
                }
            }
            else if (getAiTileChar(current, consumed) == '.' || getAiTileChar(current, consumed) == 'o') {
                return current.dist;
            }
        }
        for (i=0; i<4; i++) {
            nextTile = getAiTileInDir(current, i);
            if (map.isFloorTile(nextTile.x, nextTile.y) && !visited[getAiTileKey(nextTile)]) {
                queue.push({
                    x: nextTile.x,
                    y: nextTile.y,
                    dist: current.dist + 1,
                });
            }
        }
    }
    return Infinity;
};

var getAiDistanceToTile = function(startTile, targetTile) {
    var queue = [{
        x: startTile.x,
        y: startTile.y,
        dist: 0,
    }];
    var visited = {};
    var head = 0;
    var current;
    var key;
    var nextTile;
    var i;
    while (head < queue.length) {
        current = queue[head++];
        key = getAiTileKey(current);
        if (visited[key]) {
            continue;
        }
        visited[key] = true;
        if (current.x == targetTile.x && current.y == targetTile.y) {
            return current.dist;
        }
        if (current.dist > AI_COLLECTIBLE_SEARCH_LIMIT) {
            continue;
        }
        for (i=0; i<4; i++) {
            nextTile = getAiTileInDir(current, i);
            if (map.isFloorTile(nextTile.x, nextTile.y) && !visited[getAiTileKey(nextTile)]) {
                queue.push({
                    x: nextTile.x,
                    y: nextTile.y,
                    dist: current.dist + 1,
                });
            }
        }
    }
    return Infinity;
};

Player.prototype.getRlPhaseBucket = function() {
    var dotsLeft = map.dotsLeft();
    if (map.dotsEaten < 70) {
        return 0;
    }
    if (map.dotsEaten < 170) {
        return 1;
    }
    if (dotsLeft > 20) {
        return 2;
    }
    return 3;
};

Player.prototype.getRlFruitBucket = function() {
    var fruitTile;
    if (!fruit.isPresent()) {
        return AI_RL_STATE_NO_FRUIT;
    }
    fruitTile = {
        x: Math.floor(fruit.pixel.x / tileSize),
        y: Math.floor(fruit.pixel.y / tileSize),
    };
    return getAiDistanceBucket(getAiDistanceToTile(this.tile, fruitTile), AI_RL_STATE_MAX_PATH);
};

Player.prototype.getRlStateKey = function() {
    var threat = getAiThreatMetrics(this.tile, 0).nearest;
    var edible = getAiNearestGhostDistance(this.tile, true);
    var pellet = getAiNearestCollectibleDistance(this.tile, {}, undefined);
    var energizerDist = getAiNearestCollectibleDistance(this.tile, {}, 'o');
    var openCount = getAiOpenCount(this.tile);
    var corridorDepth = getAiCorridorDepth(this.tile, this.dirEnum, 6);
    var scaredBucket = Math.min(5, Math.floor(energizer.getRemainingFrames()/60));

    return [
        this.dirEnum,
        getAiDistanceBucket(threat, AI_RL_STATE_MAX_DANGER),
        getAiDistanceBucket(edible, AI_RL_STATE_MAX_DANGER),
        getAiDistanceBucket(pellet, AI_RL_STATE_MAX_PATH),
        getAiDistanceBucket(energizerDist, AI_RL_STATE_MAX_PATH),
        this.getRlFruitBucket(),
        scaredBucket,
        openCount,
        Math.min(3, corridorDepth),
        this.getRlPhaseBucket(),
    ].join("|");
};

Player.prototype.chooseRlModelDir = function(openTiles) {
    var stateKey;
    var bestDir;
    var bestScore = -Infinity;
    var score;
    var value;
    var i;

    if (!hasExternalRlModel()) {
        return undefined;
    }

    stateKey = this.getRlStateKey();
    for (i=0; i<4; i++) {
        if (!openTiles[i]) {
            continue;
        }
        value = getExternalRlModelValue(stateKey, getAiActionLabel(i));
        score = (value != undefined ? value : -Infinity);
        if (score == -Infinity) {
            continue;
        }
        score += this.evaluateRlMove(this.tile, i, 2, {}, 0) * 0.01;
        if (score > bestScore) {
            bestScore = score;
            bestDir = i;
        }
    }

    return bestDir;
};

Player.prototype.getTraditionalMoveScore = function(dirEnum) {
    var nextTile = getAiTileInDir(this.tile, dirEnum);
    var tileChar = map.getTile(nextTile.x, nextTile.y);
    var threat = getAiThreatMetrics(nextTile, 1);
    var collectibleDist = getAiNearestCollectibleDistance(nextTile, {}, undefined);
    var energizerDist = getAiNearestCollectibleDistance(nextTile, {}, 'o');
    var edibleGhostDist = getAiNearestGhostDistance(nextTile, true);
    var corridorDepth = getAiCorridorDepth(nextTile, dirEnum, 6);
    var openCount = getAiOpenCount(nextTile);
    var score = 0;

    if (threat.nearest <= 0.5) score -= 8000;
    else if (threat.nearest <= 1.5) score -= 2600;
    else if (threat.nearest <= 2.5) score -= 900;

    score += Math.min(threat.nearest, 8) * 28;
    score -= threat.pressure * 160;

    if (tileChar == '.') score += 75;
    else if (tileChar == 'o') score += threat.nearest < 5 ? 180 : 110;

    if (collectibleDist < Infinity) score += Math.max(0, 40 - collectibleDist*5);
    if (energizerDist < Infinity && threat.nearest < 6) score += Math.max(0, 30 - energizerDist*4);
    if (edibleGhostDist < Infinity) score += Math.max(0, 24 - edibleGhostDist*5);

    if (openCount >= 3) score += 18;
    if (openCount <= 1 && threat.nearest < 6) score -= 260;
    if (corridorDepth >= 3 && threat.nearest < 4) score -= corridorDepth * 70;
    if (dirEnum == this.dirEnum) score += 8;

    return score;
};

Player.prototype.getRlLeafValue = function(tile, dirEnum, consumed, depthUsed) {
    var threat = getAiThreatMetrics(tile, depthUsed);
    var collectibleDist = getAiNearestCollectibleDistance(tile, consumed, undefined);
    var edibleGhostDist = getAiNearestGhostDistance(tile, true);
    var openCount = getAiOpenCount(tile);
    var value = 0;

    if (threat.nearest <= 0.5) {
        return -6000;
    }
    value += Math.min(threat.nearest, 10) * 12;
    value -= threat.pressure * 75;
    if (collectibleDist < Infinity) value += Math.max(0, 28 - collectibleDist*3);
    if (edibleGhostDist < Infinity) value += Math.max(0, 18 - edibleGhostDist*3);
    if (openCount >= 3) value += 10;
    if (openCount <= 1 && threat.nearest < 5) value -= 120;
    if (dirEnum == this.dirEnum) value += 3;

    return value;
};

Player.prototype.evaluateRlMove = function(tile, dirEnum, depth, consumed, depthUsed) {
    var nextTile = getAiTileInDir(tile, dirEnum);
    var tileKey = getAiTileKey(nextTile);
    var tileChar = getAiTileChar(nextTile, consumed);
    var nextConsumed = consumed;
    var threat = getAiThreatMetrics(nextTile, depthUsed + 1);
    var openCount = getAiOpenCount(nextTile);
    var reward = 3;
    var nextOpenTiles;
    var bestFuture = -Infinity;
    var i;

    if (threat.nearest <= 0.5) {
        return -9000;
    }

    if (tileChar == '.') reward += 24;
    else if (tileChar == 'o') reward += threat.nearest < 5 ? 75 : 45;

    if (tileChar == '.' || tileChar == 'o') {
        nextConsumed = copyAiConsumed(consumed);
        nextConsumed[tileKey] = true;
    }

    reward += Math.min(threat.nearest, 8) * 8;
    reward -= threat.pressure * 60;
    if (openCount >= 3) reward += 7;
    if (openCount <= 1 && threat.nearest < 5) reward -= 90;

    var scaredGhostDist = getAiNearestGhostDistance(nextTile, true);
    if (scaredGhostDist < Infinity) {
        reward += Math.max(0, 14 - scaredGhostDist*2);
    }

    if (depth <= 1) {
        return reward + this.getRlLeafValue(nextTile, dirEnum, nextConsumed, depthUsed + 1);
    }

    nextOpenTiles = getOpenTiles(nextTile, dirEnum);
    for (i=0; i<4; i++) {
        if (nextOpenTiles[i]) {
            bestFuture = Math.max(
                bestFuture,
                this.evaluateRlMove(nextTile, i, depth - 1, nextConsumed, depthUsed + 1)
            );
        }
    }

    if (bestFuture == -Infinity) {
        bestFuture = this.getRlLeafValue(nextTile, dirEnum, nextConsumed, depthUsed + 1);
    }

    return reward + AI_RL_DISCOUNT * bestFuture;
};

Player.prototype.chooseAiDir = function(openTiles) {
    var bestDir = this.dirEnum;
    var bestScore = -Infinity;
    var modelDir;
    var score;
    var i;
    if (this.aiMode == AI_STRATEGY_ASTAR) {
        this.targetting = this.aiMode;
        return chooseAstarStaticDir(this, openTiles);
    }
    if (this.aiMode == AI_STRATEGY_REPLAN) {
        this.targetting = this.aiMode;
        return chooseAstarReplanDir(this, openTiles);
    }
    if (this.aiMode == AI_STRATEGY_RISK) {
        this.targetting = this.aiMode;
        return chooseAstarRiskDir(this, openTiles);
    }
    if (this.aiMode == AI_STRATEGY_RL) {
        modelDir = this.chooseRlModelDir(openTiles);
        if (modelDir != undefined) {
            this.targetting = this.aiMode;
            this.targetTile = getAiTileInDir(this.tile, modelDir);
            return modelDir;
        }
        // Q-table miss: fall back to the RL rollout evaluator.
        for (i=0; i<4; i++) {
            if (!openTiles[i]) {
                continue;
            }
            score = this.evaluateRlMove(this.tile, i, AI_RL_ROLLOUT_DEPTH, {}, 0);
            if (score > bestScore) {
                bestScore = score;
                bestDir = i;
            }
        }
        this.targetting = this.aiMode;
        this.targetTile = getAiTileInDir(this.tile, bestDir);
        return bestDir;
    }
    // Unrecognized aiMode safety net.
    this.targetting = this.aiMode;
    return chooseAstarFallbackDir(this, openTiles);
};

// gets the number of steps to move in this frame
Player.prototype.getNumSteps = function() {
    if (turboMode)
        return 2;

    var pattern = energizer.isActive() ? STEP_PACMAN_FRIGHT : STEP_PACMAN;
    return this.getStepSizeFromTable(level, pattern);
};

Player.prototype.getStepFrame = function(steps) {
    if (steps == undefined) {
        steps = this.steps;
    }
    return Math.floor(steps/2)%4;
};

Player.prototype.getAnimFrame = function(frame) {
    if (frame == undefined) {
        frame = this.getStepFrame();
    }
    if (gameMode == GAME_MSPACMAN || gameMode == GAME_COOKIE) { // ms. pacman starts with mouth open
        frame = (frame+1)%4;
        if (state == deadState)
            frame = 1; // hack to force this frame when dead
    }
    if (gameMode != GAME_OTTO) {
        if (frame == 3) 
            frame = 1;
    }
    return frame;
};

Player.prototype.setInputDir = function(dirEnum) {
    this.inputDirEnum = dirEnum;
};

Player.prototype.clearInputDir = function(dirEnum) {
    if (dirEnum == undefined || this.inputDirEnum == dirEnum) {
        this.inputDirEnum = undefined;
    }
};

// move forward one step
Player.prototype.step = (function(){

    // return sign of a number
    var sign = function(x) {
        if (x<0) return -1;
        if (x>0) return 1;
        return 0;
    };

    return function() {

        // just increment if we're not in a map
        if (!map) {
            this.setPos(this.pixel.x+this.dir.x, this.pixel.y+this.dir.y);
            return 1;
        }

        // identify the axes of motion
        var a = (this.dir.x != 0) ? 'x' : 'y'; // axis of motion
        var b = (this.dir.x != 0) ? 'y' : 'x'; // axis perpendicular to motion

        // Don't proceed past the middle of a tile if facing a wall
        this.stopped = this.stopped || (this.distToMid[a] == 0 && !isNextTileFloor(this.tile, this.dir));
        if (!this.stopped) {
            // Move in the direction of travel.
            this.pixel[a] += this.dir[a];

            // Drift toward the center of the track (a.k.a. cornering)
            this.pixel[b] += sign(this.distToMid[b]);
        }


        this.commitPos();
        return this.stopped ? 0 : 1;
    };
})();

// determine direction
Player.prototype.steer = function() {

    // if AI-controlled, only turn at mid-tile
    if (this.ai) {
        this.clearInputDir();
        if (this.distToMid.x != 0 || this.distToMid.y != 0)
            return;

        var chosenDir;
        var openTiles = getOpenTiles(this.tile, this.dirEnum);
        chosenDir = this.chooseAiDir(openTiles);
        this.setDir(chosenDir);
        this.setNextDir(chosenDir);
        this.stopped = false;
    }
    else {
        this.targetting = undefined;
        if (this.inputDirEnum == undefined) {
            if (this.stopped) {
                this.setDir(this.nextDirEnum);
            }
        }
        else {
            // Determine if input direction is open.
            var inputDir = {};
            setDirFromEnum(inputDir, this.inputDirEnum);
            var inputDirOpen = isNextTileFloor(this.tile, inputDir);

            if (inputDirOpen) {
                this.setDir(this.inputDirEnum);
                this.setNextDir(this.inputDirEnum);
                this.stopped = false;
            }
            else {
                if (!this.stopped) {
                    this.setNextDir(this.inputDirEnum);
                }
            }
        }
    }
    if (this.stopped) {
        audio.eating.stopLoop(true);
    }
};


// update this frame
Player.prototype.update = function(j) {

    var numSteps = this.getNumSteps();
    if (j >= numSteps)
        return;

    // skip frames
    if (this.eatPauseFramesLeft > 0) {
        if (j == numSteps-1)
            this.eatPauseFramesLeft--;
        return;
    }

    // call super function to update position and direction
    Actor.prototype.update.call(this,j);

    // eat something
    if (map) {
        var t = map.getTile(this.tile.x, this.tile.y);
        if (t == '.' || t == 'o') {
            this.lastMeal.x = this.tile.x;
            this.lastMeal.y = this.tile.y
            // apply eating drag (unless in turbo mode)
            if (!turboMode) {
                this.eatPauseFramesLeft = (t=='.') ? 1 : 3;
            }
            audio.eating.startLoop(true);
            map.onDotEat(this.tile.x, this.tile.y);
            ghostReleaser.onDotEat();
            fruit.onDotEat();
            addScore((t=='.') ? 10 : 50);

            if (t=='o')
                energizer.activate();
        }
        if (t == ' ' && ! (this.lastMeal.x == this.tile.x && this.lastMeal.y == this.tile.y)) {
            audio.eating.stopLoop(true);
        }
    }
};

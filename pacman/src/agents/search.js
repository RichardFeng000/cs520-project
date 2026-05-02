//////////////////////////////////////////////////////////////////////////////////////
// Shared search helpers for Pac-Man AI agents.

var ASTAR_SEARCH_DIRS = [DIR_UP, DIR_LEFT, DIR_DOWN, DIR_RIGHT];

var getAstarTileKey = function(tile) {
    return tile.x + "," + tile.y;
};

var getAstarTileInDir = function(tile, dirEnum) {
    var dir = {};
    setDirFromEnum(dir, dirEnum);
    return {
        x: tile.x + dir.x,
        y: tile.y + dir.y,
    };
};

var getAstarManhattan = function(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

var isAstarInSearchBounds = function(tile) {
    return tile.y >= 0 && tile.y < map.numRows && tile.x >= -2 && tile.x < map.numCols + 2;
};

var isAstarWalkable = function(tile) {
    return isAstarInSearchBounds(tile) && map.isFloorTile(tile.x, tile.y);
};

var AstarPriorityQueue = function() {
    this.items = [];
};

AstarPriorityQueue.prototype.push = function(item) {
    var i;
    this.items.push(item);
    i = this.items.length - 1;
    while (i > 0) {
        var parent = Math.floor((i - 1) / 2);
        if (this.items[parent].priority <= item.priority) {
            break;
        }
        this.items[i] = this.items[parent];
        i = parent;
    }
    this.items[i] = item;
};

AstarPriorityQueue.prototype.pop = function() {
    var root = this.items[0];
    var item = this.items.pop();
    var i = 0;
    if (this.items.length && item) {
        while (true) {
            var left = i * 2 + 1;
            var right = left + 1;
            var child = left;
            if (right < this.items.length && this.items[right].priority < this.items[left].priority) {
                child = right;
            }
            if (left >= this.items.length || this.items[child].priority >= item.priority) {
                break;
            }
            this.items[i] = this.items[child];
            i = child;
        }
        this.items[i] = item;
    }
    return root;
};

AstarPriorityQueue.prototype.isEmpty = function() {
    return this.items.length == 0;
};

var astarPath = function(start, goalTest, isWalkable, costFn, heuristicFn, maxNodes) {
    var open = new AstarPriorityQueue();
    var startKey = getAstarTileKey(start);
    var cameFrom = {};
    var gScore = {};
    var steps = {};
    var expanded = 0;
    var current;
    var currentKey;
    var dirEnum;
    var neighbor;
    var neighborKey;
    var arrivalStep;
    var tentative;
    var path;
    var edge;

    maxNodes = maxNodes || 2500;
    costFn = costFn || function() { return 1; };
    heuristicFn = heuristicFn || function() { return 0; };
    gScore[startKey] = 0;
    steps[startKey] = 0;
    open.push({ tile: start, cost: 0, priority: heuristicFn(start) });

    while (!open.isEmpty() && expanded < maxNodes) {
        current = open.pop();
        currentKey = getAstarTileKey(current.tile);
        if (current.cost > gScore[currentKey]) {
            continue;
        }

        if (goalTest(current.tile)) {
            path = [];
            while (currentKey != startKey) {
                edge = cameFrom[currentKey];
                path.push(edge.dirEnum);
                currentKey = edge.previousKey;
            }
            path.reverse();
            return path;
        }

        expanded++;
        for (var i=0; i<ASTAR_SEARCH_DIRS.length; i++) {
            dirEnum = ASTAR_SEARCH_DIRS[i];
            neighbor = getAstarTileInDir(current.tile, dirEnum);
            if (!isWalkable(neighbor)) {
                continue;
            }
            neighborKey = getAstarTileKey(neighbor);
            arrivalStep = steps[currentKey] + 1;
            tentative = gScore[currentKey] + costFn(current.tile, neighbor, arrivalStep);
            if (gScore[neighborKey] != undefined && tentative >= gScore[neighborKey]) {
                continue;
            }
            cameFrom[neighborKey] = {
                previousKey: currentKey,
                dirEnum: dirEnum,
            };
            gScore[neighborKey] = tentative;
            steps[neighborKey] = arrivalStep;
            open.push({
                tile: neighbor,
                cost: tentative,
                priority: tentative + heuristicFn(neighbor),
            });
        }
    }
};

var astarFirstStep = function(start, goalTest, isWalkable, costFn, heuristicFn, maxNodes) {
    var path = astarPath(start, goalTest, isWalkable, costFn, heuristicFn, maxNodes);
    return path && path.length ? path[0] : undefined;
};

var bfsDistance = function(start, goalTest, isWalkable, maxNodes) {
    var queue = [{ tile: start, dist: 0 }];
    var visited = {};
    var head = 0;
    var current;
    var key;
    var neighbor;

    maxNodes = maxNodes || 2500;
    while (head < queue.length && head < maxNodes) {
        current = queue[head++];
        key = getAstarTileKey(current.tile);
        if (visited[key]) {
            continue;
        }
        visited[key] = true;
        if (current.dist > 0 && goalTest(current.tile)) {
            return current.dist;
        }
        for (var i=0; i<ASTAR_SEARCH_DIRS.length; i++) {
            neighbor = getAstarTileInDir(current.tile, ASTAR_SEARCH_DIRS[i]);
            if (isWalkable(neighbor) && !visited[getAstarTileKey(neighbor)]) {
                queue.push({ tile: neighbor, dist: current.dist + 1 });
            }
        }
    }
    return Infinity;
};

var getAstarNearestTarget = function(start, goalTest, isWalkable) {
    var queue = [start];
    var visited = {};
    var head = 0;
    var current;
    var key;
    var neighbor;

    while (head < queue.length && head < 2500) {
        current = queue[head++];
        key = getAstarTileKey(current);
        if (visited[key]) {
            continue;
        }
        visited[key] = true;
        if (goalTest(current) && key != getAstarTileKey(start)) {
            return current;
        }
        for (var i=0; i<ASTAR_SEARCH_DIRS.length; i++) {
            neighbor = getAstarTileInDir(current, ASTAR_SEARCH_DIRS[i]);
            if (isWalkable(neighbor) && !visited[getAstarTileKey(neighbor)]) {
                queue.push(neighbor);
            }
        }
    }
};

var getAstarGhostObstacleCells = function() {
    var obstacles = {};
    var g;
    var nextTile;
    for (var i=0; i<ghosts.length; i++) {
        g = ghosts[i];
        if (g.mode != GHOST_OUTSIDE || g.scared) {
            continue;
        }
        obstacles[getAstarTileKey(g.tile)] = true;
        nextTile = getAstarTileInDir(g.tile, g.dirEnum);
        if (isAstarWalkable(nextTile)) {
            obstacles[getAstarTileKey(nextTile)] = true;
        }
    }
    return obstacles;
};

var getAstarScaredGhostTargets = function() {
    var targets = [];
    for (var i=0; i<ghosts.length; i++) {
        if (ghosts[i].mode == GHOST_OUTSIDE && ghosts[i].scared) {
            targets.push(ghosts[i].tile);
        }
    }
    return targets;
};

var ghostStepDistribution = function(ghost, steps, isWalkable) {
    var dist = {};
    var nextDist;
    var key;
    var parts;
    var tile;
    var neighbors;
    var neighbor;
    var share;

    dist[getAstarTileKey(ghost.tile)] = 1;
    for (var step=0; step<steps; step++) {
        nextDist = {};
        for (key in dist) {
            if (!dist.hasOwnProperty(key)) {
                continue;
            }
            parts = key.split(",");
            tile = { x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) };
            neighbors = [];
            for (var i=0; i<ASTAR_SEARCH_DIRS.length; i++) {
                neighbor = getAstarTileInDir(tile, ASTAR_SEARCH_DIRS[i]);
                if (isWalkable(neighbor)) {
                    neighbors.push(neighbor);
                }
            }
            if (!neighbors.length) {
                nextDist[key] = (nextDist[key] || 0) + dist[key];
                continue;
            }
            share = dist[key] / neighbors.length;
            for (var j=0; j<neighbors.length; j++) {
                var neighborKey = getAstarTileKey(neighbors[j]);
                nextDist[neighborKey] = (nextDist[neighborKey] || 0) + share;
            }
        }
        dist = nextDist;
    }
    return dist;
};

var ghostStepProbability = function(ghost, steps, tile, isWalkable) {
    return ghostStepDistribution(ghost, steps, isWalkable || isAstarWalkable)[getAstarTileKey(tile)] || 0;
};

var isAstarCollectibleTile = function(tile) {
    var tileChar = map.getTile(tile.x, tile.y);
    return tileChar == "." || tileChar == "o";
};

var chooseAstarFallbackDir = function(player, openTiles) {
    var bestDir = player.dirEnum;
    var bestScore = -Infinity;
    var score;
    for (var i=0; i<4; i++) {
        if (!openTiles[i]) {
            continue;
        }
        score = player.getTraditionalMoveScore ? player.getTraditionalMoveScore(i) : 0;
        if (score > bestScore) {
            bestScore = score;
            bestDir = i;
        }
    }
    return bestDir;
};

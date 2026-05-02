//////////////////////////////////////////////////////////////////////////////////////
// Risk-aware A*: add expected ghost occupancy risk to the path cost.

var ASTAR_RISK_LAMBDA = 1.5;

var makeAstarRiskCost = function(riskLambda) {
    var distributionCache = {};

    return function(_current, neighbor, arrivalStep) {
        var risk = 0;
        var cacheKey;
        var dist;
        for (var i=0; i<ghosts.length; i++) {
            if (ghosts[i].mode != GHOST_OUTSIDE || ghosts[i].scared) {
                continue;
            }
            cacheKey = i + "|" + arrivalStep;
            if (!distributionCache[cacheKey]) {
                distributionCache[cacheKey] = ghostStepDistribution(
                    ghosts[i],
                    arrivalStep,
                    isAstarWalkable
                );
            }
            dist = distributionCache[cacheKey];
            risk += dist[getAstarTileKey(neighbor)] || 0;
        }
        return 1 + riskLambda * risk;
    };
};

var chooseAstarRiskWithObstacles = function(player, openTiles, obstacles, riskLambda) {
    var target;
    var scaredTargetKeys = {};
    var scaredTargets = getAstarScaredGhostTargets();
    var riskCost = makeAstarRiskCost(riskLambda);
    var dirEnum;

    for (var i=0; i<scaredTargets.length; i++) {
        scaredTargetKeys[getAstarTileKey(scaredTargets[i])] = true;
    }
    target = chooseAstarReplanTarget(player, obstacles, scaredTargetKeys);
    if (!target) {
        return undefined;
    }

    dirEnum = astarFirstStep(
        player.tile,
        function(tile) { return tile.x == target.x && tile.y == target.y; },
        function(tile) {
            var tileKey = getAstarTileKey(tile);
            return isAstarWalkable(tile) &&
                (!obstacles[tileKey] ||
                    (tile.x == target.x && tile.y == target.y && scaredTargetKeys[tileKey]));
        },
        function(current, neighbor, arrivalStep) {
            if (scaredTargetKeys[getAstarTileKey(neighbor)]) {
                return 0.2;
            }
            return riskCost(current, neighbor, arrivalStep);
        },
        function(tile) { return getAstarManhattan(tile, target); }
    );

    return openTiles[dirEnum] ? dirEnum : undefined;
};

var chooseAstarRiskDir = function(player, openTiles, riskLambda) {
    var lambda = riskLambda == undefined ? ASTAR_RISK_LAMBDA : riskLambda;
    var dirEnum = chooseAstarRiskWithObstacles(player, openTiles, getAstarGhostObstacleCells(), lambda);
    if (dirEnum == undefined) {
        dirEnum = chooseAstarRiskWithObstacles(player, openTiles, {}, lambda);
    }
    if (dirEnum == undefined) {
        dirEnum = chooseAstarFallbackDir(player, openTiles);
    }
    player._astarPlan = undefined;
    player._astarTarget = undefined;
    player.targetTile = getAstarTileInDir(player.tile, dirEnum);
    return dirEnum;
};

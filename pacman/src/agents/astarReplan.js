//////////////////////////////////////////////////////////////////////////////////////
// Replanning A*: recompute every decision and avoid immediate ghost danger.

var getAstarTargetFromTiles = function(startTile, tiles, isWalkable) {
    var targetKeys = {};
    for (var i=0; i<tiles.length; i++) {
        targetKeys[getAstarTileKey(tiles[i])] = true;
    }
    return getAstarNearestTarget(
        startTile,
        function(tile) { return targetKeys[getAstarTileKey(tile)]; },
        isWalkable
    );
};

var chooseAstarReplanTarget = function(player, obstacles, scaredTargetKeys) {
    var scaredTargets = getAstarScaredGhostTargets();
    var isWalkable = function(tile) {
        var tileKey = getAstarTileKey(tile);
        return isAstarWalkable(tile) && (!obstacles[tileKey] || scaredTargetKeys[tileKey]);
    };
    if (scaredTargets.length) {
        return getAstarTargetFromTiles(player.tile, scaredTargets, isWalkable);
    }
    return getAstarNearestTarget(
        player.tile,
        isAstarCollectibleTile,
        isWalkable
    );
};

var chooseAstarReplanWithObstacles = function(player, openTiles, obstacles) {
    var target;
    var scaredTargetKeys = {};
    var scaredTargets = getAstarScaredGhostTargets();
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
        function(_current, neighbor) {
            return scaredTargetKeys[getAstarTileKey(neighbor)] ? 0.2 : 1;
        },
        function(tile) { return getAstarManhattan(tile, target); }
    );

    return openTiles[dirEnum] ? dirEnum : undefined;
};

var chooseAstarReplanDir = function(player, openTiles) {
    var dirEnum = chooseAstarReplanWithObstacles(player, openTiles, getAstarGhostObstacleCells());
    if (dirEnum == undefined) {
        dirEnum = chooseAstarReplanWithObstacles(player, openTiles, {});
    }
    if (dirEnum == undefined) {
        dirEnum = chooseAstarFallbackDir(player, openTiles);
    }
    player._astarPlan = undefined;
    player._astarTarget = undefined;
    player.targetTile = getAstarTileInDir(player.tile, dirEnum);
    return dirEnum;
};

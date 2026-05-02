//////////////////////////////////////////////////////////////////////////////////////
// Static A*: plan once to the nearest collectible and reuse the path until invalid.

var isAstarStaticPlanValid = function(player, openTiles) {
    var plan = player._astarPlan;
    var target = player._astarTarget;
    var nextTile;

    if (!plan || !plan.length || !target || !isAstarCollectibleTile(target)) {
        return false;
    }
    if (!openTiles[plan[0]]) {
        return false;
    }
    nextTile = getAstarTileInDir(player.tile, plan[0]);
    return isAstarWalkable(nextTile);
};

var replanAstarStatic = function(player) {
    var target = getAstarNearestTarget(
        player.tile,
        isAstarCollectibleTile,
        isAstarWalkable
    );

    player._astarTarget = target;
    player._astarPlan = [];
    if (!target) {
        return;
    }
    player._astarPlan = astarPath(
        player.tile,
        function(tile) { return tile.x == target.x && tile.y == target.y; },
        isAstarWalkable,
        function() { return 1; },
        function(tile) { return getAstarManhattan(tile, target); }
    ) || [];
};

var chooseAstarStaticDir = function(player, openTiles) {
    var dirEnum;

    if (!isAstarStaticPlanValid(player, openTiles)) {
        replanAstarStatic(player);
    }

    if (player._astarPlan && player._astarPlan.length) {
        dirEnum = player._astarPlan.shift();
        if (openTiles[dirEnum]) {
            player.targetTile = getAstarTileInDir(player.tile, dirEnum);
            return dirEnum;
        }
    }

    dirEnum = chooseAstarFallbackDir(player, openTiles);
    player.targetTile = getAstarTileInDir(player.tile, dirEnum);
    return dirEnum;
};

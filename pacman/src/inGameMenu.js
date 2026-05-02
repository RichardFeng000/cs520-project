////////////////////////////////////////////////////
// In-Game Menu
var inGameMenu = (function() {

    var h=tileSize*2;
    var hudButtonFont = Math.max(4, tileSize-4) + "px ArcadeR";
    var astarButtonWidth = tileSize*2;
    var replanButtonWidth = tileSize*15/4;
    var riskButtonWidth = tileSize*3;
    var menuButtonWidth = tileSize*15/4;
    var rlButtonWidth = tileSize*7/2;
    var modelButtonWidth = tileSize*9/2;
    var aiButtonGap = tileSize/4;
    var aiButtonY = mapHeight;
    var aiButtonsEnabled = false;
    var aiRowWidth = astarButtonWidth + replanButtonWidth +
        riskButtonWidth + menuButtonWidth + rlButtonWidth + modelButtonWidth +
        aiButtonGap*5;
    var aiRowX = mapWidth/2 - aiRowWidth/2;
    var astarButtonX = aiRowX;
    var replanButtonX = astarButtonX + astarButtonWidth + aiButtonGap;
    var riskButtonX = replanButtonX + replanButtonWidth + aiButtonGap;
    var menuButtonX = riskButtonX + riskButtonWidth + aiButtonGap;
    var rlButtonX = menuButtonX + menuButtonWidth + aiButtonGap;
    var modelButtonX = rlButtonX + rlButtonWidth + aiButtonGap;

    var getMainMenu = function() {
        return practiceMode ? practiceMenu : menu;
    };
    var showMainMenu = function() {
        getMainMenu().enable();
    };
    var hideMainMenu = function() {
        getMainMenu().disable();
    };

    // button to enable in-game menu
    var btn = new Button(menuButtonX, aiButtonY, menuButtonWidth, h, function() {
        showMainMenu();
        vcr.onHudDisable();
    });
    btn.setText("MENU");
    btn.setFont(hudButtonFont,"#FFF");

    var setCompactToggleLabel = function(button, label) {
        button.setToggleLabel(label);
        button.refreshMsg = function() {
            this.msg = label;
        };
    };

    var astarAiButton = new ToggleButton(astarButtonX, aiButtonY, astarButtonWidth, h,
        function() {
            return pacman.ai && pacman.aiMode == AI_STRATEGY_ASTAR;
        },
        function(on) {
            if (on) {
                pacman.enableAiControl(AI_STRATEGY_ASTAR);
            }
            else if (pacman.aiMode == AI_STRATEGY_ASTAR) {
                pacman.disableAiControl();
            }
        });
    astarAiButton.setFont(hudButtonFont, "#FFF");
    setCompactToggleLabel(astarAiButton, "A*");

    var replanAiButton = new ToggleButton(replanButtonX, aiButtonY, replanButtonWidth, h,
        function() {
            return pacman.ai && pacman.aiMode == AI_STRATEGY_REPLAN;
        },
        function(on) {
            if (on) {
                pacman.enableAiControl(AI_STRATEGY_REPLAN);
            }
            else if (pacman.aiMode == AI_STRATEGY_REPLAN) {
                pacman.disableAiControl();
            }
        });
    replanAiButton.setFont(hudButtonFont, "#FFF");
    setCompactToggleLabel(replanAiButton, "REPLAN");

    var riskAiButton = new ToggleButton(riskButtonX, aiButtonY, riskButtonWidth, h,
        function() {
            return pacman.ai && pacman.aiMode == AI_STRATEGY_RISK;
        },
        function(on) {
            if (on) {
                pacman.enableAiControl(AI_STRATEGY_RISK);
            }
            else if (pacman.aiMode == AI_STRATEGY_RISK) {
                pacman.disableAiControl();
            }
        });
    riskAiButton.setFont(hudButtonFont, "#FFF");
    setCompactToggleLabel(riskAiButton, "RISK");

    var rlAiButton = new ToggleButton(rlButtonX, aiButtonY, rlButtonWidth, h,
        function() {
            return pacman.ai && pacman.aiMode == AI_STRATEGY_RL;
        },
        function(on) {
            if (on) {
                pacman.enableAiControl(AI_STRATEGY_RL);
            }
            else if (pacman.aiMode == AI_STRATEGY_RL) {
                pacman.disableAiControl();
            }
        });
    rlAiButton.setFont(hudButtonFont, "#FFF");
    rlAiButton.setToggleLabel("RL");

    var modelButton = new Button(modelButtonX, aiButtonY, modelButtonWidth, h, function() {
        cycleRlModel();
        modelButton.setText(getCurrentRlModelLabel());
    });
    modelButton.setFont(hudButtonFont, "#FFF");
    modelButton.setText(getCurrentRlModelLabel());

    var setAiButtonsEnabled = function(enabled) {
        if (enabled == aiButtonsEnabled) {
            return;
        }
        aiButtonsEnabled = enabled;
        if (enabled) {
            astarAiButton.enable();
            replanAiButton.enable();
            riskAiButton.enable();
            rlAiButton.enable();
            modelButton.enable();
            modelButton.setText(getCurrentRlModelLabel());
        }
        else {
            astarAiButton.disable();
            replanAiButton.disable();
            riskAiButton.disable();
            rlAiButton.disable();
            modelButton.disable();
        }
    };

    // confirms a menu action
    var confirmMenu = new Menu("QUESTION?",2*tileSize,5*tileSize,mapWidth-4*tileSize,3*tileSize,tileSize,tileSize+"px ArcadeR", "#EEE");
    confirmMenu.addTextButton("YES", function() {
        confirmMenu.disable();
        confirmMenu.onConfirm();
    });
    confirmMenu.addTextButton("NO", function() {
        confirmMenu.disable();
        showMainMenu();
    });
    confirmMenu.addTextButton("CANCEL", function() {
        confirmMenu.disable();
        showMainMenu();
    });
    confirmMenu.backButton = confirmMenu.buttons[confirmMenu.buttonCount-1];

    var showConfirm = function(title,onConfirm) {
        hideMainMenu();
        confirmMenu.title = title;
        confirmMenu.onConfirm = onConfirm;
        confirmMenu.enable();
    };

    // regular menu
    var menu = new Menu("PAUSED",2*tileSize,5*tileSize,mapWidth-4*tileSize,3*tileSize,tileSize,tileSize+"px ArcadeR", "#EEE");
    menu.addTextButton("RESUME", function() {
        menu.disable();
    });
    menu.addTextButton("QUIT", function() {
        showConfirm("QUIT GAME?", function() {
            switchState(homeState, 60);
        });
    });
    menu.backButton = menu.buttons[0];

    // practice menu
    var practiceMenu = new Menu("PAUSED",2*tileSize,5*tileSize,mapWidth-4*tileSize,3*tileSize,tileSize,tileSize+"px ArcadeR", "#EEE");
    practiceMenu.addTextButton("RESUME", function() {
        hideMainMenu();
        vcr.onHudEnable();
    });
    practiceMenu.addTextButton("RESTART LEVEL", function() {
        showConfirm("RESTART LEVEL?", function() {
            level--;
            switchState(readyNewState, 60);
        });
    });
    practiceMenu.addTextButton("SKIP LEVEL", function() {
        showConfirm("SKIP LEVEL?", function() {
            switchState(readyNewState, 60);
        });
    });
    practiceMenu.addTextButton("CHEATS", function() {
        practiceMenu.disable();
        aiModeButton.setText("AI MODE: " + pacman.getAiModeLabel());
        cheatsMenu.enable();
    });
    practiceMenu.addTextButton("QUIT", function() {
        showConfirm("QUIT GAME?", function() {
            switchState(homeState, 60);
            clearCheats();
            vcr.reset();
        });
    });
    practiceMenu.backButton = practiceMenu.buttons[0];

    // cheats menu
    var cheatsMenu = new Menu("CHEATS",2*tileSize,5*tileSize,mapWidth-4*tileSize,3*tileSize,tileSize,tileSize+"px ArcadeR", "#EEE");
    cheatsMenu.addToggleTextButton("INVINCIBLE",
        function() {
            return pacman.invincible;
        },
        function(on) {
            pacman.invincible = on;
        });
    cheatsMenu.addToggleTextButton("AUTO PILOT",
        function() {
            return pacman.ai;
        },
        function(on) {
            if (on) {
                pacman.enableAiControl(pacman.aiMode);
            }
            else {
                pacman.disableAiControl();
            }
        });
    var aiModeButton;
    cheatsMenu.addTextButton("", function() {
        pacman.cycleAiMode();
        aiModeButton.setText("AI MODE: " + pacman.getAiModeLabel());
    });
    aiModeButton = cheatsMenu.buttons[cheatsMenu.buttons.length-1];
    cheatsMenu.addToggleTextButton("TURBO",
        function() {
            return turboMode;
        },
        function(on) {
            turboMode = on;
        });
    cheatsMenu.addToggleTextButton("SHOW TARGETS",
        function() {
            return blinky.isDrawTarget;
        },
        function(on) {
            for (var i=0; i<4; i++) {
                ghosts[i].isDrawTarget = on;
            }
        });
    cheatsMenu.addToggleTextButton("SHOW PATHS",
        function() {
            return blinky.isDrawPath;
        },
        function(on) {
            for (var i=0; i<4; i++) {
                ghosts[i].isDrawPath = on;
            }
        });
    cheatsMenu.addSpacer(1);
    cheatsMenu.addTextButton("BACK", function() {
        cheatsMenu.disable();
        practiceMenu.enable();
    });
    cheatsMenu.backButton = cheatsMenu.buttons[cheatsMenu.buttons.length-1];

    var menus = [menu, practiceMenu, confirmMenu, cheatsMenu];
    var getVisibleMenu = function() {
        var len = menus.length;
        var i;
        var m;
        for (i=0; i<len; i++) {
            m = menus[i];
            if (m.isEnabled()) {
                return m;
            }
        }
    };

    return {
        onHudEnable: function() {
            btn.enable();
            setAiButtonsEnabled(true);
        },
        onHudDisable: function() {
            btn.disable();
            setAiButtonsEnabled(false);
        },
        update: function() {
            setAiButtonsEnabled(true);
            if (btn.isEnabled) {
                btn.update();
            }
            if (aiButtonsEnabled) {
                astarAiButton.update();
                replanAiButton.update();
                riskAiButton.update();
                rlAiButton.update();
                modelButton.update();
            }
        },
        draw: function(ctx) {
            var m = getVisibleMenu();
            if (m) {
                ctx.fillStyle = "rgba(0,0,0,0.8)";
                ctx.fillRect(-mapPad-1,-mapPad-1,mapWidth+1,mapHeight+1);
                m.draw(ctx);
            }
            else {
                if (aiButtonsEnabled) {
                    astarAiButton.draw(ctx);
                    replanAiButton.draw(ctx);
                    riskAiButton.draw(ctx);
                    rlAiButton.draw(ctx);
                    modelButton.draw(ctx);
                }
                btn.draw(ctx);
            }
        },
        isOpen: function() {
            return getVisibleMenu() != undefined;
        },
        getMenu: function() {
            return getVisibleMenu();
        },
        getMenuButton: function() {
            return btn;
        },
    };
})();

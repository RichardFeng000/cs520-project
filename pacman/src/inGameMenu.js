////////////////////////////////////////////////////
// In-Game Menu
var inGameMenu = (function() {

    var w=tileSize*6,h=tileSize*3;
    var tradButtonWidth = tileSize*5;
    var rlButtonWidth = tileSize*4;
    var modelButtonWidth = tileSize*6;
    var aiButtonGap = tileSize/2;
    var aiButtonY = mapHeight;
    var aiButtonsEnabled = false;

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
    var btn = new Button(mapWidth/2 - w/2,mapHeight,w,h, function() {
        showMainMenu();
        vcr.onHudDisable();
    });
    btn.setText("MENU");
    btn.setFont(tileSize+"px ArcadeR","#FFF");

    var aiLeftX = btn.x - aiButtonGap - tradButtonWidth;
    var aiRightX = btn.x + btn.w + aiButtonGap;
    var modelButtonX = aiRightX + rlButtonWidth + aiButtonGap;

    var traditionalAiButton = new ToggleButton(aiLeftX, aiButtonY, tradButtonWidth, h,
        function() {
            return pacman.ai && pacman.aiMode == AI_STRATEGY_TRADITIONAL;
        },
        function(on) {
            if (on) {
                pacman.enableAiControl(AI_STRATEGY_TRADITIONAL);
            }
            else if (pacman.aiMode == AI_STRATEGY_TRADITIONAL) {
                pacman.disableAiControl();
            }
        });
    traditionalAiButton.setFont((tileSize-2)+"px ArcadeR", "#FFF");
    traditionalAiButton.setToggleLabel("TRAD");

    var rlAiButton = new ToggleButton(aiRightX, aiButtonY, rlButtonWidth, h,
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
    rlAiButton.setFont((tileSize-2)+"px ArcadeR", "#FFF");
    rlAiButton.setToggleLabel("RL");

    var modelButton = new Button(modelButtonX, aiButtonY, modelButtonWidth, h, function() {
        cycleRlModel();
        modelButton.setText(getCurrentRlModelLabel());
    });
    modelButton.setFont((tileSize-2)+"px ArcadeR", "#FFF");
    modelButton.setText(getCurrentRlModelLabel());

    var setAiButtonsEnabled = function(enabled) {
        if (enabled == aiButtonsEnabled) {
            return;
        }
        aiButtonsEnabled = enabled;
        if (enabled) {
            traditionalAiButton.enable();
            rlAiButton.enable();
            modelButton.enable();
            modelButton.setText(getCurrentRlModelLabel());
        }
        else {
            traditionalAiButton.disable();
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
                traditionalAiButton.update();
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
                    traditionalAiButton.draw(ctx);
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

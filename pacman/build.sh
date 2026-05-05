#!/bin/bash

# 1. build 'pacman.js' by concatenating files specified in js_order
# 2. update time stamp in index.html
# 3. build debug.html with individual script includes

OUTPUT="pacman.js"
PUBLIC_DIR="./public"
debug_includes="\n"
MODEL_LIBRARY_DIR="../RL/models"
MODEL3_RL_MODEL="$MODEL_LIBRARY_DIR/rl_model3.generated.js"
EXTERNAL_RL_MODEL="../RL/rl_model.generated.js"

# write header
echo "
// Copyright 2012 Shaun Williams
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License Version 3 as 
//  published by the Free Software Foundation.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.

// ==========================================================================
// PAC-MAN
// an accurate remake of the original arcade game

// Based on original works by Namco, GCC, and Midway.
// Research by Jamey Pittman and Bart Grantham
// Developed by Shaun Williams, Mason Borda

// ==========================================================================

(function(){
" > $OUTPUT

echo "window.__PACMAN_MODEL_LIBRARY__ = window.__PACMAN_MODEL_LIBRARY__ || {};" >> $OUTPUT

for model_file in "$MODEL_LIBRARY_DIR"/rl_model[0-9]*.generated.js
do
    if [ ! -f "$model_file" ]; then
        continue
    fi
    model_name=$(basename "$model_file" .generated.js | sed 's/^rl_//' | tr '[:lower:]' '[:upper:]')
    echo "//@line 1 \"$model_file\"" >> $OUTPUT
    sed "s/window.__PACMAN_RL_MODEL__ = /window.__PACMAN_MODEL_LIBRARY__['$model_name'] = /" "$model_file" >> $OUTPUT
done

if [ -f "$MODEL3_RL_MODEL" ]; then
    EXTERNAL_RL_MODEL="$MODEL3_RL_MODEL"
fi

if [ -f "$EXTERNAL_RL_MODEL" ]; then
    echo "//@line 1 \"$EXTERNAL_RL_MODEL\"" >> $OUTPUT
    cat "$EXTERNAL_RL_MODEL" >> $OUTPUT
fi

for file in \
    inherit.js \
    sound.js \
    random.js \
    game.js \
    direction.js \
    Map.js \
    colors.js \
    mapgen.js \
    atlas.js \
    renderers.js  \
    hud.js \
    galagaStars.js \
    Button.js \
    Menu.js \
    inGameMenu.js \
    sprites.js \
    Actor.js \
    Ghost.js \
    agents/search.js \
    agents/astarStatic.js \
    agents/astarReplan.js \
    agents/astarRisk.js \
    Player.js \
    actors.js \
    targets.js \
    ghostCommander.js \
    ghostReleaser.js \
    elroyTimer.js \
    energizer.js \
    fruit.js \
    executive.js \
    states.js \
    input.js \
    cutscenes.js \
    maps.js \
    vcr.js \
    main.js
do
    # points firebug to correct file (or so I hoped)
    # if JSOPTION_ATLINE is set, this should work in firefox (but I don't know how to set it)
    echo "//@line 1 \"src/$file\"" >> $OUTPUT 

    # concatenate file to output
    cat src/$file >> $OUTPUT

    # add this file to debug includes
    debug_includes="$debug_includes<script src=\"src/$file\"></script>\n"
done

# end anonymous function wrapper
echo "})();" >> $OUTPUT

# update time stamp
sed -i '.bak' "s/last updated:[^<]*/last updated: $(date) -->/" index.html

# build debug.html from index.html adding debug includes
sed "s:.*$output.*:$debug_includes:" index.html > debug.html

# reset the public folder

if [ -d "$PUBLIC_DIR" ]; then rm -Rf $PUBLIC_DIR; fi

mkdir public    

# copy index.html to public

cp index.html ./public/index.html

# copy pacman.js to public

cp pacman.js ./public/pacman.js

# copy fonts to public

cp -rf ./font ./public/

# copy sounds to public

cp -rf sounds ./public/

# copy icons to public

cp -rf icon ./public/

# create the pages folder

rm -rf pages
mkdir pages
touch pages/index.js

# populate index.js

echo "import React from 'react'
import Head from 'next/head'

const Index = () => (
  <>
    <Head>
      <title>Pacman</title>
    </Head>
    <style jsx global>{\`
      html,
      body,
      #__next {
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
    \`}</style>
    <iframe
      src='/index.html'
      width='100%'
      height='100%'
      frameBorder='0'
    />
  </>
)

export default Index" > pages/index.js

# setup the styles folder

rm -rf styles
mkdir styles
touch styles/globals.css

# populate the css file

echo "html,
body,
#__next {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}" > styles/global.css

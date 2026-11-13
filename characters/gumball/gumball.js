/* Gumball Watterson character package for New Mugen.
 * Keeps fighter identity/profile data separate from the engine and the existing Yusuke package.
 * Sprite atlas contract: 8 columns x 8 rows, transparent PNG, cell 256x256.
 */
(function(root){
  "use strict";
  const animations = {
    idle: {frames:[0,1,2,3,2,1],fps:8,loop:true},
    idleVariation1: {frames:[0,1,2,3],fps:7,loop:true},
    idleVariation2: {frames:[4,5,4,6],fps:6,loop:true},
    idleVariation3: {frames:[7,8,9],fps:5,loop:true},
    idleAlt: {frames:[4,5,4,6],fps:6,loop:true},
    idleTaunt: {frames:[7,8,9],fps:5,loop:true},
    walkForward: {frames:[10,11,12,13,14,15],fps:12,loop:true},
    walkBack: {frames:[15,14,13,12,11,10],fps:12,loop:true},
    walkLeft: {frames:[15,14,13,12,11,10],fps:12,loop:true},
    walkRight: {frames:[10,11,12,13,14,15],fps:12,loop:true},
    walkUp: {frames:[10,11,12,13,14,15],fps:10,loop:true},
    walkDown: {frames:[15,14,13,12,11,10],fps:10,loop:true},
    runForward: {frames:[16,17,18,19,20,21,22,23],fps:18,loop:true},
    runBack: {frames:[23,22,21,20,19,18,17,16],fps:18,loop:true},
    runLeft: {frames:[23,22,21,20,19,18,17,16],fps:18,loop:true},
    runRight: {frames:[16,17,18,19,20,21,22,23],fps:18,loop:true},
    runUp: {frames:[16,17,18,19,20,21,22,23],fps:16,loop:true},
    runDown: {frames:[23,22,21,20,19,18,17,16],fps:16,loop:true},
    jumpRise: {frames:[24,25,26,27],fps:15,loop:false},
    jumpApex: {frames:[27,28],fps:10,loop:true},
    jumpFall: {frames:[28,29,30],fps:14,loop:false},
    land: {frames:[30,31,0],fps:15,loop:false},
    jab: {frames:[32,33,34,32],fps:18,loop:false},
    cross: {frames:[35,36,37,35],fps:16,loop:false},
    bodyBlow: {frames:[38,39,40,38],fps:15,loop:false},
    uppercut: {frames:[41,42,43,44],fps:16,loop:false},
    lowKick: {frames:[45,46,47,45],fps:15,loop:false},
    heavyKick: {frames:[45,46,47,45],fps:14,loop:false},
    stretchJab: {frames:[48,49,50,48],fps:14,loop:false},
    airKick: {frames:[51,52,53],fps:15,loop:false},
    airSpin: {frames:[54,55,56,57],fps:16,loop:false},
    block: {frames:[58,59],fps:7,loop:true},
    dodge: {frames:[60,61,62,60],fps:20,loop:false},
    perfectDodge: {frames:[61,62,60],fps:22,loop:false},
    airBlock: {frames:[58,59],fps:8,loop:true},
    counter: {frames:[60,61,63,60],fps:18,loop:false},
    hitLight: {frames:[63,64],fps:15,loop:false},
    hitMid: {frames:[64,65],fps:14,loop:false},
    hitHeavy: {frames:[65,66,67],fps:12,loop:false},
    hitAir: {frames:[66,67,68],fps:14,loop:false},
    hitWall: {frames:[67,68,69],fps:12,loop:false},
    hitGround: {frames:[68,69],fps:10,loop:false},
    knockdown: {frames:[68,69],fps:8,loop:false},
    groundSlide: {frames:[69,70],fps:10,loop:false},
    recovery: {frames:[69,70,0],fps:12,loop:false},
    getUp: {frames:[70,0,1],fps:12,loop:false},
    elmoreRush: {frames:[71,72,73,74],fps:18,loop:false},
    cartoonSpin: {frames:[75,76,77,78],fps:18,loop:false},
    stretchSlam: {frames:[79,80,81,82],fps:15,loop:false},
    wattersomChaos: {frames:[83,84,85,86,87],fps:15,loop:false},
    realityBreak: {frames:[88,89,90,91,92,93,94,95],fps:18,loop:false},
    victory: {frames:[2,3,4,5],fps:8,loop:false},
    victoryPose: {frames:[5,6,7],fps:5,loop:true},
    defeat: {frames:[65,66,68,69],fps:9,loop:false},
    defeatPose: {frames:[69,70,69],fps:6,loop:true}
  };
  const attacks = {
    jab:{duration:.23,activeStart:.055,activeEnd:.12,damage:24,range:96,height:88,hitstun:.19,knockback:125,energyGain:2,animation:"jab",chain:"light"},
    cross:{duration:.26,activeStart:.075,activeEnd:.15,damage:30,range:115,height:98,hitstun:.23,knockback:165,energyGain:2,animation:"cross",chain:"light"},
    body:{duration:.31,activeStart:.10,activeEnd:.18,damage:36,range:105,height:82,hitstun:.27,knockback:210,energyGain:3,animation:"bodyBlow",chain:"light"},
    uppercut:{duration:.39,activeStart:.12,activeEnd:.23,damage:47,range:110,height:128,hitstun:.39,knockback:260,launchVelocity:-535,energyGain:4,heavyImpact:true,animation:"uppercut"},
    heavyKick:{duration:.43,activeStart:.14,activeEnd:.27,damage:60,range:150,height:105,hitstun:.39,knockback:560,launchVelocity:-210,energyGain:5,heavyImpact:true,animation:"heavyKick"},
    lowKick:{duration:.34,activeStart:.10,activeEnd:.20,damage:33,range:125,height:58,hitstun:.24,knockback:175,energyGain:3,animation:"lowKick"},
    stretchJab:{duration:.38,activeStart:.12,activeEnd:.24,damage:52,range:245,height:92,hitstun:.33,knockback:360,energyGain:4,animation:"stretchJab"},
    airKick:{duration:.31,activeStart:.08,activeEnd:.20,damage:34,range:130,height:105,hitstun:.22,knockback:210,energyGain:3,animation:"airKick",heavyImpact:false},
    airSpin:{duration:.45,activeStart:.12,activeEnd:.33,damage:56,range:158,height:140,hitstun:.34,knockback:420,launchVelocity:-185,energyGain:4,heavyImpact:true,animation:"airSpin"},
    elmoreRush:{duration:.62,activeStart:.18,activeEnd:.48,damage:92,range:210,height:142,hitstun:.48,knockback:610,energyGain:0,animation:"elmoreRush",heavyImpact:true,cost:18},
    cartoonSpin:{duration:.70,activeStart:.17,activeEnd:.52,damage:84,range:178,height:164,hitstun:.43,knockback:475,launchVelocity:-280,energyGain:0,animation:"cartoonSpin",heavyImpact:true,cost:22},
    stretchSlam:{duration:.72,activeStart:.24,activeEnd:.48,damage:118,range:220,height:150,hitstun:.62,knockback:730,launchVelocity:-410,energyGain:0,animation:"stretchSlam",heavyImpact:true,cost:26},
    wattersomChaos:{duration:.88,activeStart:.25,activeEnd:.68,damage:140,range:260,height:180,hitstun:.72,knockback:790,launchVelocity:-365,energyGain:0,animation:"wattersomChaos",heavyImpact:true,cost:34}
  };
  const profile = Object.freeze({
    id:"gumball_watterson", name:"Gumball Watterson", series:"The Amazing World of Gumball",
    origin:"Elmore", archetype:"Unpredictable Speed Fighter / Cartoon Physics",
    role:"Speed Fighter", difficulty:3, color:"#63c9ff",
    stats:{power:70,speed:94,defense:62,range:74,technique:89},
    specialMoves:[
      {name:"Elmore Rush",input:"→ → + □",type:"rush",animation:"elmoreRush"},
      {name:"Cartoon Spin",input:"↓ ↘ → + △",type:"spin",animation:"cartoonSpin"},
      {name:"Stretch Slam",input:"← → + ○",type:"commandGrab",animation:"stretchSlam"},
      {name:"Wattersom Chaos",input:"↓ ↙ ← + ✕",type:"multiDirectional",animation:"wattersomChaos"},
      {name:"Super – Reality Break",input:"↓ ↘ → + R2",type:"ultimate",animation:"realityBreak"}
    ]
  });
  root.GumballCharacter = Object.freeze({
    profile, animations:Object.freeze(animations), attacks:Object.freeze(attacks),
    sprite:{src:"characters/gumball/gumball-sprites.png",columns:8,rows:12,cellWidth:256,cellHeight:256,frameCount:96,scale:1.0,assetStatus:"awaiting-dedicated-animation-atlas"},
    movement:{groundSpeed:385,airSpeed:340,gravity:1580,jumpVelocity:-690,groundFriction:1850,airFriction:480,attackFriction:620},
    combo:{requiredLights:3,window:.92,scaleStart:1.12,scaleStep:.13,maxScale:2.25,decay:.012,maxHits:12},
    reactions:{hitStopLight:.045,hitStopHeavy:.085,blockStun:.13,wallBounce:.45,groundBounce:-390}
  });
})(typeof window === "undefined" ? globalThis : window);

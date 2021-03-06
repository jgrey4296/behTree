/* jshint esversion : 6 */
"use strict";
var BTree = require('./bTreeSimple'),
    behaviourModule = require('./exampleBehaviours'),
    _ = require('underscore');

let characters = [],
    baseBTree = new BTree(undefined,behaviourModule,undefined),
    bob = baseBTree.newCharacter({
        name : "bob",
    }),
    bill = baseBTree.newCharacter({
        name : "bill",
    }),
    turns = 10,
    currentTurn = 0;

//turn on debug flags:
bob.setDebugFlags('failure');

//assert initial facts:
baseBTree.fb.parse([".locations.kitchen",".locations.study",".locations.diningRoom",
                 ".locations.kitchen.items.knife",".locations.diningRoom.items.spoon",
                 ".bob.location!kitchen",".bill.location!kitchen"]);

//Load the characters:
characters.push(bob,bill);

let intervalObject = setInterval(function(){
    console.log(`\nTurn ${currentTurn}`);
    if(turns < currentTurn++){
        clearInterval(intervalObject);
    }
    characters.forEach(d=>{
        console.log(`\n\tChar: ${d.values.name}`);
        d.update();
    });

    console.log('\n\n\tFacts:' + baseBTree.fb.toStrings().map(e=>`\n\t${e}`).join(""));
},2000);



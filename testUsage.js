/* jshint esversion : 6 */
"use strict";
var BTree = require('./bTreeSimple'),
    behaviourModule = require('./exampleBehaviours'),
    _ = require('underscore');

let characters = [],
    baseBTree = new BTree(undefined,behaviourModule),
    bob = baseBTree.newCharacter({
        name : "bob",
    }),
    bill = baseBTree.newCharacter({
        name : "bill",
    }),
    turns = 10,
    currentTurn = 0;

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
    
},2000);



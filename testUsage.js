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

while(currentTurn++ < turns){
    console.log(`\nTurn: ${currentTurn}`);
    characters.forEach(d=>{
        console.log(`Char: ${d.values.name}`);
        d.update();
    });
}





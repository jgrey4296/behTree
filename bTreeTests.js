/* jshint esversion : 6 */
"use strict";
var BTree = require('./bTreeSimple'),
    _ = require('underscore');

module.exports = {

    init : function(test){
        let bTree = new BTree();
        test.ok(bTree !== undefined);
        test.ok(bTree.root !== undefined);
        test.ok(bTree.behaviourLibrary !== undefined);
        test.done();
    },

    //add a simple leaf behaviour
    addBehaviourLeaf : function(test){
        let bTree = new BTree(),
            testVal = 0;

        bTree.behaviour('test')
            .priority(0)
            .entryCondition(".this.is.a.test")
            .waitCondition(".this.is.another!test")
            //.failCondition(".a.fail.test")
            .type("seq")
            //.children("test2.p4, test3.p1")
            .entryAction(function(ctx){
                console.log("entering test action");
            })
            .performAction(function(ctx){
                console.log("performing test action");
            })
            .exitAction(function(ctx){
                console.log("exiting test action");
            })
            .value('spec',5);

        bTree.behaviour('test2')
            .entryCondition(".this.is.a.test")
            .waitCondition(".this.is.another.test")
            .entryAction(function(ctx){
                console.log("test2 entry");
            })
            .performAction(function(ctx){
                console.log('blaaaah');
            });
        
        console.log("adding child");
        bTree.root.addChild('test');
        bTree.root.addChild('test2');
        console.log("update 1");
        bTree.update();
        bTree.update();

        test.done();
    },
    

};

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
        test.ok(_.keys(bTree.behaviourLibrary).length === 0);
        test.ok(_.keys(bTree.allRealNodes).length === 1);
        test.ok(bTree.conflictSet.size === 1);
        test.done();
    },

    addBehaviour : function(test){
        let bTree = new BTree();
        test.ok(_.keys(bTree.behaviourLibrary).length === 0);
        bTree.behaviour('blah');
        test.ok(_.keys(bTree.behaviourLibrary).length === 1);
        test.done();
    },

    //add duplicate behaviour
    addSecondBehaviour : function(test){
        let bTree = new BTree();
        test.ok(_.keys(bTree.behaviourLibrary).length === 0);
        bTree.behaviour('blah');
        test.ok(_.keys(bTree.behaviourLibrary).length === 1);
        bTree.behaviour('blah');
        test.ok(_.keys(bTree.behaviourLibrary).length === 1);
        test.ok(bTree.behaviourLibrary['blah'].length === 2);
        test.done();
    },
    
    //add a different behaviour
    addDifferentBehaviour : function(test){
        let bTree = new BTree();
        test.ok(_.keys(bTree.behaviourLibrary).length === 0);
        bTree.behaviour('blah');
        test.ok(_.keys(bTree.behaviourLibrary).length === 1);
        bTree.behaviour('bloo');
        test.ok(_.keys(bTree.behaviourLibrary).length === 2);
        test.done();
    },
    
    //check return is 'monad'
    checkForReturnMonad : function(test){
        let bTree = new BTree(),
            behaviour = bTree.behaviour('blah');
        test.ok(behaviour instanceof bTree.BehaviourMonad);
        test.ok(behaviour.behaviours.length === 1);
        test.ok(_.first(behaviour.behaviours) instanceof bTree.BehaviourAbstract);
        test.done();
    },
    
    //----------
    abstractBehaviourDefinition : function(test){
        let bTree = new BTree(),
            behaviour = bTree.behaviour('blah').behaviours[0];
        test.ok(behaviour !== undefined);
        test.done();
    },

    setSpecificity : function(test){
        let bTree = new BTree(),
            b1 = bTree.behaviour('b1'),
            b2 = bTree.behaviour('b1'),
            b3 = bTree.behaviour('b1');

        test.ok(b1.behaviours[0].specificity === 0);
        test.ok(b2.behaviours[0].specificity === 0);
        test.ok(b3.behaviours[0].specificity === 0);
        
        b1.specificity(-1);
        b2.specificity(10);
        b3.specificity(5);

        test.ok(b1.behaviours[0].specificity === -1);
        test.ok(b2.behaviours[0].specificity === 10);
        test.ok(b3.behaviours[0].specificity === 5);
        test.done();
    },

    checkSpecificitySorting : function(test){
        let bTree = new BTree(),
            b1 = bTree.behaviour('b1'),
            b2 = bTree.behaviour('b1'),
            b3 = bTree.behaviour('b1'),
            group = bTree.behaviourLibrary['b1'];

        test.ok(b1.behaviours[0].specificity === 0);
        test.ok(b2.behaviours[0].specificity === 0);
        test.ok(b3.behaviours[0].specificity === 0);
        
        b1.specificity(-1);
        b2.specificity(10);
        b3.specificity(5);

        test.ok(b1.behaviours[0].specificity === -1);
        test.ok(b2.behaviours[0].specificity === 10);
        test.ok(b3.behaviours[0].specificity === 5);

        test.ok(group[0].id === b1.behaviours[0].id);
        test.ok(group[1].id === b2.behaviours[0].id);
        test.ok(group[2].id === b3.behaviours[0].id);
        
        bTree.sortBehaviours();

        test.ok(group[0].id === b2.behaviours[0].id);
        test.ok(group[1].id === b3.behaviours[0].id);
        test.ok(group[2].id === b1.behaviours[0].id);
        test.done();
    },
        
    //check:
    ////priority

    ////specificity

    ////entryCondition

    ////waitcondition

    ////failcondition

    ////entryaction

    ////performaction

    ////exitaction

    ////children

    ////value

    ////type


    //----------
    //check real node:

    //current abstract based on specificity

    //values

    //children

    //defult status, return status, lastReturnStatus

    //update of parent, conflictset

    //shift to next specificty

    //SEQ update

    //CHO update

    //PAR update

    //add child

    //----------
    //BTree

    //conflict set update

    //fact base

    //get abstracts

        
    //assert facts to bTree


    //----------


    //test conditions

    //update test

    //sort behaviours test

    
    //add a simple leaf behaviour
    addBehaviourLeaf : function(test){
        let bTree = new BTree(),
            testVal = [];            

        bTree.behaviour('test')
            .priority(0)
            //.entryCondition(".this.is.a.test")
            //.waitCondition(".this.is.another!test")
            //.failCondition(".a.fail.test")
            .type("seq")
            //.children("test2.p4, test3.p1")
            .entryAction(function(ctx){
                testVal.push("test entry");
            })
            .performAction([function(ctx){
                testVal.push("test perform");
            }])
            .exitAction(function(ctx){
                testVal.push("test exit");
            })
            .value('spec',5);

        bTree.behaviour('test2')
            //.entryCondition(".this.is.a.test")
            //.waitCondition(".this.is.another.test")
            .entryAction(function(ctx){
                testVal.push("test2 entry");
            })
            .performAction([function(ctx){
                testVal.push("test2 perform");
            }])
            .exitAction(function(ctx){
                testVal.push("test2 exit");
            });

        test.ok(testVal.length === 0)
        bTree.root.addChild('test');
        test.ok(testVal[0] === 'test entry');
        bTree.root.addChild('test2');
        test.ok(testVal[1] === 'test2 entry');
        bTree.update();
        bTree.update();

        test.done();
    },
    

};

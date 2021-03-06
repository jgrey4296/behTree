/* jshint esversion : 6 */
"use strict";
var BTree = require('./bTreeSimple'),
    _ = require('lodash');

module.exports = {

    //check the ctor works
    init : function(test){
        let bTree = new BTree();
        test.ok(bTree !== undefined);
        test.ok(bTree.root !== undefined);
        test.ok(bTree.behaviourLibrary !== undefined);
        test.ok(_.keys(bTree.behaviourLibrary).length === 1);
        test.ok(_.keys(bTree.allRealNodes).length === 1);
        test.ok(bTree.conflictSet.size === 1);
        test.done();
    },

    //add a basic behaviour
    addBehaviour : function(test){
        let bTree = new BTree();
        test.ok(_.keys(bTree.behaviourLibrary).length === 1);
        bTree.Behaviour('blah');
        test.ok(_.keys(bTree.behaviourLibrary).length === 2);
        test.done();
    },

    //add duplicate behaviour
    addSecondBehaviour : function(test){
        let bTree = new BTree();
        test.ok(_.keys(bTree.behaviourLibrary).length === 1);
        bTree.Behaviour('blah');
        test.ok(_.keys(bTree.behaviourLibrary).length === 2);
        bTree.Behaviour('blah');
        test.ok(_.keys(bTree.behaviourLibrary).length === 2);
        test.ok(bTree.behaviourLibrary['blah'].length === 2);
        test.done();
    },
    
    //add a different behaviour
    addDifferentBehaviour : function(test){
        let bTree = new BTree();
        test.ok(_.keys(bTree.behaviourLibrary).length === 1);
        bTree.Behaviour('blah');
        test.ok(_.keys(bTree.behaviourLibrary).length === 2);
        bTree.Behaviour('bloo');
        test.ok(_.keys(bTree.behaviourLibrary).length === 3);
        test.done();
    },
    
    //check return is 'monad'
    checkForReturnMonad : function(test){
        let bTree = new BTree(),
            behaviour = bTree.Behaviour('blah');
        test.ok(behaviour instanceof bTree.BehaviourMonad);
        test.ok(behaviour.behaviours.size === 1);
        test.ok(_.first(Array.from(behaviour.behaviours)) instanceof bTree.BehaviourAbstract);
        test.done();
    },
    
    //----------
    //get the behaviour abstract from inside the monad
    abstractBehaviourDefinition : function(test){
        let bTree = new BTree(),
            behaviourM = bTree.Behaviour('blah'),
            behaviourAbstract = behaviourM.toArray()[0];
        test.ok(behaviourAbstract !== undefined);
        test.done();
    },

    setPreference : function(test){
        let bTree = new BTree(),
            b1 = bTree.Behaviour('b1'),
            b2 = bTree.Behaviour('b1'),
            b3 = bTree.Behaviour('b1');

        test.ok(b1.toArray()[0].preference === 0);
        test.ok(b2.toArray()[0].preference === 0);
        test.ok(b3.toArray()[0].preference === 0);
        b1.preference(-1);
        b2.preference(10);
        b3.preference(5);
        test.ok(b1.toArray()[0].preference === -1);
        test.ok(b2.toArray()[0].preference === 10);
        test.ok(b3.toArray()[0].preference === 5);
        test.done();
    },

    checkSpecificitySorting : function(test){
        let bTree = new BTree(),
            b1 = bTree.Behaviour('b1'),
            b2 = bTree.Behaviour('b1'),
            b3 = bTree.Behaviour('b1'),
            group = bTree.behaviourLibrary['b1'];

        test.ok(Array.from(b1.behaviours)[0].preference === 0);
        test.ok(Array.from(b2.behaviours)[0].preference === 0);
        test.ok(Array.from(b3.behaviours)[0].preference === 0);
        
        b1.preference(-1);
        b2.preference(10);
        b3.preference(5);

        test.ok(Array.from(b1.behaviours)[0].preference === -1);
        test.ok(Array.from(b2.behaviours)[0].preference === 10);
        test.ok(Array.from(b3.behaviours)[0].preference === 5);

        test.ok(group[0].id === Array.from(b1.behaviours)[0].id);
        test.ok(group[1].id === Array.from(b2.behaviours)[0].id);
        test.ok(group[2].id === Array.from(b3.behaviours)[0].id);
        
        bTree.sortBehaviours();

        test.ok(group[0].id === Array.from(b2.behaviours)[0].id);
        test.ok(group[1].id === Array.from(b3.behaviours)[0].id);
        test.ok(group[2].id === Array.from(b1.behaviours)[0].id);
        test.done();
    },
    
    //check:
    ////priority
    prioritySetCheck : function(test){
        let bTree = new BTree(),
            b1 = bTree.Behaviour('b1'),
            b2 = bTree.Behaviour('b2');

        //combine the two monads
        b1.add(b2);
        test.ok(Array.from(b1.behaviours)[0].priority === 0);
        test.ok(Array.from(b1.behaviours)[0].priority === 0);
        b1.priority(5);
        test.ok(Array.from(b1.behaviours)[0].priority === 5);
        test.ok(Array.from(b1.behaviours)[1].priority === 5);
        test.done();
    },
    
    ////specificity
    preferenceCheck : function(test){
        let bTree = new BTree(),
            b1 = bTree.Behaviour('b1'),
            b2 = bTree.Behaviour('b2');

        //combine the two monads
        b1.add(b2);
        let behaviourArray = Array.from(b1.behaviours);
        test.ok(behaviourArray[0].preference === 0);
        test.ok(behaviourArray[1].preference === 0);
        b1.preference(5);
        test.ok(behaviourArray[0].preference === 5);
        test.ok(behaviourArray[1].preference === 5);
        test.done();
    },
    
    //TODO:checks to set conditions, actions, children etc would be a good idea

    shouldFail_Condition_check : function(test){
        let failValue = 0,
            bTree = new BTree(),
            b1 = bTree.Behaviour('test_to_fail'),
            b2 = bTree.Behaviour('test_to_succeed');
        b1.failCondition(".this.condition.should.activate.failure?")
            .failAction(function(ctx){
                failValue = 5;
            });
        b2.failCondition(".this.condition.should.not.activate.failure?")
            .failAction(function(ctx){
                failValue = 10;
            });
        bTree.fb.parse(".this.condition.should.activate.failure");
        bTree.root.addChild('test_to_succeed','test_to_fail');
        test.ok(failValue === 0);
        bTree.update();//check the failure doesnt activate
        test.ok(failValue === 0,failValue);
        bTree.update();//check the failure does activate
        test.ok(failValue = 5);
        test.done();
    },

    shouldWait_test : function(test){
        let performVal = 0,
            bTree = new BTree(),
            b1 = bTree.Behaviour('waitTest');
        b1.waitCondition(".should.cause.a.wait?");
        b1.performAction(function(ctx){
            performVal = 5;
        });

        bTree.root.addChild('waitTest');
        bTree.fb.parse('.should.cause.a.wait');
        for(let i = 0; i < 5; i++){
            bTree.update();
            test.ok(performVal === 0);
        };
        bTree.fb.parse('!!.should.cause.a.wait');
        bTree.update();
        test.ok(performVal === 5,performVal);
        test.done();
    },

    parallel_test : function(test){
        let performValA = 0,
            performValB = 0,
            bTree = new BTree(),
            b1 = bTree.Behaviour('testParallel'),
            b2 = bTree.Behaviour('subBehaviour1'),
            b3 = bTree.Behaviour('subBehaviour2');
        b1.type('parallel')
            .subgoal('subBehaviour1','subBehaviour2');
        b2.performAction(ctx=>performValA = 5);
        b3.performAction(ctx=>performValB = 10);
        bTree.root.addChild('testParallel');
        test.ok(_.keys(bTree.root.children).length === 1);
        bTree.update();//activates the parallel, adding children
        test.ok(bTree.conflictSet.size === 2);
        test.ok(performValA === 0);
        test.ok(performValB === 0);
        bTree.update(); //activates one of the children
        test.ok(bTree.conflictSet.size === 1);
        //only one should have fired
        test.ok(!(performValA === 5 && performValB === 10));
        test.ok(performValA === 5 || performValB === 10);
        //then fire the other one:
        bTree.update();
        //both should have fired now
        test.ok(performValA === 5 && performValB === 10);
        test.done();
    },

    conflictSet_selection_size_priority_test : function(test){
        let testVal = 0,
            bTree = new BTree(),
            b1 = bTree.Behaviour('toBeSelected'),
            b2 = bTree.Behaviour('toBeIgnored');
        //for the activation of the highest priority option
        bTree.conflictSetSelectionSize = 1;
        //set priorities and actions
        b1.priority(5)
            .performAction(ctx=>testVal = 5);
        b2.performAction(ctx=>testVal = 10);
        //add
        bTree.root.addChild('toBeSelected').addChild('toBeIgnored');
        test.ok(bTree.conflictSet.size === 2);
        bTree.update();
        test.ok(testVal === 5);
        test.done();
    },


    persistentCheck : function(test){
        let testVal = 0,
            referenceVal = 0,
            bTree = new BTree(),
            b1 = bTree.Behaviour('testPersistent');

        b1.persistent(true)
            .persistCondition(".a.persistent.condition?")
            .performAction(ctx=>testVal += 5);
        bTree.root.addChild('testPersistent');
        bTree.fb.parse(".a.persistent.condition");
        test.ok(b1.toArray()[0].persistent === bTree.persistenceTypes.defaultPersistence);
        
        //run the btree repeatedly.
        //refence val and testval should increment together
        for(let i = 0; i < 10; i++){
            referenceVal += 5;
            bTree.update();
            test.ok(testVal === referenceVal);
        }
        //retract, failing the persist condition:
        bTree.fb.parse("!!.a.persistent.condition");
        //should exist for one more update, then testVal and referenceVal should stay static
        referenceVal += 5;
        test.ok(bTree.conflictSet.size === 1);
        bTree.update();//behaviour is removed here
        test.ok(testVal === referenceVal);
        test.ok(bTree.conflictSet.size === 1);//nothing remains on the active tree but the initial tree
        bTree.update();
        test.ok(testVal === referenceVal);
        test.done();
    },

    preference_check : function(test){
        let testVal = 0,
            bTree = new BTree(),
            b1 = bTree.Behaviour('testSpecificity'),
            b2 = bTree.Behaviour('testSpecificity');
        b1.preference(5)
            .performAction(ctx=>testVal = 5);
        b2.preference(2)
            .performAction(ctx=>testVal = 10);

        bTree.root.addChild('testSpecificity');
        test.ok(testVal === 0);
        bTree.update();
        test.ok(testVal === 5);        
        test.done();
    },
    
    preference_fallback_check : function(test){
        let testVal = 0,
            bTree = new BTree(),
            b1 = bTree.Behaviour('testSpecificity'),
            b2 = bTree.Behaviour('testSpecificity');
        b1.preference(5)
            .entryCondition(".this.will.fail?")
            .performAction(ctx=>testVal = 5);
        b2.preference(2)
            .performAction(ctx=>testVal = 10);

        bTree.root.addChild('testSpecificity');
        test.ok(testVal === 0);
        bTree.update();
        test.ok(testVal === 10);        
        test.done();
    },


    specificity_persistent_fallback_check : function(test){
        let testVal = 0,
            entryConditionString = ".this.will.fail.initially",
            bTree = new BTree(),
            b1 = bTree.Behaviour('testSpecificity'),
            b2 = bTree.Behaviour('testSpecificity');
        b1.preference(5)
            .entryCondition(entryConditionString + '?')
            .performAction(ctx=>testVal = 5)
            .persistent(true);
        b2.preference(2)
            .performAction(ctx=>testVal = 10)
            .persistent(true);
        //first check the fallback:
        //bTree.fb.parse(entryConditionString);
        bTree.root.addChild('testSpecificity');
        test.ok(testVal === 0);
        //assert ready for the re-add
        bTree.fb.parse(entryConditionString);
        bTree.update();
        test.ok(testVal === 10);
        //retract for the re-add
        bTree.fb.parse('!!'+entryConditionString);
        bTree.update();
        test.ok(testVal === 5);
        //and back again
        bTree.fb.parse(entryConditionString);
        bTree.update();
        test.ok(testVal === 10);
        test.done();
    },
    
    
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

    entryConditionTest : function(test){
        let testArray = [],
            bTree = new BTree(),
            b1 = bTree.Behaviour('test')
            .entryCondition(".this.is.a.test?")
            .entryAction(function(ctx){
                testArray.push('test entry');
            }),
            b2 = bTree.Behaviour('test2')
            .entryCondition(".this.should.fail?")
            .entryAction(function(ctx){
                testArray.push("test2 entry");
            });
        bTree.fb.parse(".this.is.a.test");
        test.ok(testArray.length === 0);
        bTree.root.addChild('test');
        test.ok(testArray.length == 1);
        test.ok(testArray[0] === 'test entry');
        //test.throws(function(){
        //    bTree.root.addChild('test2');
        //});
        test.ok(testArray.length === 1);
        test.done();
    },

    //fail test:
    failConditionTest : function(test){
        let testArray = [],
            bTree = new BTree(),
            b1 = bTree.Behaviour('test1')
            .failCondition(".this.should.fail")
            .failAction(function(ctx){
                testArray.push('test1 failed');
            });
        bTree.fb.parse(".this.should.fail");
        
        test.ok(testArray.length === 0);
        bTree.root.addChild('test1');
        bTree.update();
        test.ok(testArray.length === 1);
        test.ok(testArray[0] === 'test1 failed');
        test.done();
    },
    
    //update test

    //sort behaviours test

    
    //add a simple leaf behaviour
    addBehaviourLeaf : function(test){
        let bTree = new BTree(),
            testVal = [];            
        bTree.fb.parse(".this.is.a.test");
        bTree.fb.parse(".this.is.another!test");
        bTree.Behaviour('test')
            .priority(0)
            .type("seq")
            .entryAction(function(ctx){
                testVal.push("test entry");
            })
            .performAction(function(ctx){
                testVal.push("test perform");
            })
            .exitAction(function(ctx){
                testVal.push("test exit");
            })
            .value('spec',5);

        bTree.Behaviour('test2')
            .entryAction(function(ctx){
                testVal.push("test2 entry");
            })
            .performAction(function(ctx){
                testVal.push("test2 perform");
            })
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

    persistent_behaviour_check : function(test){
        let bTree = new BTree(undefined,undefined,{
            count : 0
        }),
            testVal = [];
        bTree.Behaviour('persistentCheck')
            .persistent(true)
            .persistCondition('!!.persistent.finished?')
            .performAction((a,n)=>{
                a.values.count++;
                if(a.values.count >= 5){
                    a.fb.parse('.persistent.finished');
                }
                testVal.push(1);
            });
        bTree.root.addChild('persistentCheck');
        for(let i = 0; i < 10; i++){
            bTree.update();
        }
        test.ok(testVal.length === 5,testVal.length);
        test.done();
    },

    sequential_persistent_nesting : function(test){
        let testVal = 0,
            bTree = new BTree();
        bTree.Behaviour('topSequentialBehaviour')
            .type('sequential')
            .persistent(true)
            .subgoal('theSetup','theBody','theTearDown');

        bTree.Behaviour('theSetup')
            .performAction(a=>testVal = 100,a=>a.fb.parse(".should.persist"));

        bTree.Behaviour('theBody')
            .persistent(true)
            .persistCondition(".should.persist?","!!.has.finished?")
            .performAction(a=>{
                if(testVal < 110){
                    testVal += 2;
                }else{
                    a.fb.parse("!!.should.persist");
                    a.fb.parse(".has.finished");;
                }
            });

        bTree.Behaviour('theTearDown')
            .entryCondition(".has.finished?")
            .performAction(a=>{
                a.fb.parse("!!.has.finished");
                testVal = 200;
            });

        bTree.root.addChild("topSequentialBehaviour");
        //update to add theSetup
        bTree.update();
        //update to perform theSetup
        bTree.update();
        test.ok(testVal === 100);
        test.ok(bTree.fb.parse(".should.persist?"));
        //loop for the increments from 100 to 110
        for(let a = 100; a < 110;){
            bTree.update();
            a += 2;
            test.ok(testVal === a,testVal);
        }
        test.ok(testVal === 110);
        //update retract/assert:
        bTree.update();
        test.ok(bTree.fb.parse("!!.should.persist?"));
        test.ok(bTree.fb.parse(".has.finished?"));
        //update to perform theTearDown
        bTree.update();
        test.ok(bTree.fb.parse(["!!.has.finished?",
                                "!!.should.persist?"]));
        //update to perform the topLevel, add the setup:
        bTree.update();
        bTree.update();
        test.ok(testVal === 100);
        test.ok(bTree.fb.parse(".should.persist?"));
        test.done();
    },


    parallel_priority_test : function(test){
        let testVal = 0,
            bTree = new BTree();

        bTree.conflictSetSelectionSize = 1;
        
        bTree.Behaviour('parPriorTest')
            .type('parallel')
            .subgoal('p1','p2','p3');

        bTree.Behaviour('p1')
            .priority(1)
            .performAction(a=>testVal = 1);

        bTree.Behaviour('p2')
            .priority(2)
            .performAction(a=>testVal = 2);

        bTree.Behaviour('p3')
            .priority(3)
            .performAction(a=>testVal = 3);

        bTree.root.addChild('parPriorTest');
        //update to add the behaviours:
        bTree.update();
        test.ok(bTree.conflictSet.size === 3);
        test.ok(testVal === 0,testVal);
        //update to perform first behaviour:
        bTree.update();
        test.ok(testVal === 3,testVal);
        //second behaviour:
        bTree.update();
        test.ok(testVal === 2,testVal);
        //third behaviour
        bTree.update();
        test.ok(testVal === 1,testVal);
        
        test.done();
    },

    real_node_parent_test : function(test){
        let parentVal = null,
            parentVal_fromChild = null,
            bTree = new BTree();

        bTree.Behaviour('testParent')
            .subgoal('testChild')
            .performAction((c,n)=>parentVal = n);

        bTree.Behaviour('testChild')
            .performAction((c,n)=>{
                parentVal_fromChild = n.parent;
            });

        bTree.root.addChild('testParent');
        //update to perform testParent
        bTree.update();
        //update to perform testChild
        bTree.update();
        
        test.ok(parentVal_fromChild !== null);
        test.ok(parentVal_fromChild.id === parentVal.id);
        
        test.done();
    },

    multi_behaviour_parameter_specification : function(test){
        let bTree = new BTree(),
            behaviour = bTree.Behaviour('test')
            .entryCondition('.this.is.one.test',
                            '.this.is.a.second.test');
        
        test.ok(behaviour.toArray()[0].conditions.entry.length === 2);
        behaviour.entryCondition('.this.is.a.third.test');
        test.ok(behaviour.toArray()[0].conditions.entry.length === 3);
        behaviour.entryCondition();
        test.ok(behaviour.toArray()[0].conditions.entry.length === 0);                
        test.done();
    },

    binding_test : function(test){
        let testVal = null,
            bTree = new BTree();
        bTree.Behaviour('testBindingBehaviour')
            .entryCondition('.should.bind.[1]->x?')
            .performAction((d,n)=>{
                testVal = n.bindings.x;
            });
        test.ok(testVal === null);
        bTree.fb.parse('.should.bind.blah');
        bTree.root.addChild('testBindingBehaviour');
        //perform the binding behaviour
        bTree.update();
        test.ok(testVal === 'blah');        
        test.done();
    },

    binding_number : function(test){
        let testVal = null,
            bTree = new BTree();
        bTree.Behaviour('testBindingNum')
            .entryCondition('.should.bind.[1]->x?')
            .performAction((d,n)=>{
                testVal = n.bindings.x;
            });
        bTree.fb.parse(".should.bind.5");
        bTree.root.addChild('testBindingNum');
        test.ok(testVal === null);
        bTree.update();
        test.ok(Number(testVal) === 5);
        testVal++;
        test.ok(testVal === 6);
        test.done();
    },
    
    priorityCondition_eval_test : function(test){
        let testVal = null,
            bTree = new BTree();

        bTree.conflictSetSelectionSize = 1;
        
        bTree.Behaviour('testParallel')
            .type('parallel')
            .subgoal('shouldRunFirst','shouldRunSecond');

        bTree.Behaviour('shouldRunFirst')
            .priorityCondition(".this.should.trigger?#10/0")
            .performAction(d=>testVal = "first");                

        bTree.Behaviour('shouldRunSecond')
            .priorityCondition(".this.should.trigger.less?#2/0")
            .performAction(d=>testVal = "second");

        bTree.fb.parse(".this.should.trigger.less");
        bTree.root.addChild("testParallel");
        //update to add the two sub behaviours
        bTree.update();
        //update to fire the first
        bTree.update();
        test.ok(testVal === "first");
        //update to fire the second
        bTree.update();
        test.ok(testVal === "second");        
        test.done();
    },

    second_priorityCondition_eval_test : function(test){
        let testVal = null,
            bTree = new BTree();

        bTree.conflictSetSelectionSize = 1;
        
        bTree.Behaviour('testParallel')
            .type('parallel')
            .subgoal('shouldRunFirst','shouldRunSecond');

        bTree.Behaviour('shouldRunFirst')
            .priorityCondition(".this.should.trigger?#10/0",
                              ".this.should.fail?#0/-200")
            .performAction(d=>testVal = "first");                

        bTree.Behaviour('shouldRunSecond')
            .priorityCondition(".this.should.trigger.less?#2/0")
            .performAction(d=>testVal = "second");

        bTree.fb.parse(".this.should.trigger.less");
        bTree.root.addChild("testParallel");
        //update to add the two sub behaviours
        bTree.update();
        //update to fire the first
        bTree.update();
        test.ok(testVal === "second");
        //update to fire the second
        bTree.update();
        test.ok(testVal === "first");        
        test.done();
    },

    //entry conditions are NOT run on persistence, only on initial add to tree
    persist_entry_condition_test : function(test){
        let entryVal = 0,
            performVal = 0,
            bTree = new BTree(),
            b1 = bTree.Behaviour('testPersistentEntry');

        //bTree.setDebugFlags('addChild','conflictSet');
        
        b1.entryCondition(`.test.entry?`)
            .entryAction(()=>entryVal += 5)
            .persistent(true)
            .performAction(()=>performVal += 5);

        bTree.fb.parse('.test.entry');
        bTree.root.addChild('testPersistentEntry');
        bTree.update();
        test.ok(entryVal === 5);
        test.ok(performVal === 5);
        //and another go:
        bTree.update();
        test.ok(entryVal === 5);
        test.ok(performVal === 10);
        test.done();
    },
    
    subGoals_occur_after_performance : function(test){
        let performValue = 0,
            subgoalValue = 0,
            bTree = new BTree(),
            b1 = bTree.Behaviour('topLevel'),
            b2 = bTree.Behaviour('subLevel');

        b1.performAction((a,n)=>performValue = 5)
            .subgoal('subLevel');
        b2.performAction((a,n)=>subgoalValue = 5);

        test.ok(performValue === 0);
        test.ok(subgoalValue === 0);
        bTree.root.addChild('topLevel');
        bTree.update();
        test.ok(performValue === 5);
        test.ok(subgoalValue === 0);
        bTree.update();
        test.ok(performValue === 5);
        test.ok(subgoalValue === 5);
        test.done();
    },

    //Check behaviours can fail/stop from context conditions
    context_condition_check : function(test){
        let testVal = 0,
            contextVal = 5,
            bTree = new BTree(),
            b1 = bTree.Behaviour('contextConditionTest');

        b1.persistent('fail')
            .contextCondition(()=>{
                return contextVal === 5;
            })
            .contextType('fail')
            .performAction((a,n)=>testVal += 5);

        test.ok(bTree.contextConditions.size === 0);        
        bTree.root.addChild('contextConditionTest');
        test.ok(bTree.contextConditions.size === 1);
        bTree.update();
        test.ok(testVal === 5);
        bTree.update();
        test.ok(testVal === 10);
        contextVal = 10;
        bTree.update();
        test.ok(testVal === 10,testVal);
        test.done();
    },

    //verify that a child of a node with a context condition will be cleaned up
    //when the context condition fails
    context_condition_invalidates_children : function(test){
        let testVal = 0,
            contextVal = 0,
            failVal = 0,
            bTree = new BTree(),
            b1 = bTree.Behaviour('topContextTest'),
            b2 = bTree.Behaviour('childContextTest');

        b1.contextType('fail')
            .contextCondition(()=>contextVal === 0)
            .subgoal('childContextTest')
            .failAction((a,n)=>{
                failVal = 666;
            });

        b2.persistent(true)
            .performAction((a,n)=>{
                testVal += 5;
            });
        
        bTree.root.addChild('topContextTest');
        test.ok(bTree.contextConditions.size === 1);
        bTree.update();
        test.ok(testVal === 0);
        bTree.update();
        test.ok(testVal === 5);
        bTree.update();
        test.ok(testVal === 10);
        test.ok(failVal === 0);
        contextVal = 5;
        bTree.update();
        test.ok(testVal === 10);
        test.ok(failVal === 666);
        test.done();
    },

    //check a context condition failing can succeed a node with contextType success:
    context_succeed_check : function(test){
        let testVal = 0,
            contextVal = 0,
            bTree = new BTree(),
            b1 = bTree.Behaviour('contextTest');

        b1.persistent(true)
            .contextType('success')
            .contextCondition(()=>contextVal === 0)
            .performAction((a,n)=>testVal += 5)
            .exitAction((a,n)=>{
                testVal = 666;
            })
            .failAction((a,n)=>{
                testVal = 123;
            });

        bTree.root.addChild('contextTest');
        test.ok(testVal === 0);
        bTree.update();
        test.ok(testVal === 5);
        bTree.update();
        test.ok(testVal === 10);
        contextVal = 100;
        bTree.update();
        test.ok(testVal === 666,testVal);
        test.done();
    },
    
    //todo: check conditions are called with agent and node passed in
    conditionParamCheck : function(test){
        //5 condition types, a pair in each. entry conditions run twice (so persistent fire too)
        test.expect(12);
        let values = { name : 'bob' },
            bTree = new BTree(undefined,undefined,values),
            b1 = bTree.Behaviour('parameterCheck');

        //entry
        b1.entryCondition((a,n)=>{
            test.ok(a.values.name === values.name);
            test.ok(n !== undefined);
            return true;
        })
        //persistent
            .persistent(true)
            .persistCondition((a,n)=>{
                test.ok(a.values.name === values.name);
                test.ok(n !== undefined);
                return true;
            })
        //wait
            .waitCondition((a,n)=>{
                test.ok(a.values.name === values.name);
                test.ok(n !== undefined);
                return false;
            })
        //fail
            .failCondition((a,n)=>{
                test.ok(a.values.name === values.name);
                test.ok(n !== undefined);
                return false;
            })
        //context
            .contextCondition((a,n)=>{
                test.ok(a.values.name === values.name);
                test.ok(n !== undefined);
                return true;
            });
        bTree.root.addChild('parameterCheck');
        bTree.update();
        test.done();
    },
    
    //todo: check wait conditions
};

/* jshint esversion : 6 */
"use strict global";
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['underscore'],function(_){

    //arrays of construction functions of behaviours:
    var BehaviourModule = [];

    //initial tree
    BehaviourModule.push(function(bTree){
        console.log("Loading initial tree");
        bTree.Behaviour('initialTree')
            .children('initialBehaviour','secondBehaviour');
    });

    //initial behaviour
    BehaviourModule.push(function(bTree){
        console.log("Loading initial Behaviour");
        bTree.Behaviour('initialBehaviour')
            .entryAction(function(ctx){
                if(ctx.values.name === 'bob'){
                    ctx.fb.assert(`.initialBehaviour.${ctx.values.name}`);
                    console.log(`.initialBehaviour.${ctx.values.name} entry`);
                }else{
                    ctx.fb.assert(`.initialBehaviour`);
                    console.log(`.initialBehaviour non-specific entry`);
                }
            })
            .performAction(function(ctx){
                console.log("initial behaviour performing");
            })
            .exitAction(function(ctx){
                console.log("initial behaviour exiting");
            });
    });

    //second behaviour v1
    BehaviourModule.push(function(bTree){
        console.log("Loading second behaviour");
        bTree.Behaviour('secondBehaviour')
            .specificity(5)
            .entryCondition(d=>`.initialBehaviour.${d.values.name}`)
            .performAction(function(ctx){
                ctx.fb.assert(`.secondBehaviour.${ctx.values.name}`);
                console.log(`.secondBehaviour.${ctx.values.name} (perform)`);
            })
            .children("testChildBehaviour","testChildBehaviour")
            .exitAction(d=>console.log("secondBehaviour exit"));
        
    });

    //second behaviour v2
    BehaviourModule.push(function(bTree){
        console.log("Loading alt second behaviour");
        bTree.Behaviour('secondBehaviour')
            .specificity(0)
            .performAction(function(ctx){
                ctx.fb.assert(`.secondBehaviour.alt.${ctx.values.name}`);
                console.log(`.secondBehaviour.alt.${ctx.values.name} (perform)`);
            })
            .exitAction(d=>console.log("alt second behaviour exit"));
    });

    //testChildBehaviour
    BehaviourModule.push(function(bTree){
        bTree.Behaviour('testChildBehaviour')
            .performAction(ctx=>console.log("test child behaviour"));
    });
    
    return BehaviourModule;
});

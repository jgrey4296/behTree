/* jshint esversion : 6 */
"use strict global";
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['underscore'],function(_){

    //arrays of construction functions of behaviours:
    var BehaviourModule = [];

    BehaviourModule.push(function(bTree){
        console.log("Loading initial tree");
        bTree.Behaviour('initialTree')
            .children('initialBehaviour','secondBehaviour');
    });
    
    BehaviourModule.push(function(bTree){
        console.log("Loading initial Behaviour");
        bTree.Behaviour('initialBehaviour')
            .entryAction(function(ctx){
                if(ctx.values.name === 'bob'){
                    ctx.fb.assert(`.initialBehaviour.${ctx.values.name}`);
                    console.log(`.initialBehaviour.${ctx.values.name}`);
                }
            });
    });

    BehaviourModule.push(function(bTree){
        console.log("Loading second behaviour");
        bTree.Behaviour('secondBehaviour')
            .specificity(5)
            .entryCondition(d=>`.initialBehaviour.${d.values.name}`)
            .entryAction(function(ctx){
                ctx.fb.assert(`.secondBehaviour.${ctx.values.name}`);
                console.log(`.secondBehaviour.${ctx.values.name}`);
            });
    });

    BehaviourModule.push(function(bTree){
        console.log("Loading alt second behaviour");
        bTree.Behaviour('secondBehaviour')
            .specificity(0)
            .entryAction(function(ctx){
                ctx.fb.assert(`.secondBehaviour.alt.${ctx.values.name}`);
                console.log(`.secondBehaviour.alt.${ctx.values.name}`);
            });
    });
    
    return BehaviourModule;
});

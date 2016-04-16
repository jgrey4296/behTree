/* jshint esversion : 6 */
"use strict global";
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['underscore'],function(_){

    //arrays of construction functions of behaviours:
    var BMod = [];

    //initial tree
    BMod.push(function(bTree){
        bTree.Behaviour('initialTree')
            .type('parallel')
            .persistent(true)
            .children('move');
    });

    //Test non-specific move
    BMod.push(function(bTree){
        bTree.Behaviour('move')
            .entryCondition([`.locations.%{x}`,(d,n)=>`!!.${d.values.name}.location!${n.bindings.x}`])
            .performAction((ctx,n)=>{
                ctx.assert(`.${ctx.values.name}.location!${n.bindings.x}`);
                console.log(`Moving ${ctx.values.name} to ${n.bindings.x}`);
            });
        
    });
    
    return BMod;
});

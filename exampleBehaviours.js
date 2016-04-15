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

    BMod.push(function(bTree){
        bTree.Behaviour('move')//to kitchen
            .specificity(2)
            .persistent(true)
            .entryCondition([`.locations.kitchen`,d=>`!!.${d.values.name}.location!kitchen`])
            .entryAction(ctx=>console.log("(enter) move.s2"))
            .performAction(ctx=>ctx.assert(`.${ctx.values.name}.location!kitchen`));
    });

    BMod.push(function(bTree){
        bTree.Behaviour('move')//to diningRoom
            .specificity(5)
            .persistent(true)
            .entryCondition([`.locations.diningRoom`,d=>`!!.${d.values.name}.location!diningRoom`])
            .entryAction(ctx=>console.log("(enter) move.s5"))
            .performAction(ctx=>{
                ctx.assert(`.${ctx.values.name}.location!diningRoom`);
                console.log(`${ctx.values.name} Moving to dining room`);
            });
    });
                         
    
    
    return BMod;
});

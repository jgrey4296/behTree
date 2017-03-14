
//------------------------------------------------------------------------------
/**
   Behaviour Collection /monad for easy definition of abstract behaviours
   also allows setting of parameters of groups of behaviours at once
*/
class StatefulBehaviour {
    constructor(behaviours,btree){
        this.behaviours = new Set(behaviours);
        this.btree = btree;
    }
}

StatefulBehaviour.prototype.toArray = function(){
    return Array.from(this.behaviours);
}

//Add further behaviours to the monad:
StatefulBehaviour.prototype.add = function(behaviours){
    if(behaviours instanceof StatefulBehaviour){
        behaviours.behaviours.forEach(d=>this.behaviours.add(d));
    }else if(behaviours instanceof Array){
        behaviours.forEach(d=>this.behaviours.add(d));
    }else if(behaviours instanceof string){
        this.add(this.bTree.getAbstracts(behaviours));
    }        
};

//Apply the specified variables to the function of the btnodeabstract
StatefulBehaviour.prototype.applyTo = function(paramName,variables){
    //console.log("Applying:",paramName,variables);
    if(BTreeNodeAbstract.prototype[paramName] !== undefined){
        this.behaviours.forEach(function(d){
            BTreeNodeAbstract.prototype[paramName].apply(d,variables);
        });
    }
    return this;
};

StatefulBehaviour.prototype.contextCondition = function(...vars){
    return this.applyTo('contextCondition',vars);
};

StatefulBehaviour.prototype.contextType = function(...vars){
    return this.applyTo('contextType',vars);
};

StatefulBehaviour.prototype.persistent = function(...vars){
    return this.applyTo('persistent',vars);
};

StatefulBehaviour.prototype.preference = function(...vars){
    return this.applyTo('preference',vars);
};

StatefulBehaviour.prototype.priority = function(...vars){
    return this.applyTo('priority',vars);
};

StatefulBehaviour.prototype.type = function(...vars){
    return this.applyTo('type',vars);
};

StatefulBehaviour.prototype.entryCondition = function(...vars){
    return this.applyTo('entryCondition',vars);
};

StatefulBehaviour.prototype.waitCondition = function(...vars){
    return this.applyTo('waitCondition',vars);
};

StatefulBehaviour.prototype.failCondition = function(...vars){
    return this.applyTo('failCondition',vars);
};

StatefulBehaviour.prototype.persistCondition = function(...vars){
    return this.applyTo('persistCondition',vars);
};

StatefulBehaviour.prototype.priorityCondition = function(...vars){
    return this.applyTo('priorityCondition',vars);
};

StatefulBehaviour.prototype.entryAction = function(...vars){
    return this.applyTo('entryAction',vars);
};

StatefulBehaviour.prototype.performAction = function(...vars){
    return this.applyTo('performAction',vars);
};

StatefulBehaviour.prototype.exitAction = function(...vars){
    return this.applyTo('exitAction',vars);
};

StatefulBehaviour.prototype.failAction = function(...vars){
    return this.applyTo('failAction',vars);
};

StatefulBehaviour.prototype.subgoal = function(...vars){
    return this.applyTo('subgoal',vars);
};

StatefulBehaviour.prototype.value = function(...vars){
    return this.applyTo('value',vars);
};

StatefulBehaviour.prototype.tag = function(...vars){
    return this.applyTo('tag',vars);
}

export { StatefulBehaviour };

import { BTreeEnums } from './BTreeEnums';

/**
   An Abstract description of a behaviour, stored in the library
*/
class BTreeNodeAbstract {
    constructor(name){
        this.id = gid++;
        this.name = name || "anon";
        //Behaviour parameters
        this.type =  BTreeEnums.SEQUENTIAL;
        this.tags = new Set();
        this.values = new Map(); //maxFailNum,minSuccessNum
        this.priority = 0;
        this.preference = 0;
        this.persistent = false;
        //whether context fails or succeeds the behaviour:
        //default to fail
        this.contextType = BTreeEnums.FAIL;
        //Specificity isnt to be modified manually, but auto-calculated
        this.specificity = 0;
        //names to be reified, in order of execution type
        this.subgoals = [];
        
        //----------
        this.conditions = {};
        this.conditions.entry = [];
        this.conditions.wait = [];
        this.conditions.fail = [];
        this.conditions.persist = [];
        this.conditions.context = [];
        this.conditions.priority = [];
        //
        this.actions = {};
        this.actions.entry = [];
        this.actions.perform = [];
        this.actions.exit = [];
        this.actions.fail = [];
        //----------
    }
}

BTreeNodeAbstract.prototype.calculateSpecificity = function(){
    this.specificity = _.values(this.conditions).reduce(function(m,v){
        return m + v.length;
    },0);
};

//Setters / Clearers
BTreeNodeAbstract.prototype.persistent = function(b){
    if(b === undefined || b === false){
        this.persistent = false;
    }else if(b === true){
        this.persistent = BTreeEnums.PERSIST;
    }else if(b.match(/success/)){
        this.persistent = BTreeEnums.SUCCESSPERSIST;
    }else if(b.match(/fail/)){
        this.persistent = BTreeEnums.FAILPERSIST;
    }else{
        throw new Error('unrecognised persistence argument');
    }
};

BTreeNodeAbstract.prototype.priority = function(v){
    this.priority = v || 0;
};

BTreeNodeAbstract.prototype.priorityCondition = function(...rules){
    if(rules.length === 0){
        this.conditions.priority = [];
    }else{
        this.conditions.priority = this.conditions.priority.concat(rules);
    }        
};

//first element defines context type,
//default to fail context
BTreeNodeAbstract.prototype.contextCondition = function(...conditions){
    if(conditions.length === 0){
        this.conditions.context = [];
    }else{
        this.conditions.context = this.conditions.context.concat(conditions);
    }
};

BTreeNodeAbstract.prototype.contextType = function(t){
    if(t.match(/success/)){
        this.contextType = SUCCESS;
    }else{
        this.contextType = FAIL;            
    }
};

BTreeNodeAbstract.prototype.preference = function(s){
    this.preference = s || 0;
};

BTreeNodeAbstract.prototype.entryCondition = function(...c){
    if(c.length === 0){
        this.conditions.entry = [];
    }else{
        this.conditions.entry = this.conditions.entry.concat(c);
    }
};

BTreeNodeAbstract.prototype.waitCondition = function(...c){
    if(c.length === 0){
        this.conditions.wait = [];
    }else{
        this.conditions.wait = this.conditions.wait.concat(c);
    }
};

BTreeNodeAbstract.prototype.failCondition = function(...e){
    if(e.length === 0){
        this.conditions.fail = [];
    }else{
        this.conditions.fail = this.conditions.fail.concat(e);
    }
};

BTreeNodeAbstract.prototype.persistCondition = function(...p){
    if(p.length === 0 ){
        this.conditions.persist = [];
    }else{
        this.conditions.persist = this.conditions.persist.concat(p);
    }
};

BTreeNodeAbstract.prototype.entryAction = function(...a){
    if(a.length === 0){
        this.actions.entry = [];
    }else{
        this.actions.entry = this.actions.entry.concat(a);
    }
};

BTreeNodeAbstract.prototype.performAction = function(...a){
    if(a.length === 0){
        this.actions.perform = [];
    }else{
        this.actions.perform = this.actions.perform.concat(a);
    }
};

BTreeNodeAbstract.prototype.exitAction = function(...a){
    if(a.length === 0){
        this.actions.exit = [];
    }else{
        this.actions.exit = this.actions.exit.concat(a);
    }
};

BTreeNodeAbstract.prototype.failAction = function(...a){
    if(a.length === 0){
        this.actions.fail = [];
    }else{
        this.actions.fail = this.actions.fail.concat(a);
    }
};

BTreeNodeAbstract.prototype.subgoal = function(...c){
    //console.log(`Concating children for ${this.name} :`, c);
    if(c.length === 0){
        this.subgoals = [];
    }else{
        this.subgoals = this.subgoals.concat(c);
    }
};

BTreeNodeAbstract.prototype.value = function(field,val){
    if(val === undefined){
        this.values.delete(field);
    }else{
        this.values.set(field,val);
    }
};

BTreeNodeAbstract.prototype.tag = function(tagName,deleteTag){
    if(deleteTag){
        this.bTreeRef.removeTag(tagName,this);
        this.tags.delete(tagName);
    }else{
        this.bTreeRef.setTag(tagName,this);
        this.tags.add(tagName);
    }
};


BTreeNodeAbstract.prototype.type = function(typeString){
    if(typeString.match(/^seq/)){
        this.type = BTreeEnums.SEQUENTIAL;
    }else if(typeString.match(/^par/)){
        this.type = BTreeEnums.PARALLEL;
    }else if(typeString.match(/^cho/)){
        this.type = BTreeEnums.CHOICE;
    }
    
};

export { BTreeNodeAbstract };

import { BTreeEnums } from './BTreeEnums';
import _ from 'lodash';
//----------------------------------------
/**
   The Reified Node used in the Working Tree
*/
class BTreeNodeReal {
    constructor(abstractNodes,values,parent,bTreeRef){
        bTreeRef.debug('addChild',abstractNodes);
        this.id = BTreeEnums.gid++;
        //For access back to the tree
        this.bTreeRef = bTreeRef;
        //the abstract node stack the real node is based on
        this.abstractNodes = _.clone(abstractNodes) || [];
        //The values of the instanced node
        if ( values instanceof Map ){
            this.values = values;
        } else {        
            this.values =  new Map(_.toPairs(values)) || {};
        }
        //parent node of the tree:
        this.parent = parent;
        //the actual children of the node
        //indexed by id
        this.children = new Map();

        //for keeping track of progression through a sequence
        this.sequenceCounter = 0;
        //for parallel failures
        this.parallelFailureCounter = 0;
        this.parallelSuccessCounter = 0;

        //the bindings for the instanced node
        this.bindings = new Map();
        
        //--------------------
        //try to find an applicable specificity, otherwise fail
        //BEFORE modifying the tree
        //--------------------
        //which of the abstract nodes is being used
        //current specificity. goes 0 -> abstractNodes.length
        //shortcut to the selected abstract
        //if we get here, the node is valid, so integrate it into the tree/conflict set
        this.findSpecificity();

        //--------------------
        //add self to the btree and parent, and the conflict set
        //--------------------
        this.bTreeRef.debug('addChild','adding to allRealNodes');
        this.bTreeRef.addReifiedNode(this);
        if(this.parent){
            this.bTreeRef.conflictSet.delete(this.parent);
            this.parent.children.set(this.id, this);
        }
        this.bTreeRef.conflictSet.add(this);
        //register context conditions:
        if(this.currentAbstract && this.currentAbstract.conditions.context.length > 0){
            this.bTreeRef.contextConditions.set(this,this.currentAbstract.conditions.context);
        }
        bTreeRef.debug('addChild','completed');
    }
}

BTreeNodeReal.prototype.priority = function(){
    //calculate all the priority conditions, sum them up, using the base priority to start:
    let bTreeRef = this.bTreeRef,
        currentNode = this,
        sumPriority;
    try {
        sumPriority = this.currentAbstract.conditions.priority.reduce(function(m,v){
            if(typeof v === 'function'){
                v = v(bTreeRef,currentNode);
            }
            if(typeof v === 'string'){
                v = Number(bTreeRef.fb.parse(v));
            }
            if(!isNaN(v)){
                return m + v;
            }else{
                throw new Error("bad priority rule");
            }
        },this.currentAbstract.priority);
    }catch(error){
        sumPriority = this.currentAbstract !== undefined ? this.currentAbstract.priority : 0;
    }        
    return sumPriority;
};


/**
   inform : update the state of a parent node without having to activate
   and conflict set it, mainly useful for parallel nodes to update their num 
   succeeded / failed amounts
   @param childId The calling child
   @param status The resulting state from the child
*/
BTreeNodeReal.prototype.inform = function(childId,status){
    //run exit actions if node completed successfully
    if(this.children.has(childId)){//this guards against persistence failure
        this.children.get(childId).cleanup(status === BTreeEnums.FAIL ? false : true );
    }
    //console.log("Informed",this.id,this);
    if(this.currentAbstract === undefined && this.parent !== undefined){
        this.informParent(status);
    }else if(this.currentAbstract.type === BTreeEnums.SEQUENTIAL){
        //Deal with SEQUENTIAL NODES
        if(status === BTreeEnums.SUCCESS){
            ////increment step counter
            this.sequenceCounter++;
            this.SEQUENTIAL_update();
        }else {
            this.informParent(status);
        }
    }else if(this.currentAbstract.type === BTreeEnums.CHOICE){
        //DEAL WITH CHOICE NODES
        this.informParent(status);
    }else if(this.currentAbstract.type === BTreeEnums.PARALLEL){
        //DEAL WITH PARALLEL NODES
        if(status === BTreeEnums.SUCCESS){
            this.parallelSuccessCounter++;
        }else if(status === BTreeEnums.FAIL){
            this.parallelFailureCounter++;
        }
        try{
            this.PARALLEL_update();
        }catch(error){
            if(!(error instanceof BTreeError)){ throw error; }                   
            //console.log(error);
            this.bTreeRef.debug('failure',error);
            this.informParent(BTreeEnums.FAIL);
        }
    }
};

/**
   inform a node's parent of success or failure,
   also can trigger persistence
   @param status the completion status of the node
   @param override shortcuts infinite looping within inform parent persistence
*/
BTreeNodeReal.prototype.informParent = function(status,override){
    this.bTreeRef.debug('update',`informing parent:`+status.toString());
    //if this inform isnt being called from inside an inform
    if(override === undefined && this.currentAbstract.persistent !== false){
        this.bTreeRef.debug('update','resetting persistent');
        let persist = false;
        //see if the node should persist:
        if(this.currentAbstract.persistent === BTreeEnums.SUCCESSPERSIST && status !== BTreeEnums.SUCCESS && this.bTreeRef.testConditions(this.currentAbstract.conditions.persist,this)){
            //persist until success
            persist = true;
        }else if(this.currentAbstract.persistent === BTreeEnums.FAILPERSIST && status !== BTreeEnums.FAIL && this.bTreeRef.testConditions(this.currentAbstract.conditions.persist,this)){
            //persist until failure
            persist = true;
        }else if(this.currentAbstract.persistent === BTreeEnums.PERSIST && this.bTreeRef.testConditions(this.currentAbstract.conditions.persist,this)){
            //persist if conditions say so
            persist = true;
        }
        //----
        if(persist){
            //reset the node:
            this.sequenceCounter = 0;
            this.parallelFailureCounter = 0;
            this.parallelSuccessCounter = 0;
            this.performed = false;
            //reset the specificity:
            try {
                this.findSpecificity(true);
                //add self back to the conflict set for next turn:
                this.bTreeRef.conflictSet.add(this);
            }catch(error){
                if(!(error instanceof BTreeError)){ throw error; }
                this.bTreeRef.debug('failure',error);
                this.informParent(BTreeEnums.FAIL,true);
            }
        }else{
            //override to clean up normally
            this.informParent(status,true);
        }
    }else if(this.parent){
        this.parent.inform(this.id,status);
    }else if(this.id === this.bTreeRef.root.id){
        this.bTreeRef.root = new BTreeNodeReal(this.abstractNodes,undefined,undefined,this.bTreeRef);
        this.cleanup(BTreeEnums.FAIL);
    }
};

/**
   Figure out the correct specificity for the node
*/
BTreeNodeReal.prototype.findSpecificity = function(persistentEntry){
    this.bTreeRef.debug('addChild','finding specificity');
    let i = 0;
    this.currentAbstract = this.abstractNodes[i];
    //get an applicable specificity, if you are dealing with an actual abstract based node
    if(this.abstractNodes.length > 0){
        while(this.currentAbstract && !this.bTreeRef.testConditions(this.currentAbstract.conditions.entry,this)){
            this.bTreeRef.debug('addChild','trying next abstract');
            this.currentAbstract = this.abstractNodes[++i];
        }
        if(this.currentAbstract && !persistentEntry){
            //perform the entry actions of the initial successful abstract:
            //a real node will only be created if the entry conditions of the specificity pass
            this.bTreeRef.debug('addChild','running entry actions');
            this.runActions('entry');
        }else if(this.currentAbstract === undefined){
            this.bTreeRef.debug('addChild','failed to find abstract');
            throw new BTreeError(`No suitable abstract for node: ${this.abstractNodes[0].name}`);
        }
    }
}; 

/**
   update
   The main update function outsources most things
*/
BTreeNodeReal.prototype.update = function(){
    this.bTreeRef.debug('update',`Updating: ${this.currentAbstract}`);
    try{
        if(this.shouldFail()){
            throw new BTreeError("Behaviour Fails");
        }
        if(this.shouldWait()){
            return BTreeEnums.WAIT; 
        }
        if(this.performed !== true){
            this.runActions('perform');
            this.performed = true;
        }else{
            console.log('not running perform actions');
        }
        this.typeUpdate();
        return BTreeEnums.SUCCESS;
    }catch(error){
        if(!(error instanceof BTreeError)){ throw error; }                   
        //propagate the failure
        //console.log('failure:',error);
        this.bTreeRef.debug('failure',error);
        this.informParent(BTreeEnums.FAIL);
        return BTreeEnums.FAIL;
    }
};

BTreeNodeReal.prototype.shouldFail = function(){
    if(this.currentAbstract.conditions.fail.length > 0){
        return this.bTreeRef.testConditions(this.currentAbstract.conditions.fail,this);
    }
    return false;
};

BTreeNodeReal.prototype.shouldWait = function(){
    if(this.currentAbstract.conditions.wait.length > 0){
        return this.bTreeRef.testConditions(this.currentAbstract.conditions.wait,this);
    }
    return false;
};

BTreeNodeReal.prototype.runActions = function(actionsType){
    if(this.currentAbstract.actions[actionsType] === undefined){
        throw new Error(`unrecognised actions type: ${actionsType}`);
    }
    this.bTreeRef.debug('actions',`Performing ${actionsType}: ${this.currentAbstract.name}`);
    try{
        this.currentAbstract.actions[actionsType].forEach(d=>d(this.bTreeRef,this));
    }catch(error){
        if(error instanceof BTreeError) { throw error; }
        //throw the error with information about the action type,
        //and behaviour name
        let behaviourName = this.currentAbstract.name,
            currentPriority = this.currentAbstract.priority;
        throw new Error(`${behaviourName}:${currentPriority} : ${actionsType} :: ${error.message}`);
    }
};

BTreeNodeReal.prototype.typeUpdate = function(){
    if(this.currentAbstract.type === BTreeEnums.SEQUENTIAL){
        this.SEQUENTIAL_update();
    }else if(this.currentAbstract.type === BTreeEnums.CHOICE){
        this.CHOICE_update();
    }else if(this.currentAbstract.type === BTreeEnums.PARALLEL){
        this.PARALLEL_update();
    } 
};

BTreeNodeReal.prototype.finalActions = function(){
    this.runActions('exit');
};

BTreeNodeReal.prototype.failActions = function(){
    this.runActions('fail');
};

/**
   SEQUENTIAL_update
   when called, steps the state of a sequential behaviour forward
*/
BTreeNodeReal.prototype.SEQUENTIAL_update = function(){
    this.bTreeRef.debug('update',`Sequential Update ${this.currentAbstract.name}`);
    let nextBehaviourName = this.currentAbstract.subgoals[this.sequenceCounter];
    if(nextBehaviourName !== undefined){
        this.addChild(nextBehaviourName);
    }else {
        this.informParent(BTreeEnums.SUCCESS);
    }
};

/**
   CHOICE_update
   chooses a single child to pursue
*/
BTreeNodeReal.prototype.CHOICE_update = function(){
    this.bTreeRef.debug('update',`choice update ${this.currentAbstract.name}`);
    if(!this.selectedChoice){
        let potentialChildren = _.shuffle(Array.from(this.currentAbstract.subgoals));
        //get a choice, try to add it
        while(_.keys(this.children).length === 0 && potentialChildren.length > 0){
            let selectedChild = potentialChildren.shift();
            this.addChild(selectedChild);
        }
        if(_.keys(this.children).length === 0){
            throw new BTreeError("Choice Failed");
        }
        this.selectedChoice = true;
    }else{
        this.informParent(BTreeEnums.SUCCESS);
    }
};

/**
   PARALLEL_update
   steps a parallel behaviour foward
*/
BTreeNodeReal.prototype.PARALLEL_update = function(){
    this.bTreeRef.debug('update',`parallel update ${this.currentAbstract.name}`);
    //if children havent been added, do that
    if(!this.hasAddedParallelChildren && _.keys(this.children).length === 0 && this.currentAbstract){
        //add all children            
        this.currentAbstract.subgoals.map(d=>{
            try{
                this.addChild(d);
            }catch(error){
                if(!(error instanceof BTreeError)){ throw error; }                   
                //if a behaviour fails to even add, increment the counter
                this.bTreeRef.debug('failure',error);
                this.parallelFailureCounter++;
            }});
        this.hasAddedParallelChildren = true;
    }
    //if enough failures have occurred, fail the node, cleaning up the children
    if(this.currentAbstract && this.currentAbstract.values.maxFailNum && this.currentAbstract.values.maxFailNum <= this.parallelFailureCounter){
        //console.log('parallel behaviour failure');
        throw new BTreeError("Parallel Behaviour Failure");
    }else if(_.keys(this.children).length === 0){
        throw new BTreeError('parallel behaviour failure2');
    }
    
    //if enough successes have occured, succeed the node, cleaning up the children
    if(this.currentAbstract && this.currentAbstract.values.minSuccessNum && this.currentAbstract.values.minSuccessNum <= this.parallelSuccessCounter){
        this.informParent(BTreeEnums.SUCCESS);
    }else if(this.currentAbstract && this.currentAbstract.subgoals.length <= this.parallelSuccessCounter){
        this.informParent(BTreeEnums.SUCCESS);
    }
};

//Cleanup:
BTreeNodeReal.prototype.cleanup = function(performPostActions){
    this.bTreeRef.debug('cleanup',`Cleaning ${this.currentAbstract.name}`);
    //remove self from the conflict set 
    this.bTreeRef.conflictSet.delete(this);
    //remove context conditions
    this.bTreeRef.contextConditions.delete(this);
    //perform post actions
    if(performPostActions){
        this.finalActions();
    }else{
        this.failActions();
    }
    //remove self from the parent
    if(this.parent){
        this.parent.children.delete(this.id);
    }
    //remove the parent reference
    this.parent = null;
    //cleanup all children:
    _.values(this.children).forEach(d=>d.cleanup(performPostActions));
    this.children.clear();
    //REMOVE FROM THE ALLNODES FIELD OF THE BTREE:
    this.bTreeRef.removeReifiedNode(this.id);
};

/**
   addChild
   Given the string of a name of a behaviour, get the abstracts of that group
   @param {String} childName
   @returns {Boolean} T: Successful add, F: no specificity was able to be added
*/
BTreeNodeReal.prototype.addChild = function(childName){
    this.bTreeRef.debug('addChild',`adding ${childName}`);
    try{
        let abstracts = this.bTreeRef.getAbstracts(childName),
            i = 0,
            realBehaviour = new BTreeNodeReal(abstracts,{},this,this.bTreeRef);
    }catch(error){
        if(!(error instanceof BTreeError)){ throw error;}
        //adding failed...
        this.bTreeRef.debug('addChild','Adding node failed');
    }
    return this;
};

/**
   integrateBindings
   given some bindings, copy them into the node's bindings,
   return false, and undo if there are any conflicts
*/
BTreeNodeReal.prototype.integrateBindings = function(bindingObject){
    let tempBindings = _.clone(this.bindings),
        newKeys = _.keys(bindingObject);
    for(var i = newKeys.length; 0 <= i; i--){
        if(! tempBindings.has(newKeys[i])){
            tempBindings.set(newKeys[i], bindingObject[newKeys[i]]);
        }else if(tempBindings.get(newKeys[i]) !== bindingObject[newKeys[i]]){
            this.bTreeRef.debug('binding',`failure for ${tempBindings[newKeys[i]]} : ${bindingObject[newKeys[i]]}`);
            return false;
        }
    }
    this.bindings = tempBindings;
    this.bTreeRef.debug('binding','success',this.bindings);
    return true;
};

export { BTreeNodeReal };

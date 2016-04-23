/* jshint esversion : 6 */
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['lodash','../exclusionLogic/ExclusionFactBase','../priorityQueue/priorityQueue'],function(_,ExFB,PriorityQueue){
    "use strict";
    var gid = 0,
        //Behaviour Types
        SEQUENTIAL = Symbol('sequential'),
        PARALLEL = Symbol('parallel'),
        CHOICE = Symbol('choice'),
        //Node States:
        ACTIVE = Symbol('active'),
        FINISHED = Symbol('finished'),
        INACTIVE = Symbol('inactive'),
        WAIT = Symbol('wait'),
        //RETURN statuses
        SUCCESS = Symbol('success'),
        FAIL = Symbol('failure'),
        //PERSISTENCE types
        SUCCESSPERSIST = Symbol('persist_until_success'),
        FAILPERSIST = Symbol('persist_until_failure'),
        PERSIST = Symbol('persist');

    

    
    //The internal failure error:
    var BTreeError = function(value){
        this.value = value;
    };
    
    //------------------------------------------------------------------------------
    /**
       An Abstract description of a behaviour, stored in the library
    */
    var BTreeNodeAbstract = function(name){
        this.id = gid++;
        this.name = name || "anon";
        //Behaviour parameters
        this.type =  SEQUENTIAL;
        this.tags = new Set();
        this.values = {}; //maxFailNum,minSuccessNum
        this.priority = 0;
        this.preference = 0;
        this.persistent = false;
        //whether context fails or succeeds the behaviour:
        //default to fail
        this.contextType = FAIL;
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
    };
    BTreeNodeAbstract.constructor = BTreeNodeAbstract;

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
            this.persistent = PERSIST;
        }else if(b.match(/success/)){
            this.persistent = SUCCESSPERSIST;
        }else if(b.match(/fail/)){
            this.persistent = FAILPERSIST;
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
            delete this.values[field];
        }else{
            this.values[field] = val;
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
            this.type = SEQUENTIAL;
        }else if(typeString.match(/^par/)){
            this.type = PARALLEL;
        }else if(typeString.match(/^cho/)){
            this.type = CHOICE;
        }
        
    };
    
    //------------------------------------------------------------------------------
    /**
       The Reified Node used in the Working Tree
    */
    var BTreeNodeReal = function(abstractNodes,values,parent,bTreeRef){
        this.id = gid++;
        //For access back to the tree
        this.bTreeRef = bTreeRef;
        //the abstract node stack the real node is based on
        this.abstractNodes = _.clone(abstractNodes) || [];
        //The values of the instanced node
        this.values =  values || {};
        //parent node of the tree:
        this.parent = parent;
        //the actual children of the node
        //indexed by id
        this.children = {};

        //for keeping track of progression through a sequence
        this.sequenceCounter = 0;
        //for parallel failures
        this.parallelFailureCounter = 0;
        this.parallelSuccessCounter = 0;

        //the bindings for the instanced node
        this.bindings = {};
        
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
        this.bTreeRef.allRealNodes[this.id] = this;
        if(this.parent){
            this.bTreeRef.conflictSet.delete(this.parent);
            this.parent.children[this.id] = this;
        }
        this.bTreeRef.conflictSet.add(this);
        //register context conditions:
        if(this.currentAbstract && this.currentAbstract.conditions.context.length > 0){
            this.bTreeRef.contextConditions.set(this,this.currentAbstract.conditions.context);
        }
        
    };
    BTreeNodeReal.constructor = BTreeNodeReal;

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
                    v = Number(bTreeRef.fb.exists(v));
                }
                if(!isNaN(v)){
                    return m + v;
                }else{
                    throw new Error("bad priority rule");
                }
            },this.currentAbstract.priority);
        }catch(error){
            sumPriority = this.currentAbstract.priority;
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
        if(this.children[childId]){//this guards against persistence failure
            this.children[childId].cleanup(status === FAIL ? false : true );
        }
        //console.log("Informed",this.id,this);
        if(this.currentAbstract === undefined){ return; }
        //Deal with SEQUENTIAL NODES
        if(this.currentAbstract.type === SEQUENTIAL){            
            if(status === SUCCESS){
                ////increment step counter
                this.sequenceCounter++;
                this.SEQUENTIAL_update();
            }else {
                this.informParent(status);
            }
            //DEAL WITH CHOICE NODES
        }else if(this.currentAbstract.type === CHOICE){
            this.informParent(status);
            //DEAL WITH PARALLEL NODES
        }else if(this.currentAbstract.type === PARALLEL){
            if(status === SUCCESS){
                this.parallelSuccessCounter++;
            }else if(status === FAIL){
                this.parallelFailureCounter++;
            }
            try{
                this.PARALLEL_update();
            }catch(error){
                if(!(error instanceof BTreeError)){ throw error; }                   
                //console.log(error);
                this.bTreeRef.debug('failure',error);
                this.informParent(FAIL);
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
        //console.log('informing parent of ',this.currentAbstract.name,status);
        this.bTreeRef.debug('update',`informing parent:`+status.toString());
        //if this inform isnt being called from inside an inform
        if(override === undefined && this.currentAbstract.persistent !== false){
            this.bTreeRef.debug('update','resetting persistent');
            let persist = false;
            //see if the node should persist:
            if(this.currentAbstract.persistent === SUCCESSPERSIST && status !== SUCCESS && this.bTreeRef.testConditions(this.currentAbstract.condition.persist)){
                persist = true;
            }else if(this.currentAbstract.persistent === FAILPERSIST && status !== FAIL && this.bTreeRef.testConditions(this.currentAbstract.condition.persist)){
                persist = true;
            }else if(this.currentAbstract.persistent === PERSIST && this.bTreeRef.testConditions(this.currentAbstract.conditions.persist)){
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
                    this.informParent(FAIL,true);
                }
            }else{
                //override to clean up normally
                this.informParent(status,true);
            }
        }else if(this.parent){
            this.parent.inform(this.id,status);
        }else if(this.id === this.bTreeRef.root.id){
            this.bTreeRef.root = new BTreeNodeReal(this.abstractNodes,undefined,undefined,this.bTreeRef);
            this.cleanup(FAIL);
        }
    };

    /**
       Figure out the correct specificity for the node
     */
    BTreeNodeReal.prototype.findSpecificity = function(persistentEntry){
        let i = 0;
        this.currentAbstract = this.abstractNodes[i];
        //get an applicable specificity, if you are dealing with an actual abstract based node
        if(this.abstractNodes.length > 0){
            while(this.currentAbstract && !this.bTreeRef.testConditions(this.currentAbstract.conditions.entry,this)){
                this.currentAbstract = this.abstractNodes[++i];
            }
            if(this.currentAbstract && !persistentEntry){
                //perform the entry actions of the initial successful abstract:
                //a real node will only be created if the entry conditions of the specificity pass
                this.runActions('entry');
            }else if(this.currentAbstract === undefined){
                throw new BTreeError(`No suitable abstract for node: ${this.abstractNodes[0].name}`);
            }
        }
    }    

    /**
       update
       The main update function outsources most things
    */
    BTreeNodeReal.prototype.update = function(){
        this.bTreeRef.debug('update',`Updating: ${this.currentAbstract.name}`);
        try{
            if(this.shouldFail()){
                throw new BTreeError("Behaviour Fails");
            }
            if(this.shouldWait()){
                return;
            }
            if(this.performed !== true){
                this.runActions('perform');
                this.performed = true;
            }else{
                console.log('not running perform actions');
            }
            this.typeUpdate();
        }catch(error){
            if(!(error instanceof BTreeError)){ throw error; }                   
            //propagate the failure
            //console.log('failure:',error);
            this.bTreeRef.debug('failure',error);
            this.informParent(FAIL);
        }
    };

    BTreeNodeReal.prototype.shouldFail = function(){
        if(this.currentAbstract.conditions.fail.length > 0){
            return this.bTreeRef.testConditions(this.currentAbstract.conditions.fail);
        }
        return false;
    };

    BTreeNodeReal.prototype.shouldWait = function(){
        if(this.currentAbstract.conditions.wait.length > 0){
            return this.bTreeRef.testConditions(this.currentAbstract.conditions.wait);
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
            let behaviourName = this.currentAbstract.name;
            throw new Error(`${behaviourName} : ${actionsType} :: ${error.message}`);
        }
    };

    BTreeNodeReal.prototype.typeUpdate = function(){
        if(this.currentAbstract.type === SEQUENTIAL){
            this.SEQUENTIAL_update();
        }else if(this.currentAbstract.type === CHOICE){
            this.CHOICE_update();
        }else if(this.currentAbstract.type === PARALLEL){
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
            this.informParent(SUCCESS);
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
            this.informParent(SUCCESS);
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
                    this.bTreeRef('failure',error);
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
            this.informParent(SUCCESS);
        }else if(this.currentAbstract && this.currentAbstract.subgoals.length <= this.parallelSuccessCounter){
            this.informParent(SUCCESS);
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
            delete this.parent.children[this.id];
        }
        //remove the parent reference
        this.parent = null;
        //cleanup all children:
        _.values(this.children).forEach(d=>d.cleanup(performPostActions));
        this.children = {};
    };

    /**
       addChild
       Given the string of a name of a behaviour, get the abstracts of that group
       @param {String} childName
       @returns {Boolean} T: Successful add, F: no specificity was able to be added
    */
    BTreeNodeReal.prototype.addChild = function(childName){
        let abstracts = this.bTreeRef.getAbstracts(childName),
            i = 0,
            realBehaviour = new BTreeNodeReal(abstracts,{},this,this.bTreeRef);
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
            if(tempBindings[newKeys[i]] === undefined){
                tempBindings[newKeys[i]] = bindingObject[newKeys[i]];
            }else if(tempBindings[newKeys[i]] !== bindingObject[newKeys[i]]){
                this.bTreeRef.debug('binding',`failure for ${tempBindings[newKeys[i]]} : ${bindingObject[newKeys[i]]}`);
                return false;
            }
        }
        this.bindings = tempBindings;
        this.bTreeRef.debug('binding','success',this.bindings);
        return true;
    };
    
    //------------------------------------------------------------------------------
    /**
       Behaviour Collection /monad for easy definition of abstract behaviours
       also allows setting of parameters of groups of behaviours at once
    */
    var BehaviourMonad = function(behaviours,btree){
        this.behaviours = new Set(behaviours);
        this.btree = btree;
    };

    BehaviourMonad.prototype.toArray = function(){
        return Array.from(this.behaviours);
    }
    
    //Add further behaviours to the monad:
    BehaviourMonad.prototype.add = function(behaviours){
        if(behaviours instanceof BehaviourMonad){
            behaviours.behaviours.forEach(d=>this.behaviours.add(d));
        }else if(behaviours instanceof Array){
            behaviours.forEach(d=>this.behaviours.add(d));
        }else if(behaviours instanceof string){
            this.add(this.bTree.getAbstracts(behaviours));
        }        
    };
    
    //Apply the specified variables to the function of the btnodeabstract
    BehaviourMonad.prototype.applyTo = function(paramName,variables){
        //console.log("Applying:",paramName,variables);
        if(BTreeNodeAbstract.prototype[paramName] !== undefined){
            this.behaviours.forEach(function(d){
                BTreeNodeAbstract.prototype[paramName].apply(d,variables);
            });
        }
        return this;
    };

    BehaviourMonad.prototype.contextCondition = function(...vars){
        return this.applyTo('contextCondition',vars);
    };

    BehaviourMonad.prototype.contextType = function(...vars){
        return this.applyTo('contextType',vars);
    };
        
    BehaviourMonad.prototype.persistent = function(...vars){
        return this.applyTo('persistent',vars);
    };
    
    BehaviourMonad.prototype.preference = function(...vars){
        return this.applyTo('preference',vars);
    };
    
    BehaviourMonad.prototype.priority = function(...vars){
        return this.applyTo('priority',vars);
    };

    BehaviourMonad.prototype.type = function(...vars){
        return this.applyTo('type',vars);
    };
    
    BehaviourMonad.prototype.entryCondition = function(...vars){
        return this.applyTo('entryCondition',vars);
    };

    BehaviourMonad.prototype.waitCondition = function(...vars){
        return this.applyTo('waitCondition',vars);
    };

    BehaviourMonad.prototype.failCondition = function(...vars){
        return this.applyTo('failCondition',vars);
    };

    BehaviourMonad.prototype.persistCondition = function(...vars){
        return this.applyTo('persistCondition',vars);
    };

    BehaviourMonad.prototype.priorityCondition = function(...vars){
        return this.applyTo('priorityCondition',vars);
    };
    
    BehaviourMonad.prototype.entryAction = function(...vars){
        return this.applyTo('entryAction',vars);
    };

    BehaviourMonad.prototype.performAction = function(...vars){
        return this.applyTo('performAction',vars);
    };
    
    BehaviourMonad.prototype.exitAction = function(...vars){
        return this.applyTo('exitAction',vars);
    };

    BehaviourMonad.prototype.failAction = function(...vars){
        return this.applyTo('failAction',vars);
    };
    
    BehaviourMonad.prototype.subgoal = function(...vars){
        return this.applyTo('subgoal',vars);
    };

    BehaviourMonad.prototype.value = function(...vars){
        return this.applyTo('value',vars);
    };

    BehaviourMonad.prototype.tag = function(...vars){
        return this.applyTo('tag',vars);
    }
    
    //------------------------------------------------------------------------------
    /**
       The Tree Controller
    */
    var BTree = function(sharedFactBase,sharedAbstractLibrary,templateValues){
        this.id = gid++;
        this.debugFlags = {};
        //name -> [abstracts]
        this.behaviourLibrary = {};
        //a Map of sets
        this.behaviourTags = new Map();
        this.loadBehaviours(sharedAbstractLibrary);
        this.sortBehaviours();
        //id -> node
        this.allRealNodes = {};
        //the conflict set:
        this.conflictSet = new Set();
        //the top n entries in the priority organised conflict set to select an action from
        this.conflictSetSelectionSize = 5;
        //The registered context conditions to run every turn
        //an object of pairs indexed by id: [node,conditions];
        this.contextConditions = new Map();
        
        //root of the working tree: no abstract, spec, values, or parent. 
        this.root = new BTreeNodeReal(this.getAbstracts('initialTree'),undefined,undefined,this);
        this.root.type = PARALLEL;
        //The Exclusion Logic Fact Base:
        this.fb = sharedFactBase || new ExFB();

        //Instance specific values;
        templateValues = templateValues || {};
        this.values = _.clone(templateValues);
        if(this.values.name === undefined){
            this.values.name = "Default BTree";
        }
        
        //Constructors
        this.BehaviourAbstract = BTreeNodeAbstract;
        this.BehaviourReal = BTreeNodeReal;
        this.BehaviourMonad = BehaviourMonad;
        //Symbols
        this.NodeTypes = {
            'sequential' : SEQUENTIAL,
            'parallel' : PARALLEL,
            'choice' : CHOICE
        };
        this.persistenceTypes = {
            'successPersistence' : SUCCESSPERSIST,
            'failurePersistence' : FAILPERSIST,
            'defaultPersistence' : PERSIST
        };
    };
    BTree.constructor = BTree;

    BTree.prototype.setDebugFlags = function(...flags){
        flags.forEach(f=>{
            if(this.debugFlags[f] === undefined){
                this.debugFlags[f] = true;
            }else{
                this.debugFlags[f] = !this.debugFlags[f];
            }
        });
    };

    BTree.prototype.debug = function(flag,...messages){
        if(this.debugFlags[flag]){
            messages.forEach(d=>{
                if(typeof d === 'function'){
                    d = d()
                }
                console.log(flag,d);
            });
        }
    };

    BTree.prototype.setTag = function(tag,behaviour){
        if(! this.tags.has(tag)){
            this.tags.set(tag,new Set());
        }
        this.tags.get(tag).add(behaviour);
    };

    BTree.prototype.removeTag = function(tag,behaviour){
        let tagSet = this.tags.get(tag);
        if(tagSet){
            tagSet.delete(behaviour);
        }
        if(tagSet.size === 0){
            this.tags.delete(tag);
        }        
    };

    
    //utilities for assertion/retraction of facts
    BTree.prototype.assert = function(...values){
        values.forEach(d=>this.fb.assert(d));
    };

    BTree.prototype.retract = function(...values){
        values.forEach(d=>this.fb.retract(d));
    };
    
    //Load descriptions of behaviours
    BTree.prototype.loadBehaviours = function(behaviourLibraryAdditions){
        //console.log("Loading: ",behaviourLibraryAdditions);
        if((behaviourLibraryAdditions instanceof Array) && behaviourLibraryAdditions.length > 0){
            behaviourLibraryAdditions.forEach(function(d){
                if(typeof d === 'function'){
                    d(this);
                }else if(d instanceof Array){
                    this.loadBehaviours(d);
                }else if(d instanceof BTreeNodeAbstract){
                    if(this.behaviourLibrary[d.name] === undefined){
                        this.behaviourLibrary[d.name] = [];
                    }
                    this.behaviourLibrary[d.name].push(d);
                }                
            },this);
        }
    };

    //Create a separate BTree, but with shared facts, and behaviour library
    BTree.prototype.newCharacter = function(contextValues){
        let newCharacter = new BTree(this.fb,_.values(this.behaviourLibrary),contextValues);
        return newCharacter;
    };
    
    /**
       getAbstracts
       Given a name, get the array of abstracts, which are sorted by specificity
       @param {String} name
    */
    BTree.prototype.getAbstracts = function(name){
        if(this.behaviourLibrary[name] !== undefined){
            return this.behaviourLibrary[name];
        }
        return [];
    };

    
    /**
       Register an Abstract Behaviour
       @param {String} name
    */
    BTree.prototype.Behaviour = function(name){
        if(this.behaviourLibrary[name] === undefined){
            this.behaviourLibrary[name] = [];
        }
        let newBeh = new BTreeNodeAbstract(name);
        this.behaviourLibrary[name].push(newBeh);
        if(this.root && name === 'initialTree'){
            this.root.abstractNodes = this.behaviourLibrary.initialTree;
            this.root.currentAbstract = this.root.abstractNodes[0];
        }        
        return new BehaviourMonad([newBeh],this);
    };

    /**
       The main update method, steps the btree forward
    */
    BTree.prototype.update = function(printChosenNode){
        //Sort the conflict set by priority, choose from the top 5 in the set
        //console.log("Conflict Set:",Array.from(this.conflictSet).map(d=>d.currentAbstract.name));
        this.debug('preConflictSet',d=>Array.from(this.conflictSet).map(d=>d.currentAbstract.name));

        //run context conditions, deal with failures
        this.contextConditions.forEach((conds,node)=>{
            if(!this.testConditions(conds)){
                //let status = this.contextType === SUCCESSCONTEXT ? SUCCESSCONTEXT : FAILCONTEXT;
                node.informParent(this.contextType);
            }
        });
        
        /*
          TODO: calculate priorities based on priorityrules
          forEach a in conflictSet, apply rules, aggregate values, then sort, then slice
        */
        let conflictPriorityQueue = new PriorityQueue(true),
            potentials = [],//maximise
            chosenNode;
        //calculate each behaviour, add it into the priority queue:
        this.conflictSet.forEach(d=>conflictPriorityQueue.insert(d,d.priority()));

        for(let i = this.conflictSetSelectionSize; i > 0 && !conflictPriorityQueue.empty(); i--){
            potentials.push(conflictPriorityQueue.next());
        }
                
        chosenNode = _.sample(potentials);
        if(chosenNode){
            chosenNode.update();
        }

        this.debug('postConflictSet',d=>Array.from(this.conflictSet).map(d=>d.currentAbstract.name));
        this.debug('facts',d=>this.fb.toStrings());
    };

    /**
       testConditions
       Test the set of statements against the fact base
       @see module:ExclusionLogic
       @param {Array} testStatements
       @returns {Boolean}
    */
    BTree.prototype.testConditions = function(testStatements,callingNode){
        let i = 0,
            lastResult = true,
            currentTestStatement;
        while(lastResult && i < testStatements.length ){
            currentTestStatement = testStatements[i++];
            //call the function
            if(typeof currentTestStatement === 'function'){
                currentTestStatement = currentTestStatement(this,callingNode);
            }
            //console.log("Testing: ",currentTestStatement);
            //if the function returned a boolean, use that, otherwise exists
            if(typeof currentTestStatement === 'boolean'){
                lastResult = currentTestStatement;
            }else{
                //returns either an object of bindings, or true/false
                lastResult = this.fb.exists(currentTestStatement);
            }
            if(callingNode && typeof lastResult !== 'boolean'){
                this.debug('binding',lastResult);
                lastResult = callingNode.integrateBindings(lastResult);
            }
        }
        //force conversion to boolean
        //console.log("Result:",lastResult);
        return lastResult !== false;
    };    

    /**
       sortBehaviours
       Sort abstract behaviours by their specificity and preference, hight to low
    */
    BTree.prototype.sortBehaviours = function(){
        _.values(this.behaviourLibrary).forEach(function(d){
            d.forEach(e=>e.calculateSpecificity());
            d.sort(function(a,b){
                return b.preference - a.preference;
            });
        });
    };
    
    return BTree;
});

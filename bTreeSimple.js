/* jshint esversion : 6 */
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['underscore','../exclusionLogic/ExclusionFactBase'],function(_,ExFB){
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
        FAIL = Symbol('failure');
    //------------------------------------------------------------------------------
    /**
       An Abstract description of a behaviour, stored in the library
    */
    var BTreeNodeAbstract = function(name){
        this.id = gid++;
        this.name = name || "anon";
        this.type =  SEQUENTIAL;
        //----------
        this.entryConditions = [];
        this.waitConditions = [];
        this.failConditions = [];
        this.persistConditions = [];
        //
        this.entryActions = [];
        this.performActions = [];//d=>console.log(`${this.name} default action`)];
        this.exitActions = [];
        this.failActions = [];
        //----------
        //values.maxFailNum
        //values.minSuccessNum
        this.values = {};
        this.priority = 0;
        this.specificity = 0;
        this.persistent = false;
        //names to be reified, in order of execution type
        this.children = [];
    };
    BTreeNodeAbstract.constructor = BTreeNodeAbstract;

    //Setters / Clearers
    BTreeNodeAbstract.prototype.persistent = function(b){
        this.persistent = b || false;
    };
    
    BTreeNodeAbstract.prototype.priority = function(v){
        this.priority = v || 0;
    };

    BTreeNodeAbstract.prototype.specificity = function(s){
        this.specificity = s || 0;
    };

    BTreeNodeAbstract.prototype.entryCondition = function(c){
        if(c instanceof Array){
            this.entryConditions = c;
        }else{
            this.entryConditions.push(c);
        }
    };

    BTreeNodeAbstract.prototype.waitCondition = function(c){
        if(c instanceof Array){
            this.waitConditions = c;
        }else{
            this.waitConditions.push(c);
        }
    };

    BTreeNodeAbstract.prototype.failCondition = function(e){
        if(e instanceof Array){
            this.failConditions = e;
        }else{
            this.failConditions.push(e);
        }
    };

    BTreeNodeAbstract.prototype.persistCondition = function(p){
        if(p instanceof Array){
            this.persistConditions = p;
        }else{
            this.persistConditions.push(p);
        }
    };
    
    BTreeNodeAbstract.prototype.entryAction = function(a){
        if(a instanceof Array){
            this.entryActions = a;
        }else{
            this.entryActions.push(a);
        }
    };

    BTreeNodeAbstract.prototype.performAction = function(a){
        if(a instanceof Array){
            this.performActions = a;
        }else{
            this.performActions.push(a);
        }
    };

    BTreeNodeAbstract.prototype.exitAction = function(a){
        if(a instanceof Array){
            this.exitActions = a;
        }else{
            this.exitActions.push(a);
        }
    };

    BTreeNodeAbstract.prototype.failAction = function(a){
        if(a instanceof Array){
            this.failActions = a;
        }else{
            this.failActions.push(a);
        }
    };
    
    BTreeNodeAbstract.prototype.children = function(...c){
        //console.log(`Concating children for ${this.name} :`, c);
        if(c instanceof Array){
            if(c.length === 0){
                this.children = [];
            }else{
                this.children = this.children.concat(c);
            }
        }else{
            this.children.push(c);
        }
    };

    BTreeNodeAbstract.prototype.value = function(field,val){
        this.values[field] = val;
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
    var BTreeNodeReal = function(abstractNodes,specificity,values,parent,bTreeRef){
        this.id = gid++;
        //For access back to the tree
        this.bTreeRef = bTreeRef;
        //the abstract node stack the real node is based on
        this.abstractNodes = _.clone(abstractNodes) || [];
        //which of the abstract nodes is being used
        //current specificity. goes 0 -> abstractNodes.length
        this.currentSpecificity = specificity || 0;
        //shortcut to the selected abstract
        this.currentAbstract = this.abstractNodes[this.currentSpecificity];
        if(this.currentAbstract){
            //perform the entry actions of the initial successful abstract:
            //a real node will only be created if the entry conditions of the specificity pass
            let entryActions = this.currentAbstract.entryActions.map(d=>_.bind(d,this));
            entryActions.forEach(d=>d(this.bTreeRef));
        }
        //The values of the instanced node
        this.values =  values || {};
        //parent node of the tree:
        this.parent = parent;
        //the actual children of the node
        //indexed by id
        this.children = {};

        //Real node current status:
        this.status = ACTIVE;
        this.returnStatus = SUCCESS;
        this.lastReturnStatus = SUCCESS;
        //for keeping track of progression through a sequence
        this.sequenceCounter = 0;
        //for parallel failures
        this.parallelFailureCounter = 0;
        this.parallelSuccessCounter = 0;

        //--------------------
        //add self to the btree and parent, and the conflict set
        //--------------------
        this.bTreeRef.allRealNodes[this.id] = this;
        if(this.parent){
            this.parent.status = INACTIVE;
            this.bTreeRef.conflictSet.delete(this.parent);
            this.bTreeRef.conflictSet.add(this);
            this.parent.children[this.id] = this;
        }
    };
    BTreeNodeReal.constructor = BTreeNodeReal;

    BTreeNodeReal.prototype.priority = function(){
        return this.currentAbstract !== undefined ? this.currentAbstract.priority : 0;
    }

    
    /**
       shiftToNextSpecificity
       Goes through the abstracts of the node, settling on the first 
       that passes its entry conditions
       @returns {Boolean}
    */
    BTreeNodeReal.prototype.shiftToNextSpecificity = function(){
        this.currentSpecificity++;
        this.currentAbstract = this.abstractNodes[this.currentSpecificity];
        while(this.currentAbstract !== undefined && current.entryConditions.length > 0 && !this.bTreeRef.testConditions(current.entryConditions)){
            this.currentSpecificity++;
            this.currentAbstract = this.abstractNodes[this.currentSpecificity];
        }
        if(this.currentAbstract === undefined){
            return false;
        }
        return true;
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
                this.status = ACTIVE;
                this.sequenceCounter++;
                this.SEQUENTIAL_update()
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
                console.log(error);
                this.informParent(FAIL);
            }
        }
    };

    BTreeNodeReal.prototype.informParent = function(status){
        if(this.parent){
            this.parent.inform(this.id,status);
        }
    };
    

    /**
       update
       The main update function outsources most things
    */
    BTreeNodeReal.prototype.update = function(){
        try{
            if(this.shouldFail()){
                throw new Error("Behaviour Fails");
            }
            if(this.shouldWait()){
                this.status = WAIT;
                return;
            }
            this.runActions();
            this.typeUpdate();
        }catch(error){
            //propagate the failure
            this.informParent(FAIL);
        }
    };

    BTreeNodeReal.prototype.shouldFail = function(){
        if(this.currentAbstract.failConditions.length > 0){
            return this.bTreeRef.testConditions(this.currentAbstract.failConditions);
        }
        return false;
    };

    BTreeNodeReal.prototype.shouldWait = function(){
        if(this.currentAbstract.waitConditions.length > 0){
            return this.bTreeRef.testConditions(this.currentAbstract.waitConditions);
        }
        return false;
    };
    
    BTreeNodeReal.prototype.runActions = function(){
        if(this.performed === undefined){
            let actions = this.currentAbstract.performActions.map(d=>_.bind(d,this));
            actions.forEach(d=>d(this.bTreeRef));
            this.performed = true;
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
        let actions = this.currentAbstract.exitActions.map(d=>_.bind(d,this));
        actions.forEach(d=>d(this.bTreeRef));
    };

    BTreeNodeReal.prototype.failActions = function(){
        let actions = this.currentAbstract.failActions.map(d=>_.bind(d,this));
        actions.forEach(d=>d(this.bTreeRef));
    };
    
    /**
       SEQUENTIAL_update
       when called, steps the state of a sequential behaviour forward
    */
    BTreeNodeReal.prototype.SEQUENTIAL_update = function(){
        let nextBehaviourName = this.currentAbstract.children[this.sequenceCounter];
        if(nextBehaviourName !== undefined){
            this.addChild(nextBehaviourName);
        }else {
            this.informParent(SUCCESS);
        }
    };

    /**
       CHOICE_update
       steps a choice behaviour forward
    */
    BTreeNodeReal.prototype.CHOICE_update = function(){
        //make a choice from the specified alternatives and add that
        //if an attempt fails, try the next alt of it,
        //then fail
        //succeed if the child succeeds
        if(!this.selectedChoice){
            let potentialChildren = _.shuffle(Array.from(this.currentAbstract.children));
            //get a choice, try to add it
            while(_.keys(this.children).length === 0 && potentialChildren.length > 0){
                let selectedChild = potentialChildren.shift();
                this.addChild(selectedChild);
            }
            if(_.keys(this.children).length === 0){
                throw new Error("Choice Failed");
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
        //if children havent been added, do that
        if(!this.hasAddedParallelChildren && _.keys(this.children).length === 0 && this.currentAbstract){
            //add all children            
            this.currentAbstract.children.map(d=>{
                try{
                    this.addChild(d);
                }catch(error){
                    //if a behaviour fails to even add, increment the counter
                    console.log("update failure count");
                    this.parallelFailureCounter++;
                }});
            this.hasAddedParallelChildren = true;
        }
        //if enough failures have occurred, fail the node, cleaning up the children
        if(this.currentAbstract && this.currentAbstract.values.maxFailNum && this.currentAbstract.values.maxFailNum <= this.parallelFailureCounter){
            console.log("failing");
            throw new Error("Parallel Behaviour Failure");
        }
        
        //if enough successes have occured, succeed the node, cleaning up the children
        if(this.currentAbstract && this.currentAbstract.values.minSuccessNum && this.currentAbstract.values.minSuccessNum <= this.parallelSuccessCounter){
            this.informParent(SUCCESS);
        }else if(this.currentAbstract && this.currentAbstract.children.length <= this.parallelSuccessCounter){
            this.informParent(SUCCESS);
        }
    };

    //Cleanup:
    BTreeNodeReal.prototype.cleanup = function(performPostActions){
        //remove self from the conflict set 
        this.bTreeRef.conflictSet.delete(this);
        //remove self from the parent
        if(this.parent){
            delete this.parent.children[this.id];
        }
        //if persistent, and the persistent condition is/isnt(?) met, re-add:
        if(this.currentAbstract.persistent && this.bTreeRef.testConditions(this.currentAbstract.persistConditions)){
            try{
                this.parent.addChild(this.currentAbstract.name);
            }catch(error){
                //although cleanup is called from the parent's inform method,
                //cycles are protected against by only cleaning up if the
                //node is stored as a child, which by this point the node isnt.
                this.informParent(FAIL);
            }
        }
        //remove the parent reference
        this.parent = null;
        //cleanup all children:
        _.values(this.children).forEach(d=>d.cleanup(performPostActions));
        this.children = {};
        //perform post actions
        if(performPostActions){
            this.finalActions();
        }else{
            this.failActions();
        }
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
            current = abstracts[i],
            realBehaviour;
        //test for entry success
        while(current !== undefined && current.entryConditions.length > 0 && !this.bTreeRef.testConditions(current.entryConditions)){
            current = abstracts[++i];
        }
        //create the behaviour with the correct spec offset
        if(current !== undefined){
            realBehaviour = new BTreeNodeReal(abstracts,i,{},this,this.bTreeRef);
        }else{
            throw new Error("no suitable abstract for child");
        }
        return this;
    };

    //------------------------------------------------------------------------------
    /**
       Behaviour Collection /monad for easy definition of abstract behaviours
    */
    var BehaviourMonad = function(behaviours,btree){
        this.behaviours = new Set(behaviours);
        this.btree = btree;
    };

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

    BehaviourMonad.prototype.persistent = function(...vars){
        return this.applyTo('persistent',vars);
    };
    
    BehaviourMonad.prototype.specificity = function(...vars){
        return this.applyTo('specificity',vars);
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
    
    BehaviourMonad.prototype.children = function(...vars){
        //console.log("Children called:",vars);
        return this.applyTo('children',vars);
    };

    BehaviourMonad.prototype.value = function(...vars){
        return this.applyTo('value',vars);
    };
    
    //------------------------------------------------------------------------------
    /**
       The Tree Controller
    */
    var BTree = function(sharedFactBase,sharedAbstractLibrary,templateValues){
        //name -> [abstracts]
        this.behaviourLibrary = {};
        this.loadBehaviours(sharedAbstractLibrary);
        //id -> node
        this.allRealNodes = {};
        //the conflict set:
        this.conflictSet = new Set();
        //the top n entries in the priority organised conflict set to select an action from
        this.conflictSetSelectionSize = 5;
        //root of the working tree: no abstract, spec, values, or parent. 
        this.root = new BTreeNodeReal(this.getAbstracts('initialTree'),undefined,undefined,undefined,this);
        this.root.type = PARALLEL;
        //this.root.addChild('initialTree');
        this.conflictSet.add(this.root);
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

    };
    BTree.constructor = BTree;

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
    
    BTree.prototype.newCharacter = function(contextValues){
        //create and share the fact base and abstracts:
        //console.log("Shared BTree to new character: " + contextValues.name);
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
       Update the conflict set:
    */
    /**
       update a node from the conflict set
    */
    BTree.prototype.update = function(printChosenNode){
        //Sort the conflict set by priority, choose from the top 5 in the set
        let potentials = Array.from(this.conflictSet).sort((a,b)=>b.priority() - a.priority()).slice(0,this.conflictSetSelectionSize),
            chosenNode = _.sample(potentials);
        if(chosenNode){
            chosenNode.update();
        }
    };

    /**
       testConditions
       Test the set of statements against the fact base
       @param {Array} testStatements
       @returns {Boolean}
    */
    BTree.prototype.testConditions = function(testStatements){
        let transformedTestStatements = testStatements.map(function(d){
            if(typeof d === 'string') { return d; }
            if(typeof d === 'function') { return d(this); }
            return ".";
        },this),
            i = testStatements.length,
            lastResult = true;
        while(lastResult && --i >= 0){
            lastResult = this.fb.exists(transformedTestStatements[i]);
        }
        return lastResult;
    };    


    /**
       sortBehaviours
       Sort abstract behaviours by their specificity, hight to low
    */
    BTree.prototype.sortBehaviours = function(){
        _.values(this.behaviourLibrary).forEach(function(d){
            d.sort(function(a,b){
                return b.specificity - a.specificity;
            });
        });
    };
    
    return BTree;
});

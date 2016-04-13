/* jshint esversion : 6 */
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['underscore','../exclusionLogic/ExclusionFactBase'],function(_,ExFB){
    "use strict";
    var gid = 0,
        //Behaviour Types
        SEQ = Symbol(),
        PAR = Symbol(),
        CHO = Symbol(),
        //Node States:
        ACTIVE = Symbol(),
        FINISHED = Symbol(),
        INACTIVE = Symbol(),
        WAIT = Symbol(),
        
        //RETURN statuses
        SUCCESS = Symbol(),
        FAIL = Symbol();
    //------------------------------------------------------------------------------
    /**
       An Abstract description of a behaviour, stored in the library
    */
    var BTreeNodeAbstract = function(name){
        this.id = gid++;
        this.name = name || "anon";
        this.type =  SEQ;
        //----------
        this.entryConditions = [];
        this.waitConditions = [];
        this.failConditions = [];
        //
        this.entryActions = [];
        this.performActions = [];//d=>console.log(`${this.name} default action`)];
        this.exitActions = [];
        this.failActions = [];
        //----------
        this.values = {};
        this.priority = 0;
        this.specificity = 0;
        //names to be reified, in order of execution type
        this.children = [];
    };
    BTreeNodeAbstract.constructor = BTreeNodeAbstract;

    //Setters / Clearers
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
                this.children = c;
            }else{
                this.children = this.children.concat(c);
            }
        }
    };

    BTreeNodeAbstract.prototype.value = function(field,val){
        this.values[field] = val;
    };

    BTreeNodeAbstract.prototype.type = function(typeString){
        if(typeString === 'seq'){
            this.type = SEQ;
        }else if(typeString === 'par'){
            this.type = PAR;
        }else if(typeString === 'cho'){
            this.type = CHO;
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
        this.children[childId].cleanup(status === FAIL ? false : true );
        //console.log("Informed",this.id,this);
        if(this.currentAbstract === undefined){ return; }
        if(this.currentAbstract.type === SEQ){            
            if(status === SUCCESS){
                ////increment step counter
                this.status = ACTIVE;
                this.sequenceCounter++;
                this.SEQ_Update()
            }else if(this.parent){
                this.parent.inform(this.id,STATUS);
            }
        }else if(this.currentAbstract.type === CHO){
            //if success
            ////cleanup            
            //if fail
        }else if(this.currentAbstract.type === PAR){
            //if success
            ////increment success counter
            //if fail
            ////increment fail counter
            //cleanup children if necessary
        }
    };


    /**
       update
       The main update function outsources most things
     */
    BTreeNodeReal.prototype.update = function(){
        try{
            if(this.shouldFail()){
                //console.log("Failing");
                throw new Error("Behaviour Fails");
            }
            if(this.shouldWait()){
                //console.log("Waiting");
                this.status = WAIT;
            }
            this.runActions();
            this.typeUpdate();
        }catch(error){
            //propagate the failure
            if(this.parent){
                this.parent.inform(this.id,FAIL);
            }
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
        if(this.currentAbstract.type === SEQ){
            this.SEQ_Update();
        }else if(this.currentAbstract.type === CHO){
            this.CHO_update();
        }else if(this.currentAbstract.type === PAR){
            this.PAR_update();
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
       SEQ_update
       when called, steps the state of a sequential behaviour forward
    */
    BTreeNodeReal.prototype.SEQ_Update = function(){
        let nextBehaviourName = this.currentAbstract.children[this.sequenceCounter];
        //console.log("Adding:",nextBehaviourName);
        if(nextBehaviourName !== undefined){
            this.addChild(nextBehaviourName);
        }else if(this.parent){
            //console.log('informing parent');
            this.parent.inform(this.id,SUCCESS);
        }
    };

    /**
       CHO_update
       steps a choice behaviour forward
    */
    BTreeNodeReal.prototype.CHO_update = function(){
        //make a choice from the specified alternatives and add that
        //if an attempt fails, try the next alt of it,
        //then fail
        //succeed if the child succeeds
        if(this.lastReturnStatus === SUCCESS){
            if(this.sequenceCounter === 0){
                let potentialChildren = this.currentAbstract.children,
                selectedChild = _.sample(potentialChildren),
                    addSuccess = this.addChild(selectedChild);
                this.sequenceCounter = 1;
                if(selectedChild === undefined || !addSuccess){
                    this.status = FINISHED;
                    this.returnStatus = SUCCESS;
                }
            }else{
                this.status = FINISHED;
                this.returnStatus = SUCCESS;
            }
        }else{
            this.shiftToNextSpecificity();
            if(this.currentAbstract === undefined){
                this.status = FINISHED;
                this.returnStatus = FAIL;
            }
        }        
    };

    /**
       PAR_update
       steps a parallel behaviour foward
    */
    BTreeNodeReal.prototype.PAR_update = function(){
        //if children havent been added, do that

        //if enough successes have occured, succeed the node, cleaning up the children

        //if enough failures have occurred, fail the node, cleaning up the children

        
        
        //add the specified number of alternatives simultaneously
        //if an attempt fails, try the next alt of it,
        //if all alts of an alternative fail, increment the fail counter
        //if all alternatives fail, or the pfcounter gets too hight, fail
        //if an attempt succeeds, incrememnt the success counter
        //if the success counter is high enough, succeed the node,
        //todo: be able to cleanup zombie children

    };

    //Cleanup:
    BTreeNodeReal.prototype.cleanup = function(performPostActions){
        //remove self from the conflict set 
        this.bTreeRef.conflictSet.delete(this);
        if(this.parent){
            delete this.parent.children[this.id];
        }
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
        //console.log("Adding: ",childName);
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
        //root of the working tree: no abstract, spec, values, or parent. 
        this.root = new BTreeNodeReal(this.getAbstracts('initialTree'),undefined,undefined,undefined,this);
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
            'seq' : SEQ,
            'par' : PAR,
            'cho' : CHO
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
        return new BehaviourMonad([newBeh],this);
    };
    
    /**
       Update the conflict set:
    */
    /**
       update a node from the conflict set
     */
    BTree.prototype.update = function(){
        //console.log(`Conflict Set: `, Array.from(this.conflictSet).map(d=>d.currentAbstract.name));
        let chosenNode = _.sample(Array.from(this.conflictSet));
        if(chosenNode){
            //console.log("Chosen a node");
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

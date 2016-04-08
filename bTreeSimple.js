/* jshint esversion : 6 */
if(typeof define !== 'function'){
    var define = require('amdefine')(module);
}

define(['underscore','./ExclusionFactBase'],function(_,ExFB){
    "use strict";
    var gid = 0,
        //Behaviour Types
        SEQ = Symbol(),
        PAR = Symbol(),
        CHO = Symbol(),
        //Node States:
        ACTIVE = Symbol(),
        FIN = Symbol(),
        INACTIVE = Symbol(),
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
        this.performActions = [d=>console.log(`${this.name} default action`)];
        this.exitActions = [];
        //----------
        this.values = {};
        this.priority = 0;
        this.specificity = 0;
        //names to be reified, in order of execution type
        this.children = [];
    };
    BTreeNodeAbstract.constructor = BTreeNodeAbstract;

    BTreeNodeAbstract.prototype.priority = function(v){
        this.priority = v || 0;;
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
    }
    
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

    BTreeNodeAbstract.prototype.children = function(c){
        if(typeof c !== 'string'){
            return;
        }
        let individualChildren = c.split(/,/).map(d=>d.trim());
        this.children = this.children.concat(individualChildren);        
    };

    BTreeNodeAbstract.prototype.value = function(field,val){
        this.values[field] = val;
    }

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
        this.bTreeRef = bTreeRef;
        this.abstractNodes = _.clone(abstractNodes) || [];
        this.currentSpecificity = specificity || 0;
        this.currentAbstract = this.abstractNodes[this.currentSpecificity];

        if(this.currentAbstract){
            //perform the entry actions of the initial successful abstract:
            let entryActions = this.currentAbstract.entryActions.map(d=>_.bind(d,this));
            entryActions.forEach(d=>d(this.bTreeRef));
        }
        //current specificity. goes 0 -> abstractNodes.length
        //this.currentSpecificity = 0;
        //The values of the instanced node
        this.values =  values || {};
        //parent:
        this.parent = parent;
        //the actual children of the node
        this.children = {};
        //The bound action:
        //this.action = _.bind(this.abstractNode.action,this);
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

    BTreeNodeReal.prototype.shiftToNextSpecificity = function(){
        this.currentSpecificity++;
        this.currentAbstract = this.abstractNodes[this.currentSpecificity];
        while(this.currentAbstract !== undefined && !this.bTreeRef.testConditions(current.entryConditions)){
            this.currentSpecificity++;
            this.currentAbstract = this.abstractNodes[this.currentSpecificity];
        }
        if(this.currentAbstract === undefined){
            return false;
        }
        return true;
    };
    
    //run update code of seq/par/choice
    //this would be a good place for a generator function?
    //returns true for executed, false for wait
    BTreeNodeReal.prototype.update = function(){
        console.log('updating:',this.id);
        if(this.bTreeRef.testConditions(this.currentAbstract.failConditions)){
            console.log('failing');
            //try to go to next specificity:
            this.shiftToNextSpecificity();
            console.log('resulting ca:',this.currentAbstract);
            if(this.currentAbstract === undefined){
                this.status = FIN;
                this.returnStatus = FAIL;
                return true;
            }else{
                return false;
            }
        }
        if(!this.bTreeRef.testConditions(this.currentAbstract.waitConditions)){
            console.log("waiting");
            return false;
        }

        //perform perform actions
        let actions = this.currentAbstract.performActions.map(d=>_.bind(d,this));
        actions.forEach(d=>d(this.bTreeRef));

        //deal with children according to type:
        if(_.keys(this.children).length > 0){
            if(this.currentAbstract.type === SEQ){
                this.SEQ_Update();
            }else if(this.currentAbstract.type === CHO){
                this.CHO_update();
            }else if(this.currentAbstract.type === PAR){
                this.PAR_update();
            }
        }else{
            this.status = FIN;
            this.returnStatus = SUCCESS;
        }

        if(this.status === FIN && this.returnStatus === SUCCESS){
            let postActions = this.currentAbstract.exitActions.map(d=>_.bind(d,this));
            postActions.forEach(d=>d(this.bTreeRef));
        }
        return true;
    };

    /**
       SEQ_update
       when called, steps the state of a sequential behaviour forward
    */
    BTreeNodeReal.prototype.SEQ_Update = function(){
        if(this.lastReturnStatus === SUCCESS){
            //get the next abstract behaviour in the sequence
            //todo: extract assignments and set the reified node as necessary
            let nextBehaviourName = this.children[this.sequenceCounter++];
            if(nextBeh){
                //add the next behaviour, top most specificity
                let addSuccess = this.addChild(nextBehaviourName);
                if(!addSuccess){
                    this.status = FIN;
                    this.returnStatus = FAIL;
                }
            }else{
                //if none left, finish this behaviour successfully
                this.status = FIN;
                this.returnStatus = SUCCESS;
            }
        }else{
            //if the last attempt failed, try the next specificity
            this.shiftToNextSpecificity();
            if(this.currentAbstract === undefined){
                this.status = FIN;
                this.returnStatus = FAIL;
            }
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
    };

    /**
       PAR_update
       steps a parallel behaviour foward
    */
    BTreeNodeReal.prototype.PAR_update = function(){
        //add the specified number of alternatives simultaneously
        //if an attempt fails, try the next alt of it,
        //if all alts of an alternative fail, increment the fail counter
        //if all alternatives fail, or the pfcounter gets too hight, fail
        //if an attempt succeeds, incrememnt the success counter
        //if the success counter is high enough, succeed the node,
        //todo: be able to cleanup zombie children
    };

    //given a set of abstract nodes,
    //reify them into children
    BTreeNodeReal.prototype.addChild = function(childName){
        console.log("adding:",childName);
        let abstracts = this.bTreeRef.getAbstracts(childName),
            i = 0,
            current = abstracts[i],
            realBehaviour;
        //test for entry success
        while(current !== undefined && !this.bTreeRef.testConditions(current.entryConditions)){
            current = abstracts[++i];
        }
        //create the behaviour with the correct spec off set
        if(current !== undefined){
            realBehaviour = new BTreeNodeReal(abstracts,i,{},this,this.bTreeRef);
            //console.log("Created new Real Behaviour:",realBehaviour.id);
            //console.log("Abstract used:",i,abstracts);
            return true;
        }
        return false;
    };

    //------------------------------------------------------------------------------
    /**
       Behaviour Collection /monad for easy definition of abstract behaviours
    */
    var BehaviourMonad = function(behaviours){
        this.behaviours = behaviours;
    };

    //Apply the specified variables to the function of the btnodeabstract
    BehaviourMonad.prototype.applyTo = function(paramName,variables){
        if(BTreeNodeAbstract.prototype[paramName] !== undefined){
            this.behaviours.forEach(function(d){
                BTreeNodeAbstract.prototype[paramName].apply(d,variables);
            });
        }
        return this;
    };

    BehaviourMonad.prototype.priority = function(...vars){
        return this.applyTo('priority',vars);
    };

    BehaviourMonad.prototype.type = function(...vars){
        return this.applyTo('type',vars);
    };
    
    BehaviourMonad.prototype.entryCondition = function(...vars){
        return this.applyTo('entryCondition',vars);
    }

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

    BehaviourMonad.prototype.children = function(...vars){
        return this.applyTo('children',vars);
    };

    BehaviourMonad.prototype.value = function(...vars){
        return this.applyTo('value',vars);
    }
    
    //------------------------------------------------------------------------------
    /**
       The Tree Controller
    */
    var BTree = function(){

        //id -> node
        this.behaviourLibrary = {};
        this.allRealNodes = {};
        //root of the working tree
        this.root = new BTreeNodeReal(undefined,undefined,undefined,undefined,this);
        //console.log('Root id: ',this.root.id);
        //the conflict set:
        this.conflictSet = new Set();
        this.conflictSet.add(this.root);
        //The Fact Base:
        this.fb = new ExFB();
        
        //Node Constructor
        this.NodeTypes = {
            'seq' : SEQ,
            'par' : PAR,
            'cho' : CHO
        };        
    };
    BTree.constructor = BTree;

    //Get a registered abstract behaviour
    BTree.prototype.getAbstracts = function(name){
        if(this.behaviourLibrary[name] !== undefined){
            return this.behaviourLibrary[name];
        };
        return [];
    };
    
    /**
       Register an Abstract Behaviour
    */
    BTree.prototype.behaviour = function(name){
        if(this.behaviourLibrary.name){
            return this.behaviourLibrary.name;
        }
        let newBeh = new BTreeNodeAbstract(name);
        console.log('Created new Abstract Behaviour: ',newBeh.id);
        if(this.behaviourLibrary[name] === undefined){
            this.behaviourLibrary[name] = [];
        }
        this.behaviourLibrary[name].push(newBeh);
        console.log("Behaviour Library:",_.keys(this.behaviourLibrary));
        return new BehaviourMonad([newBeh]);
    };
    
    /**
       Update the conflict set:
    */
    BTree.prototype.updateConflictSet = function(){
        //remove finished nodes, updating parents as necessary
        let conflictSet = Array.from(this.conflictSet),
            finNodes = conflictSet.filter(d=>d.status === FIN);
        console.log('Finished Nodes:',finNodes.map(d=>d.id));
        finNodes.forEach(function(d){
            let parent = d.parent,
                returnStatus = d.returnStatus;
            delete parent.children[d.id];
            delete this.allRealNodes[d.id];
            if(_.keys(parent.children) === 0){
                parent.status = ACTIVE;
                parent.lastReturnStatus = returnStatus;
                this.conflictSet.add(parent);
            }
            this.conflictSet.delete(d);
        },this);
    };

    //update
    BTree.prototype.update = function(){
        console.log('initial conflict set:',Array.from(this.conflictSet).map(d=>d.id));
        this.updateConflictSet();
        console.log("Conflict Set:",Array.from(this.conflictSet).map(d=>d.id));
        //adapt to select based on priority etc
        let chosenNode = _.sample(Array.from(this.conflictSet));
        if(chosenNode){
            chosenNode.update();
        }
    };

    BTree.prototype.testConditions = function(testStatements){
        //check testStatements against fact base.
        if(testStatements.length > 0){
            return true;
        }else{
            return false;
        }
    };    

    BTree.prototype.sortBehaviours = function(){
        this.behaviourLibrary[newBeh.name].sort(function(a,b){
            return b.specificity - a.specificity;
        });

    };
    
    return BTree;
});

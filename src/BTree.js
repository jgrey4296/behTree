import { BTreeEnums } from './BTreeEnums';
import { PriorityQueue } from 'priorityqueuejs';

//------------------------------------------------------------------------------
/**
   The Tree Controller
*/
class BTree {
    constructor(sharedFactBase,sharedAbstractLibrary,templateValues){
        this.id = BTreeEnums.gid++;
        this.debugFlags = new Map();
        //name -> [abstracts]
        this.behaviourLibrary = new Map();
        //default initial tree:
        let defaultInitialTree = new BTreeNodeAbstract('initialTree');
        defaultInitialTree.preference = -1;
        this.loadBehaviours([defaultInitialTree]);
        //a Map of sets
        this.behaviourTags = new Map();
        this.loadBehaviours(sharedAbstractLibrary);
        this.sortBehaviours();
        //id -> node
        this.allRealNodes = new Map();
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
        this.values = new Map(_.toPairs(templateValues));
        if(!this.values.has('name')){
            this.values.set('name',"Default BTree");
        }
        
        //Constructors
        this.BehaviourAbstract = BTreeNodeAbstract;
        this.BehaviourReal = BTreeNodeReal;
        this.StatefulBehaviour = StatefulBehaviour;
        //Symbols
        this.NodeTypes = {
            'sequential' : BTreeEnums.SEQUENTIAL,
            'parallel' : BTreeEnums.PARALLEL,
            'choice' : BTreeEnums.CHOICE
        };
        this.persistenceTypes = {
            'successPersistence' : BTreeEnums.SUCCESSPERSIST,
            'failurePersistence' : BTreeEnums.FAILPERSIST,
            'defaultPersistence' : BTreeEnums.PERSIST
        };
        this.returnTypes = {
            'success' : BTreeEnums.SUCCESS,
            'fail' : BTreeEnums.FAIL
        };
    }
}
BTree.constructor = BTree;

BTree.prototype.setDebugFlags = function(...flags){
    flags.forEach(f=>{
        if (!this.debugFlags.has(f)){
            this.debugFlags.set(f,true);
        }else{
            this.debugFlags.set(f,!this.debugFlags.get(f));
        }
    });
};

BTree.prototype.debug = function(flag,...messages){
    if(this.debugFlags.has(flag)){
        messages.forEach(d=>{
            if(typeof d === 'function'){
                d = d()
            }
            console.log('DEBUG:',flag,d);
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
    values.forEach(d=>this.fb.parse(d));
};

BTree.prototype.retract = function(...values){
    values.forEach(d=>this.fb.parse(d));
};

//Load descriptions of behaviours
BTree.prototype.loadBehaviours = function(behaviourLibraryAdditions){
    //console.log("Loading: ",behaviourLibraryAdditions);
    if((behaviourLibraryAdditions instanceof Array) && behaviourLibraryAdditions.length > 0){
        behaviourLibraryAdditions.forEach(function(d){
            //TODO: Check what THIS is
            if(typeof d === 'function'){
                d(this);
            }else if(d instanceof Array){
                this.loadBehaviours(d);
            }else if(d instanceof BTreeNodeAbstract){
                if(!this.behaviourLibrary.has(d.name)){
                    this.behaviourLibrary.set(d.name) = [];
                }
                this.behaviourLibrary.get(d.name).push(d);
            }                
        },this);
    }
};

//Create a separate BTree, but with shared facts, and behaviour library
BTree.prototype.newCharacter = function(contextValues){
    let newCharacter = new BTree(this.fb,Array.from(this.behaviourLibrary.values()),contextValues);
    return newCharacter;
};

/**
   getAbstracts
   Given a name, get the array of abstracts, which are sorted by specificity
   @param {String} name
*/
BTree.prototype.getAbstracts = function(name){
    if(this.behaviourLibrary.has(name)){
        return this.behaviourLibrary.get(name);
    }
    return [];
};


/**
   Register an Abstract Behaviour
   @param {String} name
*/
BTree.prototype.Behaviour = function(name){
    if(! this.behaviourLibrary.has(name)){
        this.behaviourLibrary.set(name) = [];
    }
    let newBeh = new BTreeNodeAbstract(name);
    this.behaviourLibrary.get(name).push(newBeh);
    if(this.root && name === 'initialTree'){
        this.root.abstractNodes = this.behaviourLibrary.get('initialTree');
        this.root.currentAbstract = this.root.abstractNodes[0];
    }        
    return new StatefulBehaviour([newBeh],this);
};

/**
   The main update method, steps the btree forward
*/
BTree.prototype.update = function(){
    //Sort the conflict set by priority, choose from the top 5 in the set
    //console.log("Conflict Set:",Array.from(this.conflictSet).map(d=>d.currentAbstract.name));
    this.debug('preConflictSet',d=>Array.from(this.conflictSet).map(d=>d.currentAbstract.name));

    //run context conditions, deal with failures
    this.contextConditions.forEach((conds,node)=>{
        if(!this.testConditions(conds,node)){
            node.informParent(node.currentAbstract.contextType,true);
        }
    });
    
    /*
      TODO: calculate priorities based on priorityrules
      forEach a in conflictSet, apply rules, aggregate values, then sort, then slice
    */
    let conflictPriorityQueue = new PriorityQueue(true),
        potentials = [],//maximise
        chosenNode,
        lastReturn = WAIT;
    //calculate each behaviour, add it into the priority queue:
    this.debug('conflictSet',this.conflictSet);
    this.conflictSet.forEach(d=>conflictPriorityQueue.insert(d,d.priority()));

    //Only get the top N possible behaviours
    for(let i = this.conflictSetSelectionSize; i > 0 && !conflictPriorityQueue.empty(); i--){
        potentials.push(conflictPriorityQueue.next());
    }
    potentials = _.shuffle(potentials);
    
    while(lastReturn === WAIT && potentials.length > 0){
        chosenNode = potentials.shift();
        if(chosenNode){
            lastReturn = chosenNode.update();
        }
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
        }else if(typeof currentTestStatement === 'string'){
            //returns either an object of bindings, or true/false
            lastResult = this.fb.parse(currentTestStatement);
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


BTree.prototype.addReifiedNode = function(node){
    if ( ! this.allRealNodes.has(node.id) ){
        this.allRealNodes.set(node.id,node);
    }
};

BTree.prototype.removeReifiedNode = function(nodeId){
    this.allRealNodes.delete(nodeId);
};

BTree.prototype.cleanup = function(){
    //Cleanup all nodes
};


export { BTree };

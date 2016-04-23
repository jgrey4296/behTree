# behTree - a Javascript Behaviour Tree based on [ABL](https://abl.soe.ucsc.edu/index.php/Main_Page)

## Example
```
    var BTree = require('./bTreeSimple'),
        bTreeInstance = new BTree();
    
    //Create a Behaviour:
    bTreeInstance.Behaviour('myTestBehaviour')
        .performAction(d=>console.log("test"));
        
    bTreeInstance.root.addChild('myTestBehaviour');
    
    bTree.update();
```

## Production usage:
modify the bTreeSimple dependencies of the `exclusionFactBase` and `priorityQueue` to correct paths.
    

## Files
* bTreeSimple.js - The Main Behaviour Tree Library
* tests.js - The unit tests
* exampleBehaviours.js - A Module of defined behaviours
* example.js - A simple program that uses the defined behaviours
* plan.org - Emacs org mode tracking of tasks

## Dependencies
[PriorityQueue.js](https://github.com/jgrey4296/priorityQueue.js)  
[ExclusionLogic](http://github.com/jgrey4296/exclusionLogic) for internal facts and tests  
[lodash](https://lodash.com/)  
[NodeUnit](https://github.com/caolan/nodeunit) for unit tests  

## Basic Usage
All on an instance `var bTree = new BTree();`

### Behaviour Definition
To define a new behaviour, call `bTree.Behaviour('myTestBehaviour');`  
This returns a container on which definition methods can be called.
Thus:
```
    bTree.Behaviour('myTestBehaviour')
        .priority(5)
        .type('sequential')
        .performAction(d=>console.log('hello'));
```

### Aggregation of Behaviours
You can combine behaviours together for editing purposes:
```
    let beh1 = bTree.Behaviour('testBehaviour1'),
        beh2 = bTree.Behaviour('testBehaviour2');
        
    beh1.add(beh2);
    
    beh1.priority(5); //both testBehaviour1 and testBehaviour2 now have priority 5
```

### Behaviour Loading
Define behaviours in modules as arrays of defining functions, then load with `loadBehaviours`:
```
    let BehaviourModule = [];
    BehaviourModule.push(function(bTreeRef){
        bTreeRef.Behaviour('blah')
            .performAction(c=>console.log('blah'));
    });

    BehaviourModule.push(function(bTreeRef){
        bTreeRef.Behaviour('other')
            .performAction(c=>console.log('other'));
    });

    //the first undefined i'll come to later
    let bTreeInstance = new BTree(undefined,BehaviourModule);
    //Alternatively:
    bTreeInstance.loadBehaviours(BehaviourModule);
```

### 'Character' Creation
From a template behaviour tree, you can create character instances using `newCharacter`,
which shares the same fact base, and behaviour definitions:
```
    let bTree = new BTree(),
        bob = bTree.newCharacter({
            name : "bob"
        });
```

### Behaviour Parameters
Behaviours have values, tags, actions, and conditions that can be set: 

#### Values and Tags
Custom values and tags can be set with `.value(key,value)` and `.tag(tagName,deleteTag?)`. 
Such custom values and tags can be accessed in conditions and actions (see below).  

There are also predefined values and parameters:
- `type` : can be "sequential", "parallel", "choice",
- `priority` : a number
- `preference` : a number
- `persistent` : `true` | `false` | "success" | "fail"
- `contextType` : "success" | "fail"
- `subgoal` : strings

#### Conditions

#### Actions


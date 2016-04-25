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

[Example project](https://github.com/jgrey4296/aiOnHexBoard)


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
which shares the same fact base, and behaviour definitions, but private values:
```
    let bTree = new BTree(),
        bob = bTree.newCharacter({
            name : "bob",
            age : 23
            
        })
        bill = bTree.newCharacter({
            name : "bill":
            age : 40
        });
```
Above, `bob.values.age` === 23, `bill.values.age` === 40. In conditions and actions:
```
    .entryAction((bt,n)=>console.log(`${bt.values.name} is ${bt.values.age} years old`));
```

### Behaviour Parameters
Behaviours have values, tags, actions, and conditions that can be set: 

#### Values and Tags
Custom values and tags can be set with `.value(key,value)` and `.tag(tagName,deleteTag?)`. 
Such custom values and tags can be accessed in conditions and actions (see below).  

There are also predefined values and parameter method setters:
- `.type(val)` : can be "sequential", "parallel", "choice",
- `.priority(val)` : a number
- `.preference(val)` : a number
- `.persistent(val)` : `true` | `false` | "success" | "fail"
- `.contextType(va)` : "success" | "fail"
- `.subgoal(...vals)` : strings

#### Conditions
Conditions are specified in three forms: Boolean Functions, ExclusionLogic Strings, and Functions returning
Exclusion Logic Strings. The functions take two parameters: the `bTree` instance, and the `currentNode` instance of the tree.  

1. Boolean functions
   ```
       bTree.Behaviour('myTestConditionBehaviour')
        .entryCondition((bt,n)=>bt.values.name === 'bob');
    ```

2. Exclusion Logic Strings:
   ```
       bTree.Behaviour('myTestStringBehaviour')
           .entryCondition('.characters.bob');
   ```
3. Exclusion Logic Functions:
   ```
       bTree.Behaviour('myTestExLoStringBehaviour')
           .entryCondition((c,n)=>`.${c.values.name}.location.kitchen`);
   ```

There are a number of conditions that can be tested for, set using the following methods:
- `.entryCondition()` : Tested upon an attempt to instantiate the behaviour.
- `.waitCondition()` : Tests whether the node should wait before executing
- `.failCondition()` : Tests whether the node should fail (at performance time)
- `.persistCondition()` : Tests whether the node should reset and stay on the active tree when it completes
- `.contextCondition()` : Tested every bTree update cycle, can fail the behaviour without focus on it
- `.priorityCondition()` : Tested to determine conflict set priority

You can specify conditions in one call or multiple:
```
    //will test for all three
    b1.entryCondition(".character.bob",".character.bill")
        .entryCondition(".character.jill");
```
And you can clear by calling with nothing:
```
    b1.entryCondition();
```

##### Condition binding:
The Exclusion Logic Language allows for binding of values, locally to the instanced behaviour node:
```
    bTree.Behaviour('test')
        .entryCondition(bt=>`.${bt.values.name}.items.%1{x}`)
        .performAction((bt,n)=>console.log(`${bt.values.name} has a ${n.bindings.x}`));
```

##### Priority Conditions
Priority conditions define modifiers to behaviours' priority value, which is used for selecting 
which behaviour to execute at any particular time from the conflict set.
This makes use of value return from Exclusion logic:
```
    bTree.Behaviour('anotherTestBehaviour')
        .priorityCondition(".kitchen.bob^2/-4");
```
Will increase the priority of anotherTestBehaviour if bob is in the kitchen, if he isn't, the priority of the behaviour will decrease by 4.

#### Actions
Actions are specified in a similar way to conditions, take the same parameters (the `bTree` instance and the current `node` on the working tree). 
The defined action points are:
- `.entryAction()` : 
- `.performAction()` : 
- `.exitAction()` : 
- `.failAction()` : 



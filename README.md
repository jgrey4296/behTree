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

### Behaviour Definition

### Behaviour Types

### 'Character' Creation

### The Initial Tree

### Manual Subgoaling

## Conditions

## Actions

## Persistence

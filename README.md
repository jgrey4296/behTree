# behTree - a Javascript Behaviour Tree based on ABL

##Example
```javascript
    var BTree = require('./bTreeSimple'),
        bTreeInstance = new BTree();
    
    //Create a Behaviour:
    bTreeInstance.Behaviour('myTestBehaviour')
        .type('parallel')
        .children('move','shoot');
```


##Files
* bTreeSimple.js - The Main Behaviour Tree Library
* bTreeTests.js - The unit tests
* exampleBehaviours.js - A Module of defined behaviours
* testUsage.js - A simple program that uses the defined behaviours
* plan.org - Emacs org mode tracking of tasks

##Dependencies
[Underscore](http://underscorejs.org)
[ExclusionLogic](http://github.com/jgrey4296/exclusionLogic)



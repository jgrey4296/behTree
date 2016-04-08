/* jshint esversion : 6 */

/**
   Creates a fact repository / tree
   @constructor
   @param {Array.<String>} the strings to assert on construction
 */
var ExclusionFactBase = function(...strings){
    this.root = new Map();
    strings.forEach(d=>this.assert(d));
};

/**
   Tokenizes an input string for parsing
   @method
   @param {String} string The string to tokenize based on '.' and '!'
   @returns {Array.<String>} tokens
 */
ExclusionFactBase.prototype.tokenize = function(string){
    return string.replace(/\./g," $DOT$ ").replace(/!/g," $EX$ ").split(" ").slice(1);
};

/**
   Takes fact strings (.place.people.bob!righthanded) and adds them to the fact base
   @method
   @param {Array.<String>} strings The strings to assert
   @returns {ExclusionFactBase}
*/
ExclusionFactBase.prototype.assert = function(...strings){
    "use strict";
    if(strings instanceof Array && strings.length > 1){
        strings.forEach(d=>this.assert(d));
        return this;
    }else{
        strings = strings.shift();
    }
    if(!strings[0].match(/[\.!]/)){
        throw new Error("String should start with a . or !");
    }
    //----------
    var tokens = this.tokenize(strings),
        current = this.root,
        next;

    while(tokens.length > 0){
        next = tokens.shift();
        //Options:
        if(next.match(/\$DOT\$/)){
            next = tokens.shift();
            if(current.has(next) && !current.exclusive){
                //does exist, current is non-exclusive
                current = current.get(next);
            }else if(!current.has(next) && !current.exclusive){
                //doesnt exist
                let newNonExclusion = new Map();
                newNonExclusion.exclusive = false;
                current.set(next,newNonExclusion);
                current = current.get(next);
            }else{
                //doesnt exist, but current is exclusive
                throw new Error(`Trying to assign non-exclusively parent of: ${next} in \n${strings}\n`);
            }
            //Exclusive:
        } else if(next.match(/\$EX\$/)){
            //note: can only move towards higher exclusivity, to move lower, retract and start again
            next = tokens.shift();
            if(current.has(next) && current.exclusive){
                //does exist, current is exclusive
                current = current.get(next);
            }else if(!current.has(next) && current.exclusive){
                //doesnt exist, current is exclusive
                current.clear();
                let newNonExclusion = new Map();
                newNonExclusion.exclusive = false;
                current.set(next,newNonExclusion);
                current = current.get(next);
            }else if(current.has(next) && !current.exclusive){
                //does exist, current is not exclusive -> clear and set exclusivity
                current.clear();
                current.exclusive = true;
                let newNonExclusion = new Map();
                newNonExclusion.exclusive = false;
                current.set(next,newNonExclusion);
                current = current.get(next);
            }else{
                //doesnt exist, isn't exclusive
                current.clear();
                current.exclusive = true;
                let newNonExclusion = new Map();
                newNonExclusion.exclusive = false;
                current.set(next,newNonExclusion);
                current = current.get(next);
            }
        }
    };
    return this;    
};

/**
   Boolean check for if the facts exist in the fact base
   @constructor
   @param {Array.<String>} strings The strings to test the fact base for
   @returns {Boolean} 
 */
//test a fact tree of maps for a particular string
ExclusionFactBase.prototype.exists = function(...strings){
    "use strict";
    if(strings instanceof Array && strings.length > 1){
        return strings.map(d=>this.exists(d)).reduce((m,v)=>m && v,true);
    }else{
        strings = strings.shift();
    }

    if(!strings[0].match(/[\.!]/)){
        throw new Error("String should start with a . or !");
    }

    
    //Single string:
    var tokens = this.tokenize(strings),
        current = this.root,
        next;
    
    while(tokens.length > 0){
        next = tokens.shift();
        if(next.match(/\$DOT\$/) && !current.exclusive){
            next = tokens.shift();
            if(current.has(next)){
                current = current.get(next);
            }else{
                return false;
            }
        }else if(next.match(/\$EX\$/) && current.exclusive){
            next = tokens.shift();
            if(current.has(next) && current.size === 1){
                current = current.get(next);
            }else{
                return false;
            }
        }else{
            return false;
        }
    }
    return true;
};

/**
   Retracts a single fact chain from the rule base
   @method
   @param {String} string
   @returns {Boolean} the success state of the retraction
   
 */
ExclusionFactBase.prototype.retract = function(string){
    "use strict";
    if(!string[0].match(/[\.!]/)){
        throw new Error("String should start with a . or !");
    }
    
    var tokens = this.tokenize(string),
        current = this.root,
        next;

    while(tokens.length > 2){
        next = tokens.shift();
        if(next.match(/[(\$DOT\$)(\$EX\$)]/)){
            next = tokens.shift();
            if(current.has(next)){
                current = current.get(next);
            }else{
                return false;
            }
        }else{
            return false;
        }
    }
    //final pair:
    next = tokens.shift();
    if(next.match(/[(\$DOT\$)(\$EX\$)]/)){
        next = tokens.shift();
        if(current.has(next)){
            current.delete(next);
            current.exclusive = false;
            return true;
        }else{
            return false;
        }
    }
    return false;
};

/**
   Gets a subtree out of the fact base
   @param {String} string The fact string describe where the subtree starts
   @returns {False || ExclusionFactBase} 
 */
ExclusionFactBase.prototype.retrieve = function(string){
    "use strict";
    var tokens = this.tokenize(string),
        current = this.root,
        next;

    while(tokens.length > 0){
        next = tokens.shift();
        if(next.match(/^[(\$DOT\$)(\$EX\$)]/)){
            next = tokens.shift();
            if(current.has(next)){
                current = current.get(next);
            }else{
                return false;
            }
        }
    }

    var subFactBase = new ExclusionFactBase();
    subFactBase.root = current;
    return subFactBase;    
};




module.exports = ExclusionFactBase;






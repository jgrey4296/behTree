/**
    Minimal Exclusion Logic Fact Base
 */
import _ from 'lodash';
import P from 'parsimmon';

class FactBase {

    constructor(){
        //facts :: ELTrie
        this.root = new Map();
    }

    //assert :: [ELString] -> Result
    assert(facts){
        let current = this.root;
        //Add the fact to the fact base
        foreach (var x in facts.data){
            if (!current.has(x)){
                current.set(x, new Map());
            }
            current = current.get(x);
        }
        return Result(true, null);
    }

    //retract :: [ELString] -> Result
    retract(facts){
        //Remove the fact from the fact base
        let prior = null,
            currents_key = null,
            current = this.root,
            finished = true,
            success= false;
        foreach (var x in facts.data){
            if(!current.has(x)){
                finished = false;
                break;
            }else{
                prior = current;
                currents_key = x;
                current = current.get(x);
            }
        }
        
        if (finished === true && prior !== null && currents_key !== null){
            prior.delete(currents_key);
            success = true;
        }            
            
        return Result(success, null);
    }

    //query :: [ELString] -> Result
    query(facts){
        //Retrieve existence and bindings from the fact base
        let current = this.root,
            finished = true,
            success = false,
            bindings = new Map();
        foreach ( var x in facts.data){
            if (!current.has(x)){
                finished = false;
                break;
            }
            //if x is a variable, select from options, and bind
            //backtrack if necessary, unbinding as necessary
            current = current.get(x);
        }        

        if (finished === true){
            success = true;
        }
        
        return Result(success, bindings);
    }
}

//isVar :: string -> boolean
function isVar(string){
    return False
}



class ELString {
    constructor(data){
        //data :: [String] 
        this.data = data;
        this.bound = new Map();
    }

    //bind :: Map -> ELFString
    bind(bindings){
        let bound_data = []

        return ELString(bound_data);
    }
    
}

class Result {
    //truthy :: boolean
    //bindings :: Map
    constructor(truthy, bindings){
        this.result = truthy;
        this.bindings = bindings;
    }
}

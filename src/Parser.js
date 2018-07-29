/**
   
*/
import * as P from 'parsimmon';

//Utility
//Optional whitespace wrapper:
let OWS = {parser} => { return P.optWhitespace.then(parser).skip(P.optWhitespace) },
    //non-optional whitespace sequence
    PWS = { parser } => { return parser.skip(P.whitespace) },
    WPW = { parser } => { return P.whitespace.then(parser).skip(P.whitespace); };

let parser = null;

export { parser };


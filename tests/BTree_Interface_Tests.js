import _ from 'lodash';
import * as chai from 'chai';
import { BTree } from '../src/BTree';

let should = chai.should(),
    expect = chai.expect;

describe('BTree Interface: ', function(){

    beforeEach(function(){
        this.btree = new BTree();
    });

    afterEach(function(){
        this.btree.cleanup()
        this.btree = null;
    });

    it("Should Exist", function(){
        expect(this.btree).to.exist();
    });

    describe("Basic Actions", function() {

        it("Should be able to add characters ", function(){
            
        });

        it("Should be able to add Behaviours", function(){
            
        });

        it("Should be able to load Behaviours", function(){
            
        });

        it("Should be able to assert", function(){
            
        });

        it("Should be able to retract", function(){
            
        });

        it("Should be able to add tags", function(){
            
        });

        it("Should be able to remove tags", function(){
            
        });
        
        it("Should be able to get abstract behaviours", function(){
            
        });

        it("Should be able to Sort Behaviours", function(){
            
        });

        it("Should be able to test conditions", function(){
            
        });

        it("Should be able to update the tree", function(){
            
        });

    });


    
});

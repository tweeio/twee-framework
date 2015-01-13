var assert = require("assert");

describe('Twee Framework Functionality', function(){
    var twee = require('../');

    it('should instantiate Twee Instance', function(){
        assert(typeof twee, 'object');
    });

    it('should inherit from event emitter', function(done){
        twee.on('foo', done);
        twee.emit('foo');
    });

    it('should normally bootstrap', function(){

    });
});

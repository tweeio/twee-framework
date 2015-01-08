"use strict";

/**
 * Extension that shows how it works
 */
module.exports.extension = function(){
    twee.getApplication().all('/extension', function(req, res){
        res.json({response: 'This is simple extension!'});
    });

    twee.registerViewHelper('hello', function(name){
        return 'Hello ' + name;
    });
};

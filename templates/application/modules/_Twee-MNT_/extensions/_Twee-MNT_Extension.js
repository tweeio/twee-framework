"use strict";

/**
 * Extension that shows how it works
 */
module.exports.extension = function(){
    twee.getApplication().all('/extension', function(req, res){
        res.json({response: tr('This is simple extension!')});
    });

    if (!twee.helper.hello) {
        twee.registerViewHelper('hello', function(name){
            return tr("Hello {{name}}", {name: name});
        });
    }
};

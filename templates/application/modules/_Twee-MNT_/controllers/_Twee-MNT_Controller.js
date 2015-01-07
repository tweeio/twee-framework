'use strict';

/**
 * @type Object _Twee-MNT_ Controller
 */
module.exports = function () {
    /**
     * Main Page
     *
     * @param req
     * @param res
     */
    this.indexAction = function (req, res) {
        var self = this;
        res.render('_Twee-MNT_/views/pages/_Twee-MNT_/index', {
            message: res.defaultMiddlewareMessage || '',
            variable: twee.getConfig('_Twee-MNT-LC_:common:variable')
        });
    };
};

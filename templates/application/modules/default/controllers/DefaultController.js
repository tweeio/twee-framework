'use strict';

/**
 * @type Object Default Controller
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
        res.render('default/views/pages/index', {
            message: res.defaultMiddlewareMessage || ''
        });
    };
};

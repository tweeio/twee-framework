/**
 * Simplest Range Param Example
 * @type {RegExp}
 */
module.exports = function(req, res, next, range) {
    if (range.match(/^(\d+)-(\d+)$/)) {
        return next();
    }

    next('route')
}
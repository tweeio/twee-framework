/**
 * Example of simple middleware
 *
 * @param request
 * @param response
 * @param next
 */
module.exports.defaultMiddleware = function(request, response, next) {
    response.defaultMiddlewareMessage = tr('This is simple middleware');
    next();
};

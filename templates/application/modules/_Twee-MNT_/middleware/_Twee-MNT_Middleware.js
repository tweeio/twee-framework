/**
 * Example of simple middleware
 *
 * @param request
 * @param response
 * @param next
 */
module.exports._Twee-MNT-LC_Middleware = function(request, response, next) {
    response.defaultMiddlewareMessage = tr('This is simple middleware');
    next();
};

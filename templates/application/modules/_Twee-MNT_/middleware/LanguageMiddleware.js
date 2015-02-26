/**
 * Switching language
 *
 * @param request
 * @param response
 * @param next
 */
module.exports.switchLanguage = function(request, response, next) {
    if (request.query.lang) {
        response.cookie('locale', request.query.lang, { maxAge: 9999999999999, path: '*.' });
        request.setLocale(request.query.lang);
    }

    next();
}
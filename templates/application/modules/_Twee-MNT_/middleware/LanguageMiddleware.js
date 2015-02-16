/**
 * Switching language
 *
 * @param request
 * @param response
 * @param next
 */
module.exports.switchLanguage = function(request, response, next) {
    if (request.query.lang) {
        if (request.query.lang.toLowerCase() == 'en' || request.query.lang.toLowerCase() == 'ru') {
            response.cookie('locale', request.query.lang, { maxAge: 900000 });
            request.setLocale(request.query.lang);
        }
    }

    next();
}
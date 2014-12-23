/**
 * Includes a template partial in place. The template is rendered within the current locals variable context.
 *
 * @example
 * {% include "/this/file/does/not/exist" ignore missing %}
 * // => (Nothing! empty string)
 *
 * @param {string|var}  class       Class of translation
 * @param {string|var}  entity      Entity to translate
 */
exports.compile = function (compiler, args) {
    var locale = String(global.locale).toLowerCase() || 'en';

    console.log(args);

    if (args.length < 1) {
        return '_output += "<font style=\'color: red;\'>NO TRANSLATION DETAILS SPECIFIED entity_class::entity</font>";';
    }

    return '';

    return db.models.translates.qAll({entity_class: 'home'})
        .then(function(translates){
            //console.dir(translates[0].translation);
            //_output += translates[0].translation;
            return translates[0].translation;
    });

    return '_output += db.models.translates.qAll({entity_class: \'home\'})' +
        '.then(function(translates){' +
            'console.dir(translates[0].translation); ' +
            '_output += translates[0].translation;' +
            'return translates[0].translation;' +
        '});';
};

/**
 * Simple parse function
 * @param str
 * @param line
 * @param parser
 * @param types
 * @param stack
 * @param opts
 */
exports.parse = function (str, line, parser, types, stack, opts) {
    var _class, w;
    parser.on(types.STRING, function (token) {
        if (!_class) {
            _class = token.match;
            this.out.push(_class);
            return;
        }

        return true;
    });

    return true;
};

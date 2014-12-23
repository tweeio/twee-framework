var ignore = 'ignore',
    missing = 'missing',
    only = 'only',
    swig_parse = require('swig/lib/tags/include').parse;

/**
 * Includes a template partial in place. The template is rendered within the current locals variable context.
 *
 * @alias include
 *
 * @example
 * // food = 'burritos';
 * // drink = 'lemonade';
 * {% include "./partial.html" %}
 * // => I like burritos and lemonade.
 *
 * @example
 * // my_obj = { food: 'tacos', drink: 'horchata' };
 * {% include "./partial.html" with my_obj only %}
 * // => I like tacos and horchata.
 *
 * @example
 * {% include "/this/file/does/not/exist" ignore missing %}
 * // => (Nothing! empty string)
 *
 * @param {string|var}  file      The path, relative to the template root, to render into the current context.
 * @param {literal}     [with]    Literally, "with".
 * @param {object}      [context] Local variable key-value object context to provide to the included file.
 * @param {literal}     [only]    Restricts to <strong>only</strong> passing the <code>with context</code> as local variables–the included template will not be aware of any other local variables in the parent template. For best performance, usage of this option is recommended if possible.
 * @param {literal}     [ignore missing] Will output empty string if not found instead of throwing an error.
 */
exports.compile = function (compiler, args) {
    var file = args.shift(),
        onlyIdx = args.indexOf(only),
        onlyCtx = onlyIdx !== -1 ? args.splice(onlyIdx, 1) : false,
        parentFile = (args.pop() || '').replace(/\\/g, '\\\\'),
        ignore = args[args.length - 1] === missing ? (args.pop()) : false,
        w = args.join(''),
        locale = String(global.locale).toLowerCase() || 'en';

    return (ignore ? '  try {\n' : '') +
        '_output += _swig.compileFile(' + file.replace('.lang.', '.' + locale + '.') + ', {' +
        'resolveFrom: "' + parentFile + '"' +
        '})(' +
        ((onlyCtx && w) ? w : (!w ? '_ctx' : '_utils.extend({}, _ctx, ' + w + ')')) +
        ');\n' +
        (ignore ? '} catch (e) {}\n' : '');
};

exports.parse = swig_parse;

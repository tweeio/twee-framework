/**
 * Twee Framework Functionality
 */

"use strict";

var express = require('express')
    , debug = require('debug')('TWEE.IO')
    , path = require('path')
    , colors = require('colors/safe')
    , fs = require('fs')
    , extend = require('./utils/extend')
    , events = require('events');

/**
 * TWEE.IO framework main class.
 * Usually framework can be instantiated like this:
 *
 *      var tweeKernel = require('twee').framework;
 *      var twee = new tweeKernel;
 *      // Now twee contains instance of TWEE.IO application
 *
 *      // After this you can start application for example like this:
 *      twee.run()
 *
 * @class twee
 * @extends EventEmitter
 * @constructor
 */
function twee() {

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MIDDLEWARE_TAIL                = 'tail';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MIDDLEWARE_HEAD                = 'head';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MODULE_SETUP_FOLDER            = 'setup/';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MODULE_SETUP_FILE              = 'setup/setup';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MODULE_CONFIGS_FOLDER          = 'setup/configs/';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MODULE_CONTROLLERS_FOLDER      = 'controllers/';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MODULE_MODELS_FOLDER           = 'models/';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MODULE_MIDDLEWARE_FOLDER       = 'middleware/';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MODULE_PARAMS_FOLDER           = 'params/';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MODULE_VIEWS_FOLDER            = 'views/';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MODULE_EXTENSIONS_FOLDER       = 'extensions/';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MODULE_I18N_FOLDER             = 'i18n/';

    /**
     * @readonly
     * @property
     * @type {string}
     */
    this.MODULE_ASSETS_FOLDER           = 'assets/';

    /**
     * Express Application Instance which is used to
     * provide into it all the middleware functions, params and stuff
     * that is related to usual Express.js application.
     *
     * Access to this instance could be received using twee.getApplication()
     *
     * Example:
     *
     *      // Just returning Express.js application instance
     *      twee.getApplication();
     *
     *      // hardcore middleware installation
     *      twee.getApplication().all(
     *          '/some-url/',
     *          function(req, res){
     *
     *          }
     *      );
     *
     * @type {Object}
     * @property
     * @private
     */
    this.__app = null;

    /**
     * Flag that shows that framework already has been bootstrapped
     * 
     * @type {boolean}
     * @property
     * @private
     */
    this.__bootstrapped = false;

    /**
     * Base Directory for including all the modules and bootstrapping your applications from
     * To get base directory you should call twee.getBaseDirectory()
     *
     * @type {String}
     * @property
     * @private
     */
    this.__baseDirectory = '';

    /**
     * Environment string. It could be any of:
     *
     *  - production
     *  - development
     *  - testing
     *  - developer1
     *
     *  It allows you to have as many environments as you need
     *
     * @type {String}
     * @property
     * @private
     */
    this.__env = 'production';

    /**
     * Configuration object. Stores all the modules, kernel and extensions configurations
     *
     * @type {}
     * @property
     * @private
     */
    this.__config = {};

    /**
     * Registry of extensions to avoid infinity recursion during dependencies resolving
     *
     * @type {}
     * @property
     * @private
     */
    this.__extensionsRegistry = {};

    /**
     * Helpers registry. Allows to register helpers for views and withing __twee__ instance.
     *
     * To understand how to register new helper look at twee.registerHelper.
     *
     * Example in views:
     *
     *      {{ helper.foo(...) }} or {{ helper['foo'](...) }}
     *
     * Using twee instance:
     *
     *      twee.helper.foo(...)
     *
     * @property
     * @type {Object}
     */
    this.helper = {};

    /**
     * Extending one config from another one or more than one.
     *
     * For full documentation of this method look at jQuery analogue:
     * [http://api.jquery.com/jquery.extend/](http://api.jquery.com/jquery.extend/)
     *
     * @method
     * @type function
     */
    this.extend = extend;

    /**
     * HTTP Server instance. For more details look at
     * [http://nodejs.org/api/http.html#http_http_createserver_requestlistener](http://nodejs.org/api/http.html#http_http_createserver_requestlistener)
     *
     * @type {http.Server}
     * @property
     * @private
     */
    this.__http = null;

    /**
     * HTTPS Server instance of Node.js.
     * For more details read official node.js documentation:
     * [http://nodejs.org/api/https.html#https_https_createserver_options_requestlistener](http://nodejs.org/api/https.html#https_https_createserver_options_requestlistener)
     *
     * @type {https.Server}
     * @property
     * @private
     */
    this.__https = null;

    /**
     * For recursion deepness control during dependencies resolving process on application bootstrapping.
     *
     * @type {number}
     * @property
     * @private
     */
    this.__extensionsRecursionDeepness = 0;

    /**
     * Registry of different objects
     *
     * @type {}
     * @property
     * @private
     */
    this.__registry = {};

    /**
     * Registry of middleware lists that are used in dispatch process
     *
     * @type {}
     * @property
     * @private
     */
    this.__middlewareListRegistry = {};

    /**
     * Path to modules configuration file in current application
     *
     * @type {String}
     * @property
     * @private
     */
    this.__modulesConfig = 'configs/modules';

    /**
     * Main framework configuration file provided from application folder
     *
     * @type {String}
     * @property
     * @private
     */
    this.__tweeConfig = 'configs/twee';

    /**
     * Hash where keys are extensions names and values
     * are indexes of these extensions in global extensions config.
     *
     * @property
     * @type {Object}
     * @private
     */
    this.__extensionsIndexesByName = {};

    /**
     * Final calculated sequence of indexes of extensions according which they should be loaded.
     *
     * @property
     * @type {Array}
     * @private
     */
    this.__extensionsSequence = [];

    /**
     * Final calculated sequence of extensions names.
     *
     * For logging and debugging purpose.
     *
     * @property
     * @type {Array}
     * @private
     */
    this.__extensionsNamesSequence = [];

    /**
     * The registry of controllers for application
     *
     * @property
     * @type {{}}
     * @private
     */
    this.__controllersRegistry = {};
}

/**
 * EventEmitter is base class for TWEE.IO. It means that we can use framework instance to play with events.
 */
twee.prototype.__proto__ = new events.EventEmitter();

/**
 * Getting property from framework internal registry by it's name.
 * The name is required, if it is not provided or property wasn't registerd before,
 * then __null__ will be returned.
 *
 * Example:
 *
 *      twee.set('pi', 3.14)
 *      twee.get('pi')                      // -> 3.14
 *      twee.get('nonExistingProperty')     // null
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} name
 * @returns {*|null}
 */
twee.prototype.get = function(name) {
    return this.__registry[name] || null;
};

/**
 * Setting property by it's name in framework's application instance
 *
 * Example:
 *
 *      twee.set('pi', 3.1415987);
 *
 * Now it is available as twee.get('pi')
 *
 * The __value__ can be missed, then it will be set as __undefined__.
 *
 * The __name__ is required, otherwise method will throw an exception.
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} name The name of property to set in registry
 * @param {*} value
 * @returns {twee}
 */
twee.prototype.set = function(name, value) {
    name = String(name || '').trim();
    if (!name) {
        throw new Error('Object name should be non-empty string');
    }
    this.__registry[name] = value;
    return this;
};

/**
 * Running application
 *
 * @chainable
 * @method
 * @member twee
 */
twee.prototype.run = function() {
    this.setBaseDirectory();
    this.Bootstrap();
    return this;
};

/**
 * Returning config by it's path. The path should be in format:
 *
 *      entity:filename:config[:sub-config[...]]
 *
 * Entity could be following:
 *
 *  * __twee__ - internal framework configuration
 *  * __module-name__ - module-specific configuration, for example: __blog_ or __forum__. It is always lower-cased.
 *  * __extension-name__ - extension-specific configuration, for example __twee-i18n__. This name depends of extension.__configNamespace__ which you should look in extension README
 *
 * Where parts of config path should divided with __":"__.
 *
 * For example if we need to return internal framework config value:
 *
 *      twee.getConfig('twee:options:http:port')
 *
 * Example of getting contents of __twee-i18n-extension__ extension config:
 *
 *      twee.getConfig('twee-i18n')
 *
 * If some application module has it's configuration file with
 * name __application/modules/Blog/setup/configs/common.json__ then
 * example of getting this config file contents is following:
 *
 *      twee.getConfig('blog:common')
 *
 * So if we write new extension, then first part of config path should follow pattern: __twee-&lt;extension-name&gt;__.
 *
 * If we write new module, then pattern should be: __&lt;module-lowercased-name&gt;:&lt;file-name-without-extension&gt;__.
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} key Configuration key
 * @param {*} defaultValue
 * @returns {*}
 */
twee.prototype.getConfig = function(key, defaultValue) {

    key = String(key || '').trim();
    var keyParts = key.split(':');

    if (!keyParts.length) {
        return defaultValue;
    }

    for (var i = 0; i < keyParts.length; i++) {
        if (!keyParts[i].trim()) {
            throw new Error('Config path is not correct: ' + colors.red(key));
        }
    }

    var returnedValue = this.__config;
    for (i = 0; i < keyParts.length; i++) {
        if (typeof returnedValue[keyParts[i]] === 'undefined') {
            return defaultValue;
        } else {
            returnedValue = returnedValue[keyParts[i]];
        }
    }

    return returnedValue;
};

/**
 * Setting config with all the deepness.
 *
 * If key exists - then value will be replaced.
 *
 * If key does not exists - then all the path will be constructed and value will be sat to final path.
 *
 * Examples:
 *
 *      twee.setConfig('module:configFile:configName', '777');
 *
 * It will produce:
 *
 *      {
 *           module: {
 *               configFile: {
 *                   configName: '777'
 *               }
 *           }
 *      }
 *
 *
 * Setting config for non-existing key
 *
 *      twee.setConfig('module:configFile:NotExistingConfigName', '123');
 *
 * Will produce:
 *
 *      {
 *          module: {
 *              configFile: {
 *                  NotExistingConfigName: '123',
 *                  configName: '777'
 *              }
 *          }
 *      }
 *
 * Setting config for non-existing path
 *
 *      twee.setConfig('module:configFile:NotExistingConfigName:foo', '123');
 *
 * Will produce:
 *
 *      {
 *           module: {
 *              configFile: {
 *                  NotExistingConfigName: {
 *                      foo: '123'
 *                  },
 *                  configName: '777'
 *              }
 *          }
 *      }
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} key
 * @param {*} value
 * @returns {twee}
 */
twee.prototype.setConfig = function(key, value) {
    key = String(key || '').trim();
    if (!key) {
        throw new Error('Config Key should be non-empty string!');
    }

    var keyParts = key.split(':');

    // Check if all the parts of the key aren't empty strings
    for (var i = 0; i < keyParts.length; i++) {
        if (!keyParts[i].trim()) {
            throw new Error('All the parts of config path should be not empty: ' + colors.red(key));
        }
    }

    var configPointer = this.__config; // First time pointer shows root element
    // Iterate using pointer until reach the goal
    for (i = 0; i < keyParts.length; i++) {
        // Existing config path AND not the last element
        if (configPointer[keyParts[i]] && i < keyParts.length - 1) {
            configPointer = configPointer[keyParts[i]];

            // Not existing config path AND not the last element
        } else if (!configPointer[keyParts[i]] && i < keyParts.length - 1) {
            configPointer[keyParts[i]] = {};
            configPointer = configPointer[keyParts[i]];

            // Final config path element
        } else {
            configPointer[keyParts[i]] = value;
        }
    }

    return this;
};

/**
 * Helper registration method. It will be available in views because
 * it also installs into Express.js __app.locals__. Also it could be accessible in __res.locals__.
 *
 * If not correct name of helper or not a function as helper has been provided - then exception throws.
 *
 * If helper already has been registered - then after second try to register helper with the same name
 * without __true__ as third parameter it will throw an exception.
 *
 * Example of initializing:
 *
 *      twee.registerHelper('hello', function(name){
 *          return 'Hello ' + name;
 *      })
 *
 * In middleware:
 *
 *      function(req, res) {
 *          res.send(res.locals.hello('TWEE.IO');
 *      }
 *
 * In any place:
 *
 *      twee.helper.hello('TWEE.IO');
 *
 * In view:
 *
 *      {{ helper.hello('TWEE.IO') }}
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} name The name of the helper
 * @param {Function} helper The helper instance
 * @param {Boolean} overwrite Possibility to overwrite helper
 * @returns {twee}
 */
twee.prototype.registerHelper = function(name, helper, overwrite) {
    name = String(name || '').trim();
    overwrite = Boolean(overwrite);

    if (!name) {
        throw new Error("Helper `" + name + "` should be not empty string");
    }

    if (typeof helper != 'function') {
        throw new Error("Helper `" + name + "` should be callable");
    }

    if (this.helper[name] && !overwrite) {
        throw new Error("Helper `" + name + "` already registered");
    }

    this.helper[name] = helper;

    return this;
};

/**
 * Getting Application Instance
 *
 * Example:
 *
 *       twee.getApplication().all(
 *          '/some-url/',
 *          function(req, res){
 *              res.send('Hello')
 *          }
 *       );
 *
 * @chainable
 * @method
 * @member twee
 * return {Object}
 */
twee.prototype.getApplication = function() {
    return this.__app;
};

/**
 * Returning modules folders as an object where keys are modules names and values are
 * folders inside modules.
 *
 * Example:
 *
 *      twee.getModulesFolders('i18n')
 *
 * Will produce output:
 *
 *      {
 *          "Blog": "/path/to/app/modules/Blog/i18n/",
 *          "Landing": "/path/to/app/modules/Landing/i18n/"
 *      }
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} folderName Folder which we need to add to each module directory path
 * @returns {{String}}
 */
twee.prototype.getModulesFolders = function(folderName) {
    var folders = {};
    folderName = String(folderName || '').trim();
    for (var moduleName in this.__config['__moduleOptions__']) {
        folders[moduleName] = this.getModulePath(moduleName, folderName) + '/';
    }
    return folders;
};

/**
 * Returning instantiated HTTP server object
 *
 * @chainable
 * @method
 * @member twee
 * @returns {http.Server}
 */
twee.prototype.getHttpServer = function() {
    return this.__http;
};

/**
 * Returning instantiated HTTPS server object
 *
 * @chainable
 * @method
 * @member twee
 * @returns {https.Server}
 */
twee.prototype.getHttpsServer = function() {
    return this.__https;
};

/**
 * Logging message to console using [debug](https://www.npmjs.com/package/debug) npm module.
 *
 * Example:
 *
 *      twee.log('Message')         // -> "TWEE.IO [WORKER:12345] Message"
 *
 * If Error type has been passed as parameter - then method will try to extract __.stack__ and
 * Error message.
 *
 * If String has been passed as parameter - then method will use it as is.
 *
 * If any other object has been passed as parameter - then method will try to represent it as JSON string.
 *
 * @chainable
 * @method
 * @member twee
 * @param {Error|String|Object|*} message
 * @returns {twee}
 */
twee.prototype.log = function(message) {

    message = (message.stack ? message.toString() + message.stack : null)
        || (typeof message === 'string' ? message : null)
        || JSON.stringify(message, null, '  ');

    debug(colors.cyan('[WORKER:' + process.pid + '] ') + colors.yellow(message));
    return this;
};

/**
 * Logging error to console. Message could be a string (or something that has normal .toString() method),
 * or it can be instance of __Error__.
 *
 * Example:
 *
 *      twee.error(new Error('Something goes wrong!'))
 *      // -> "TWEE.IO [WORKER:12345][ERROR] Something goes wrong! .. and stack trace here"
 *
 * @chainable
 * @method
 * @member twee
 * @param {Error|String} message
 * @returns {twee}
 */
twee.prototype.error = function(message) {
    debug(colors.cyan('[WORKER:' + process.pid + '][ERROR] ') + colors.red(message.stack || message.toString()));
    return this;
};

/**
 * Including module starting from current base directory of bootstrapped application.
 * Uses twee.getBaseDirectory() to join the base directory and module name string, also resolves the path.
 *
 * For example if you have your application installed in __/var/www/app/__:
 *
 *      twee.Require('myModule')        // -> require('/var/www/app/myModule/')
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} module
 * @returns {*}
 */
twee.prototype.Require = function(module) {
    return require(this.getBaseDirectory(module));
};

/**
 * Returning base application directory or full sub-folder if postfix has been specified.
 * For example your application base directory is __/var/www/application__
 * Then following examples has sense:
 *
 *      twee.getBaseDirectory()              // -> /var/www/application/
 *      twee.getBaseDirectory('var')         // -> /var/www/application/var/
 *      twee.getBaseDirectory('../app2')     // -> /var/www/app2/
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} postfix Postfix to add to base directory
 * @returns {String}
 */
twee.prototype.getBaseDirectory = function(postfix) {

    if (typeof postfix === 'string') {
        postfix = String(postfix || '').trim();
        return path.resolve(path.join(this.__baseDirectory, postfix));
    }

    return this.__baseDirectory;
};

/**
 * Returning module path or sub-path.
 *
 * Examples:
 *
 *      twee.getModulePath('Blog', 'i18n')
 *      // -> /application/modules/Blog/i18n/
 *
 *      twee.getModulePath('Blog', '/i18n/')
 *      // -> /application/modules/Blog/i18n/
 *
 *      twee.getModulePath('Blog/i18n/')
 *      // -> /application/modules/Blog/i18n/
 *
 *      twee.getModulePath('Blog', 'models', 'mongoose')
 *      // -> /application/modules/Blog/models/mongoose/
 *
 * @param {String} moduleName
 * @param {String} modulePath
 * @returns {String}
 */
twee.prototype.getModulePath = function(moduleName) {
    if (!moduleName) {
        throw new Error('moduleName as first argument is empty');
    }

    var params = []
        , keys = Object.keys(arguments);

    for (var i = 0; i < keys.length; i++) {
        params.push(arguments[keys[i]]);
    }

    var modulePath = params.slice(1).join('/');

    return this.getBaseDirectory('modules/' + moduleName + '/' + modulePath + '/');
};

/**
 * Setting base directory for including all the rest
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} directory
 * @returns {twee}
 */
twee.prototype.setBaseDirectory = function(directory) {
    directory = String(directory || '');
    this.__baseDirectory = directory || this.__baseDirectory || process.cwd();

    // Fixing environment
    this.__env = process.env.NODE_ENV;
    if (!this.__env) {
        this.log('No NODE_ENV sat up. Setting to `production`');
        this.__env = process.env.NODE_ENV = 'production';
    }
    this.log('NODE_ENV: ' + this.__env);
    return this;
};

/**
 * Bootstrapping application.
 *
 * On __SIGINT__ closes all the HTTP(s) servers and exits.
 *
 * __options__ should follow this structure:
 *
 *      {
 *          modulesConfig: 'path/to/your/config/with/modules/settings.json',
 *          tweeConfig:    'path/to/your/config/with/framework/options.json'
 *      }
 *
 * Usually you don't need to provide these options, because generated application contains configs
 * which are already specified by default in kernel.
 *
 * #### EVENTS
 *
 *  * __twee.Exception__ - when __uncaughtException__ exception happens
 *  * __twee.Exit__ - when __SIGINT__ happens
 *
 * @chainable
 * @method
 * @member twee
 * @param {Object} options Objects for params
 * @returns {twee}
 */
twee.prototype.Bootstrap = function(options) {
    if (this.__bootstrapped) {
        return this;
    }

    var self = this;

    if (!options instanceof Object) {
        throw new Error('Options should be an Object type');
    }

    options = options || {};

    // This is default config state. It can be overwritten before running
    options = extend(true, {
        modulesConfig: this.__modulesConfig,
        tweeConfig:    this.__tweeConfig
    }, options);

    process.on('uncaughtException', function(err) {
        self.error('Caught exception: ' + err.stack || err.toString());
        //console.trace();
        self.emit('twee.Exception', err, self);
    });

    process.on('SIGINT', function(){
        // Generate event for all the modules to free some resources
        self.emit('twee.Exit');
        self.log('Exiting');
        self.__http && self.__http.close();
        self.__https && self.__http.close();
        process.exit(0);
    });

    try {
        this.__bootstrap(options);
    } catch (err) {
        this.error('Bootstrap Error: ' + err.stack || err.toString());
        process.exit(-1);
    }

    this.__bootstrapped = true;
    return this;
};

/**
 * Common bootstrap method which loads all the configs,
 * modules, extensions, middleware functions.
 *
 * It does not calls manually, but you can change behaviour using configurations and events.
 *
 * #### EVENTS
 *
 *  * __twee.Bootstrap.Start__ - emits right before all the bootstrap process
 *  * __twee.Bootstrap.ModulesList__ - emits after loading config with list of application modules
 *  * __twee.Bootstrap.DefaultConfig__ - emits after loading internal default framework config
 *  * __twee.Bootstrap.ExtendedConfig__ - emits after extending framework config with application's framework config
 *  * __twee.Bootstrap.ExtendedEnvConfig__ - emits after extending framework config with application's environment-specified framework config.
 *    For example if we have __application/configs/twee.json__ configuration and we have __development__ environment, then it will be extended with
 *    __application/configs/development/twee.json__.
 *  * __twee.Bootstrap.Config__ - emits after all the framework kernel configs has been merged, including environment-specified.
 *  * __twee.Bootstrap.PackageInfo__ - emits after __package.json__ of application has been loaded.
 *    It will be available using twee.getConfig('twee:package')
 *  * __twee.Bootstrap.ModulesInformationLoaded__ - emits when all the modules configurations are loaded and merged.
 *  * __twee.Bootstrap.Extensions.Start__ - before all the extensions has been loaded, even, before this process started at all.
 *  * __twee.Bootstrap.Extensions.End__ - after all the extensions has been resolved and loaded.
 *  * __twee.Bootstrap.ModulesHeadMiddlewareLoaded__ - after all the head modules middleware has been installed globally.
 *  * __twee.Bootstrap.ModulesControllersLoaded__ - after all the controllers has been loaded with it's specific stuff.
 *  * __twee.Bootstrap.ModulesTailMiddlewareLoaded__ - after all the after-controllers (tail) middleware has been loaded globally for the module.
 *  * __twee.Bootstrap.End__ - after all the bootstrap process has been ended and application has been run.
 *
 * @chainable
 * @method
 * @member twee
 * @param {Object} options
 * @returns {twee}
 * @private
 */
twee.prototype.__bootstrap = function(options) {
    var self = this;

    this.emit('twee.Bootstrap.Start');

    if (!options || !options.modulesConfig) {
        throw new Error('Modules field should not be empty!');
    }

    var modules = options.modulesConfig;

    // If this is file path with modules configuration - then load it
    if (typeof modules == 'string') {
        modules = this.Require(modules);
        this.emit('twee.Bootstrap.ModulesList', modules);
    }

    if (typeof modules != 'object') {
        throw new Error('Modules should be file path or Object');
    }

    var tweeConfig = this.__getKernelConfig(options);

    // Setting up framework config
    this.__config.twee = tweeConfig;
    this.emit('twee.Bootstrap.Config', tweeConfig);

    // Setting package information
    this.__config.twee.package = this.Require('package');
    this.emit('twee.Bootstrap.PackageInfo');

    // Extension specific configs
    this.__config.twee.extension = this.__config.twee.extension || {};

    // Create Express application
    this.__app = express();

    // Inject framework into middleware req and res
    this.__app.use(function(req, res, next){
        req.twee = self;
        res.twee = self;
        next();
    });

    // Pre-loading all the modules configs, routes, patterns and other stuff
    this.__loadModulesInformation(modules);
    this.emit('twee.Bootstrap.ModulesInformationLoaded');

    // Load enabled twee core extensions
    this.emit('twee.Bootstrap.Extensions.Start');
    this.__loadExtensions();
    this.emit('twee.Bootstrap.Extensions.End');

    // Lifting the server because some extensions could require http-server object
    // before all the routes has been setup. for example socket.io
    this.__createServer();

    // Provide helper object to locals of express application
    this.__app.locals.helper = this.helper;
    // Provide environment information into locals
    this.__app.locals.env = this.__env;
    // Set framework object in views
    this.__app.locals.twee = this;

    this.__loadModulesMiddleware(self.MIDDLEWARE_HEAD);
    this.emit('twee.Bootstrap.ModulesHeadMiddlewareLoaded');

    // Controllers is the place where all the business logic is concentrated
    this.__loadModulesControllers();
    this.emit('twee.Bootstrap.ModulesControllersLoaded');

    // Tail middleware is used for logging and doing post-calculations, post-stuff
    this.__loadModulesMiddleware(self.MIDDLEWARE_TAIL);
    this.emit('twee.Bootstrap.ModulesTailMiddlewareLoaded');

    // This route will be used to write user that he did not sat up any configuration file for framework
    this.__handle404();

    this.emit('twee.Bootstrap.End');

    return this;
};

/**
 * Returning kernel configuration extended with application-specific configuration and environment-specific.
 *
 * @param {Object} options
 * @returns {Object}
 * @private
 */
twee.prototype.__getKernelConfig = function(options) {
    // Loading default framework configuration
    var tweeConfig = require('../configs/default');
    this.emit('twee.Bootstrap.DefaultConfig', tweeConfig);

    // Extending framework configuration during Bootstrapping
    if (options.tweeConfig) {
        if (typeof options.tweeConfig == 'string') {
            var tweeConfigFullPath = this.getBaseDirectory(options.tweeConfig);
            try {
                var loadedTweeConfig = require(tweeConfigFullPath);
                tweeConfig = extend(true, tweeConfig, loadedTweeConfig);
                this.emit('twee.Bootstrap.ExtendedConfig', tweeConfig);
            } catch (e) {
                this.log('[WARNING] No valid twee main config specified! Using default values.');
            }

            // Extending config with environment-specified configuration
            var directory = path.dirname(tweeConfigFullPath)
                , configFile = path.basename(tweeConfigFullPath)
                , environmentConfig = directory + '/' + this.__env + '/' + configFile;
            try {
                var envTweeConfig = require(environmentConfig);
                tweeConfig = extend(true, tweeConfig, envTweeConfig);
                this.emit('twee.Bootstrap.ExtendedEnvConfig', tweeConfig);
            } catch (err) {
                // Nothing to do here. Just no config for environment
            }
        }
    }

    return tweeConfig;
};

/**
 * Loading modules information
 *
 * @chainable
 * @method
 * @member twee
 * @param modules
 * @return {twee}
 */
twee.prototype.__loadModulesInformation = function(modules) {
    this.emit('twee.__loadModulesInformation.Start');
    for (var moduleName in modules) {
        var moduleOptions = modules[moduleName];
        if (moduleOptions.disabled == true) {
            this.log('Module `' + moduleName + '` disabled. Skipping.');
            continue;
        }
        this.__config['__moduleOptions__'] = this.__config['__moduleOptions__'] || {};
        this.__config['__moduleOptions__'][moduleName] = moduleOptions;
        this.__loadModuleInformation(moduleName, moduleOptions);
    }
    this.emit('twee.__loadModulesInformation.End');
    return this;
};

/**
 * Loading all the extensions with resolving it's dependencies.
 *
 * @chainable
 * @method
 * @member twee
 * @returns {twee}
 */
twee.prototype.__loadExtensions = function() {
    // Normalising dependencies configuration
    this.log('SYSTEM: Normalising extensions list');
    this.__normaliseDependencies();

    // Go through all the dependencies and build linear loading sequence.
    this.log('SYSTEM: Resolving extensions loading sequence');
    this.__defineExtensionsLoadingSequence(0);

    var extensionsSequenceLength = this.__extensionsSequence.length
        , extensions = this.getConfig('twee:extensions');

    // Iterate on extensions loading sequence array and load them all
    for (var i = 0; i<extensionsSequenceLength; i++) {
        var extension = extensions[this.__extensionsSequence[i]];
        this.__loadExtensionModule(extension);
        this.log('LOADED EXTENSION: ' + JSON.stringify(extension));
    }

    return this;
};

/**
 * Recursion function which goes through the extensions tree and trying to resolve them all.
 *
 * Maximum deepness of recursion is __100__. This should be enough for even really big applications.
 *
 * @param {int} startFrom From what extension we should start next dependency resolving
 * @private
 */
twee.prototype.__defineExtensionsLoadingSequence = function(startFrom) {
    var extensions = this.getConfig('twee:extensions')
        , extensionsLength = extensions.length;

    for (var i = parseInt(startFrom) || 0; i < extensionsLength; i++) {

        var ext = extensions[i]
            , extName = ext.name;

        this.__extensionsRegistry[extName] = true;

        if (ext.dependencies && ext.dependencies instanceof Array) {

            var extDependenciesLength = ext.dependencies.length;

            for (var k = 0; k < extDependenciesLength; k++) {

                var dependencyName = ext.dependencies[k];

                if (this.__extensionsRegistry[dependencyName]) {
                    // Already resolved
                    continue;
                }

                // Registering this extension as resolved to avoid it's pushing to sequence array
                this.__extensionsRegistry[dependencyName] = true;

                this.__extensionsRecursionDeepness++;
                if (this.__extensionsRecursionDeepness > 100) {
                    throw new Error('Maximum 100 recursion level reached during dependencies sequence build')
                }

                // Start resolving next dependency right from the current dependency index
                var dependencyIndexInGlobalExtensions = this.__getExtensionIndexByName(dependencyName);
                this.__defineExtensionsLoadingSequence(dependencyIndexInGlobalExtensions);
                this.__extensionsRecursionDeepness--;
            }

            this.__addExtensionSequence(i, extName);
        } else {
            this.__addExtensionSequence(i, extName);
        }
    }
};

/**
 * Adding extension to array of loading sequence. Also extension name is stored for debugging puproses.
 *
 * After resolving all the extensions dependencies this sequence will be used to load all the extensions in proper way.
 *
 * @param {int} index Integer value
 * @param {String} extensionName
 * @private
 */
twee.prototype.__addExtensionSequence = function (index, extensionName) {
    var exists = false
        , extensionsSequenceLength = this.__extensionsSequence.length;

    for (var extIndex=0; extIndex < extensionsSequenceLength; extIndex ++) {
        if (index === this.__extensionsSequence[extIndex]) {
            exists = true;
            break;
        }
    }

    if (!exists) {
        this.__extensionsSequence.push(index);
        this.__extensionsNamesSequence.push(extensionName);
    }
};

/**
 * Convert all the "isDependencyFor" to "dependencies" for all the extensions.
 *
 * If some extension needs to be executed __BEFORE__ other extension, it should mention the second one
 * in __isDependencyFor__ array.
 *
 * During normalising dependencies all the names of extensions from __isDependencyFor__ will be moved to
 * appropriate extensions into __dependencies__ arrays.
 *
 * @private
 */
twee.prototype.__normaliseDependencies = function() {
    var extensionsArray = this.getConfig('twee:extensions')
        , extensionsLength = extensionsArray.length;

    for (var extIndex = 0; extIndex < extensionsLength; extIndex++) {

        var isDependencyForArray = extensionsArray[extIndex].isDependencyFor || []
            , isDependencyForArrayLength = isDependencyForArray.length
            , globalExtensionName = extensionsArray[extIndex].name;

        if (!globalExtensionName.trim()) {
            throw new Error('Extension should contain codename: ', extensionsArray[extIndex])
        }

        for (var depIndex=0; depIndex < isDependencyForArrayLength; depIndex++){

            var injectionName = isDependencyForArray[depIndex]
                , injectionGlobalIndex = this.__getExtensionIndexByName(injectionName)
                , injectionExtension = extensionsArray[injectionGlobalIndex] || null
                , depInstalledInExt = false;

            if (null === injectionExtension) {
                throw new Error('Dependency `' + injectionName + '` is mentioned in extension: ' +
                    globalExtensionName + ' in `isDependencyFor` section, ' +
                    'but it does not exists in global extensions array')
            }

            injectionExtension.dependencies = injectionExtension.dependencies || [];
            var extensionDependenciesLength = injectionExtension.dependencies.length;

            // Inject extension into other extensions as dependency
            for (var extensionDependencyIndex=0;
                 extensionDependencyIndex < extensionDependenciesLength;
                 extensionDependencyIndex++){

                // Check if dependency (current extension) is already installed in other extension
                if (injectionExtension.dependencies[extensionDependencyIndex] === injectionName) {
                    depInstalledInExt = true;
                    break;
                }
            }

            if (!depInstalledInExt) {
                injectionExtension.dependencies.push(globalExtensionName);
                extensionsArray[injectionGlobalIndex] = injectionExtension;
            }
        }

        delete extensionsArray[extIndex].isDependencyFor;
    }

    this.setConfig('twee:extensions', extensionsArray);
};

/**
 * Gets extension index in global extensions (__twee:extensions__) object.
 *
 * If no extension with provided name has been found - then __-1__ returns.
 *
 * Otherwise index returns, starting from __0__ and up to extensions number.
 *
 * So comparing should be like:
 *
 *      if (this.__getExtensionIndexByName('twee-i18n') !== -1) {...}
 *
 * All found indexes are stored in registry,
 * so it is possible to call this method many times without speed slowness.
 *
 * Also method automatically stores in registry all the not stored
 * name=>index associations while needed name is not found.
 * This allows to pre-load all the associations very fast without iterating on the same extensions many-times.
 *
 * @param {String} name The name field of extension object in configuration.
 * @returns {*}
 * @private
 */
twee.prototype.__getExtensionIndexByName = function(name) {
    name = String(name).trim() || '';

    if (!name) {
        throw new Error('Extension name should be String type');
    }

    if (this.__extensionsIndexesByName[name]) {
        return this.__extensionsIndexesByName[name];
    }

    var extensionsArray = this.getConfig('twee:extensions', [])
        , extensionsLength = extensionsArray.length;

    for (var i = 0; i < extensionsLength; i++) {
        if (extensionsArray[i].name && name === extensionsArray[i].name) {
            this.__extensionsIndexesByName[name] = i;
            return i;
        } else if (extensionsArray[i].name) {
            this.__extensionsIndexesByName[extensionsArray[i].name] = i;
        }
    }

    return -1;
}

/**
 * Generating extension's unique ID for registry.
 *
 * It is used to identify extensions by it's contents,
 * because the names of extensions could be different, and only their contents
 * makes sense.
 *
 * __EUID__ - Extension Unique ID - is JSON string with permanent details of extension inside.
 *
 * @chainable
 * @method __getExtensionUniqueID
 * @member twee
 * @param {Object} extension
 * @returns {string}
 * @private
 */
twee.prototype.__getExtensionUniqueID = function(extension) {
    var uniqueIdObject = {
        f: '',
        npm: '',
        am: '',
        cam: ''
    }

    if (extension.file) {
        uniqueIdObject.f = extension.file;
    }

    if (extension.module) {
        uniqueIdObject.npm = extension.module;
    }

    if (extension.applicationModule) {
        uniqueIdObject.am = extension.applicationModule;
    }

    if (extension.currentApplicationModule) {
        uniqueIdObject.cam = extension.currentApplicationModule;
    }

    return JSON.stringify(uniqueIdObject);
};

/**
 * Creating servers: HTTP and HTTPS
 *
 * Port can be passed as $ PORT=1234 ... node app.js
 *
 * Or if it has not been passed in environment variable then
 * framework tries to read configuration __twee:options:http:port__.
 * Otherwise port 3000 will be taken.
 *
 * Also HTTPS server can be enabled using configuration value __twee:options:https:enabled__ which should be
 * boolean. true - enable https, false - disable https.
 *
 * If you enable HTTPS then you will need to setup also certificate for your site.
 * You can specify paths to __*.key__ and __*.crt__ files in configurations:
 * __twee:options:https:key__ and __twee:options:https:crt__ accordingly.
 *
 * By default there are __./var/ssl/localhost.key__ and  __./var/ssl/localhost.crt__ files with password 1234 or 1111.
 *
 * For production you should change these files to your real certificate.
 *
 * #### EVENTS
 *
 *  * __twee.createServer.Start__ - before creating any HTTP server
 *  * __twee.createServer.End__ - after creating both HTTP and HTTPS servers
 *
 * @chainable
 * @method
 * @member twee
 * @returns {twee}
 * @private
 */
twee.prototype.__createServer = function(){
    this.emit('twee.createServer.Start');

    this.__app.set('port', process.env.PORT || this.getConfig('twee:options:http:port', 3000));

    var http = require('http')
        , https = require('https');

    if (!this.__http) {
        this.__http = http.createServer(this.__app).listen(this.__app.get('port'));
    }

    if (this.getConfig('twee:options:https:enabled', false) && !this.__https) {
        var options = {
            key: fs.readFileSync(this.getConfig('twee:options:https:key', '/var/ssl/localhost.key')),
            cert: fs.readFileSync(this.getConfig('twee:options:https:crt', '/var/ssl/localhost.crt'))
        };
        this.__https = https.createServer(options, this.__app).listen(443);
    }

    this.emit('twee.createServer.End');
    this.log('Worker ' + process.pid + ' spawned');
    return this;
};

/**
 * Loading all the middleware functions from all modules that should be dispatched before any controller of any module.
 *
 * Head middleware functions are installed and should be executed before all the controllers.
 *
 * Tail middleware functions are installed and should be executed after all the controllers.
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} placement Placement of middleware: head or tail.
 * @returns {twee}
 */
twee.prototype.__loadModulesMiddleware = function(placement) {
    var self = this;

    placement = String(placement || '').trim();
    if (placement !== self.MIDDLEWARE_HEAD && placement !== self.MIDDLEWARE_TAIL) {
        throw new Error('Middleware type should be `head` or `tail`');
    }

    this.emit('twee.__loadModulesMiddleware.Start', placement);

    for (var moduleName in this.__config['__moduleOptions__']) {
        this.emit('twee.__loadModulesMiddleware.OnLoad', placement, moduleName);
        var middlewareList = this.getConfig('__setup__:' + moduleName + ':middleware:' + placement, [])
            , middlewareInstanceList = this.__getMiddlewareInstanceArray(moduleName, middlewareList);

        if (middlewareInstanceList.length) {
            var prefix = String(this.__config['__moduleOptions__'][moduleName].prefix || '').trim();
            if (prefix) {
                this.__app.use(prefix, middlewareInstanceList);
            } else {
                this.__app.use(middlewareInstanceList);
            }
        }

        this.emit('twee.__loadModulesMiddleware.Loaded', placement, moduleName);
    }

    this.emit('twee.__loadModulesMiddleware.End', placement);

    return this;
};

/**
 * Iterating on all the modules and for each module setting up routes using twee.__setupRoutes()
 *
 * @chainable
 * @method
 * @member twee
 * @returns {twee}
 */
twee.prototype.__loadModulesControllers = function() {
    for (var moduleName in this.__config['__moduleOptions__']) {
        this.__setupRoutes(moduleName, this.__config['__moduleOptions__'][moduleName].prefix || '');
    }
    return this;
};

/**
 * Default 404 route.
 *
 * Using events subscribers developer is able to overwrite these handlers.
 *
 * By default handler sees if it is XHR request and returns XHR response, otherwise if view engine is used -
 * returns rendered 404 template. Othewise if no view engine us used - then plain text message will be returned.
 *
 * #### EVENTS
 *
 *  * twee.__handle404.Start - before route has been set
 *  * twee.__handle404.End - after route has been set
 *
 * @chainable
 * @method
 * @member twee
 * @private
 */
twee.prototype.__handle404 = function() {
    var self = this;

    // Here we can rewrite environment with framework extending
    this.emit('twee.__handle404.Start');

    function generate404(req, res, next) {
        next(new Error('Not Found!'));
    }

    function errorHandler(err, req, res, next) {
        var message = '404 - Not found!';
        if (err) {
            res.status(500);
            if (self.__env == 'development') {
                message = err.toString();
            }
        } else {
            res.status(404);
            err = new Error('The page you requested has not been found!');
        }

        if (req.xhr) {
            var jsonMessage = {message: message, error_code: 404};
            if (self.__env == 'development') {
                jsonMessage['stack'] = err.stack || err.toString();
            }
            res.json(jsonMessage);
        } else {
            if (self.__app.get('view engine')) {
                res.render(path.resolve(self.getConfig('twee:options:errorPages:404:viewTemplate')), {error: err});
            } else {
                res.send('<h1>' + message + '</h1>');
            }
        }
    }

    this.__app.use(generate404, errorHandler);
    this.emit('twee.__handle404.End');
};

/**
 * Trying to load extension npm module/file
 * from other module or from current module.
 *
 * If extension module exports __config__ and __configNamespace__ then it's config will be available as:
 *
 *      twee.getConfig('<configNamespace>:...')
 *
 * #### EVENTS
 *
 *  * twee.__loadExtensions.Start - emits before any action happened. Here you can change anything in extension on the fly.
 *  * twee.__loadExtensions.End - emits after extension has been loaded.
 *
 * @chainable
 * @method
 * @member twee
 * @param {Object} extension
 * @private
 */
twee.prototype.__loadExtensionModule = function(extension) {
    var extensionModule = null
        , extensionModuleFolder = '';

    var extensionID = this.__getExtensionUniqueID(extension);

    if (this.__extensionsRegistry[extensionID]) {
        // Already loaded
        return;
    }

    this.__extensionsRegistry[extensionID] = {options: extension, extension: null};

    this.emit('twee.__loadExtensions.Start', extension);

    // This is simply local file or module
    if (extension.file) {

        // This is file from other application module
        if (extension.applicationModule) {
            try {
                extensionModuleFolder = this.getModulePath(extension.applicationModule, this.MODULE_EXTENSIONS_FOLDER, extension.file);
                extensionModule = require(extensionModuleFolder);
            } catch (err) {
                throw new Error('Module `' + extension.applicationModule
                    + '` is not installed. Needed as extension provider for extension: '
                    + extension.name + '. ' + err.stack || err.toString());
            }

        // If module name specified
        } else if (extension.currentApplicationModule) {
            var moduleFolder = this.getModulePath(extension.currentApplicationModule);
            if (!fs.existsSync(moduleFolder)) {
                throw new Error('Extension should belong to ' + extension.currentApplicationModule + ' module, ' +
                    'but module is not properly configured and installed');
            }
            extensionModuleFolder = this.getModulePath(extension.currentApplicationModule, this.MODULE_EXTENSIONS_FOLDER, extension.file);
            extensionModule = require(extensionModuleFolder);
        } else {
            throw new Error('Extension is wrong configured: ' + JSON.stringify(extension));
        }
    } else if (extension.module) {
        extensionModule = require(extension.module);
    }

    if (!extensionModule.extension || typeof extensionModule.extension !== 'function') {
        var exceptionJson = {
            MODULE: (extension.currentApplicationModule ? extension.currentApplicationModule : ''),
            EXTENSION: extension.name
        }
        throw new Error(JSON.stringify(exceptionJson) + ': should export .extension as `function`');
    }

    this.__extensionsRegistry[extensionID].extension = extensionModule.extension;

    if (extensionModule.config && typeof extensionModule.config === 'object') {
        var configNamespace = extensionModule.configNamespace || '';
        if (configNamespace) {
            // Rewrite extension's config with application
            this.__config['twee']['extension'][configNamespace] = this.__config['twee']['extension'][configNamespace] || {};
            this.__config['twee']['extension'][configNamespace] = this.extend(true, extensionModule.config, this.__config['twee']['extension'][configNamespace]);
        }
    }

    extensionModule.extension(this);

    this.emit('twee.__loadExtensions.End', extension);
};

/**
 * Loading one module, including all the configs, middlewares and controllers
 *
 * #### EVENTS
 *
 *  * twee.__loadModuleInformation.Start(moduleName, moduleOptions) - before module information will be fetched. Here developer is able to change module options on the fly.
 *  * twee.__loadModuleInformation.End(moduleName, moduleSetup) - after module information has been fetched, the second param contains contents of modulename/setup/setup.json file.
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} moduleName
 * @param {Object} moduleOptions
 * @returns {twee}
 */
twee.prototype.__loadModuleInformation = function(moduleName, moduleOptions) {

    this.emit('twee.__loadModuleInformation.Start', moduleName, moduleOptions);

    this.log('LOADING MODULE: ' + colors.cyan(moduleName));

    moduleName = String(moduleName || '').trim();
    if (!moduleName) {
        throw new Error('twee:.__loadModuleInformation - `moduleName` is empty');
    }

    if (moduleName == 'twee') {
        throw new Error('twee:.__loadModuleInformation - `twee` name for modules is deprecated. It is used for framework');
    }

    // Load base configs and overwrite them according to environment
    this.__loadConfigs(moduleName, this.getModulePath(moduleName, this.MODULE_CONFIGS_FOLDER));

    // Loading Module configuration
    this.__config['__setup__'] = this.__config['__setup__'] || {};
    var setupConfiguration = require(this.getModulePath(moduleName, this.MODULE_SETUP_FILE));
    this.__config['__setup__'][moduleName] = setupConfiguration;

    if (setupConfiguration.extensions && !setupConfiguration.extensions instanceof Array) {
        throw new Error('[MODULE:' + moduleName + ']`extensions` should be an Array of Objects');
    } else if (setupConfiguration.extensions instanceof Array) {
        this.__extendExtensionsArray(this.__config['__setup__'][moduleName].extensions, moduleName);
    }

    this.__config['__setup__'][moduleName] = setupConfiguration;

    this.emit(
        'twee.__loadModuleInformation.End',
        moduleName,
        this.__config['__setup__'][moduleName]
    );
    return this;
};

/**
 * Loading all the bunch of configs from configuration folder according to environment.
 *
 * First this method loads configs from __modulename/setup/configs/__ folder.
 *
 * Then if we have for example __development__ environment, - framework tries to overwrite these configs with the same (if exists) from
 * __modulename/setup/configs/development/__ folder.
 *
 * #### EVENTS
 *
 *  * twee.__loadConfigs.Start(moduleName, configsFolder) - before loading configs for module
 *  * twee.____loadConfigs.End(moduleName, configContents) - after loading config returns also it's contents
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} configsFolder Configurations folder path
 * @returns {twee}
 * @param moduleName
 */
twee.prototype.__loadConfigs = function(moduleName, configsFolder) {

    this.emit('twee.__loadConfigs.Start', moduleName, configsFolder);

    var self = this
        , configs = fs.readdirSync(configsFolder)
        , configsObject = {};

    // Loading all the configurations in module /setup/ folder
    configs.forEach(function(configFile){
        var configFilePath = path.join(configsFolder, configFile)
            , stats = fs.statSync(configFilePath);

        if (stats.isFile()) {
            var configData = self.__loadConfig(configFilePath, moduleName);
            var cD = {};
            cD[configData["name"]] = configData.config;
            configsObject = extend(true, configsObject, cD);
        }
    });

    configsFolder = path.join(configsFolder, this.__env);

    // Now extend configurations with environment-specific analogs
    if (fs.existsSync(configsFolder)) {
        configs = fs.readdirSync(configsFolder);
        configs.forEach(function(configFile){
            var configFilePath = path.join(configsFolder, configFile)
                , stats = fs.statSync(configFilePath);

            if (stats.isFile()) {
                var configData = self.__loadConfig(configFilePath, moduleName);
                var cD = {};
                cD[configData["name"]] = configData.config;
                configsObject = extend(true, configsObject, cD);
            }
        });
    } else {
        this.log('[WARNING] No environment configs exists');
    }

    this.__config[moduleName.toLowerCase()] = configsObject;
    this.emit('twee.__loadConfigs.End', moduleName, this.__config[moduleName]);
    return this;
};

/**
 * Loading config file and returning it's name and contents as an Object
 *
 * #### EVENTS
 *
 *  * twee.__loadConfig.Start(configFile, moduleName) - before config loading
 *  * twee.__loadConfig.Start(configFile, moduleName, configContents) - after config loading
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} configFile
 * @param {String} moduleName
 * @returns {{name: string, config: *}}
 */
twee.prototype.__loadConfig = function(configFile, moduleName) {

    this.emit('twee.__loadConfig.Start', configFile, moduleName);

    var configName = path.basename(configFile).toLowerCase().replace('.json', '').replace('.js', '')
        , config = require(configFile);

    var logMessage = {
        MODULE: moduleName,
        CONFIG: configName,
        NS: moduleName.toLowerCase() + ':' + configName,
        FILE: configFile
    };

    this.log('LOADED CONFIG: ' + JSON.stringify(logMessage));

    config = {name: configName, config: config};

    this.emit('twee.__loadConfig.Start', configFile, moduleName, config);

    return config;
};

/**
 * Extends global extensions array with application module extensions array.
 *
 * If __EUID__ (Extension Unique ID) of existing and new extensions are the same
 * then new extension object rewrites global extension object.
 *
 * The __name__ field of extension should be handled by developer. It does not
 * handled anywhere, but it is used to set "dependencies" and "isDependencyFor".
 *
 * That is why you need to rewrite global extensions in your application modules config
 * using the same __name__ as it was in global config.
 *
 * @chainable
 * @method
 * @member twee
 * @param {Array} newArray
 * @param {String} moduleName
 * @private
 */
twee.prototype.__extendExtensionsArray = function(newArray, moduleName) {
    var finalExtensionsArray = this.getConfig('twee:extensions');

    for (var i = 0; i<newArray.length; i++) {

        var extension = newArray[i];
        var extensionUniqueId = this.__getExtensionUniqueID(extension);
        var existsInFinal = false;

        for (var j = 0; j < finalExtensionsArray.length; j++) {
            var globalExtension = finalExtensionsArray[j];
            var globalExtensionUniqueId = this.__getExtensionUniqueID(globalExtension);

            if (globalExtensionUniqueId === extensionUniqueId) {
                finalExtensionsArray[j] = this.extend(true, finalExtensionsArray[j], extension);
                existsInFinal = true;
            }
        }

        if (!existsInFinal) {
            if (moduleName) {
                extension.currentApplicationModule = moduleName;
            }

            finalExtensionsArray.push(extension);
        }
    }

    this.setConfig('twee:extensions', finalExtensionsArray);
}

/**
 * Setting up params for routes. Iterate on them and try to find out what type of param it is.
 *
 * Delegates different param types loading to sub-loaders.
 *
 * @chainable
 * @method __setupParams
 * @member twee
 * @param {Object} params Config object that contains params definitions
 * @param {Object} router Instance of express.Router
 * @param {String} moduleName
 * @private
 */
twee.prototype.__setupParams = function(params, router, moduleName) {
    if (!router.param) {
        throw new Error('Router should be instance of express.Router()');
    }

    if (params && params instanceof Object) {
        for (var param in params) {
            var paramValue = params[param];

            // Trying to load param as internal function or RegExp
            var isInternalParam = this.__setupRegexpInternalParam(param, paramValue, moduleName, router)
            || this.__setupFunctionInternalParam(param, paramValue, moduleName, router);

            if (!isInternalParam && typeof params[param] === 'object') {
                // This is file module
                this.__setupParamFromFile(param, paramValue, router, moduleName);
            }
        }
    }
};

/**
 * Tries to setup param from file.
 *
 * Sequence is following:
 *
 *  * if param options contains __method__ then extract final method from string like __oject.subobject.method__
 *  * if param options contains __reference__ that is __true__ then bind __method__ to instance of last __subobject__
 *  * install param using __router.param()__
 *
 * @param {String} param
 * @param {Object} paramValue
 * @param {Object} router
 * @param {String} moduleName
 * @private
 */
twee.prototype.__setupParamFromFile = function(param, paramValue, router, moduleName) {

    var requireString = this.__getParamRequireString(param, paramValue, moduleName)
        , _module = require(requireString)
        , logMessage;

    // If method specified - try to go in needed deepness to get the right object
    if (paramValue.method && typeof paramValue.method === 'string') {

        var methodParts = paramValue.method.split('.')
            , neededMethod = _module[methodParts[0]]
            , previousMethod = null;

        for (var i = 1; i < methodParts.length; i++) {
            if (typeof neededMethod === 'function') {
                neededMethod = neededMethod();
            }

            previousMethod = neededMethod;

            if (neededMethod[methodParts[i]]) {
                neededMethod = neededMethod[methodParts[i]];
            }
        }

        // If it is regexp - then just use it as is
        if (this.__setupRegexpInternalParam(param, paramValue, moduleName, router)) {
            return;
        }

        if (typeof neededMethod !== 'function') {
            throw new Error('Method for router.param() neither RegExp nor Middleware Function');
        }

        // If we need to bind function to parent reference - then do it
        if (paramValue.reference && previousMethod instanceof Object) {
            neededMethod = neededMethod.bind(previousMethod);
        }

        router.param(param, neededMethod);

        logMessage = {
            MODULE: moduleName,
            PARAM: param,
            TYPE: 'middleware',
            REFERENCE: (paramValue.reference ? 'TRUE' : 'FALSE'),
            METHOD: paramValue.method
        }
        this.log('PARAM LOADED: ' + JSON.stringify(logMessage));

    } else if (typeof _module === 'function' || _module instanceof RegExp) {
        router.param(param, _module);

        logMessage = {
            MODULE: moduleName,
            PARAM: param,
            TYPE: (_module instanceof RegExp ? 'RegExp' : 'middleware')
        }
        this.log('PARAM LOADED: ' + JSON.stringify(logMessage));
    } else {
        throw new Error('Param options are not correct: ' + param);
    }
};

/**
 * Returns correct param file to be included later. Tries to check if it is:
 *
 *  * NPM Module in node_modules folder
 *  * other application module file (not current app. module)
 *  * current application module file
 *
 * For this method checks following fields for presence in following order:
 *
 *  * __module__
 *  * __applicationModule__ && __file__
 *  * __file__
 *
 * @param param
 * @param paramValue
 * @param moduleName
 * @returns {string}
 * @private
 */
twee.prototype.__getParamRequireString = function(param, paramValue, moduleName) {
    var self = this
        , requireString = '';

    // This is NPM module
    if (paramValue.module && typeof paramValue.module === 'string') {
        requireString = paramValue.module;

    // This is file in other application module
    } else if (paramValue.applicationModule
        && typeof paramValue.applicationModule === 'string'
        && fs.existsSync(self.getModulePath(paramValue.applicationModule, self.MODULE_PARAMS_FOLDER))) {

        if (paramValue.file && typeof paramValue.file === 'string') {
            requireString = self.getModulePath(paramValue.applicationModule, self.MODULE_PARAMS_FOLDER, paramValue.file);
        }

    // This is the file in current application module
    } else if (paramValue.file && typeof paramValue.file === 'string') {
        requireString = self.getModulePath(moduleName, self.MODULE_PARAMS_FOLDER, paramValue.file);
    }
    return requireString;
};

/**
 * Tries to install function param that specified right in configuration file.
 *
 * @param {String} param String that contains param name to specify as first argument for router.param()
 * @param {*} paramValue The value of param, should be __Function__
 * @param {String} moduleName Current module name for logging purposes
 * @param {Object} router express.Router instance to use it to initialize parameter
 * @returns {boolean} Returns __true__ if param has been installed, __false__ in other cases
 * @private
 */
twee.prototype.__setupFunctionInternalParam = function(param, paramValue, moduleName, router) {
    var self = this;

    if (typeof paramValue === 'function') {
        router.param(param, paramValue);
        var logMessage = {
            MODULE: moduleName,
            PARAM: param,
            TYPE: 'middleware'
        }
        self.log('PARAM LOADED: ' + JSON.stringify(logMessage));
        return true;
    }
    return false;
};

/**
 * Tries to install regexp param that specified right in configuration file.
 *
 * @param {String} param String that contains param name to specify as first argument for router.param()
 * @param {*} paramValue The value of param, should be __RegExp__ type for this function
 * @param {String} moduleName Current module name for logging purposes
 * @param {Object} router express.Router instance to use it to initialize parameter
 * @returns {boolean} Returns __true__ if param has been installed, __false__ in other cases
 * @private
 */
twee.prototype.__setupRegexpInternalParam = function(param, paramValue, moduleName, router) {
    var self = this;

    if (paramValue instanceof RegExp) {
        router.param(param, function(req, res, next, p){
            if (p.match(paramValue)) {
                next();
            } else {
                next('route');
            }
        });
        var logMessage = {
            MODULE: moduleName,
            PARAM: param,
            TYPE: 'RegExp'
        }
        self.log('PARAM LOADED: ' + JSON.stringify(logMessage));
        return true;
    }
    return false;
};

/**
 * Format for controllers in configuration:
 *
 *      <ControllerName>Controller.<actionName>Action[.get[,post[,all[...]]]]
 *
 * By default HTTP method is set to `all`. It means that all the HTTP methods are acceptable
 *
 * Example of Config:
 *
 *      {
 *           "routes": [
 *           {
 *              "description": "Entry point for application. Landing page",
 *              "pattern": "/",
 *              "controllers": ["IndexController.indexAction"]
 *           }
 *      }
 *
 * Bundles of middleware can be sat as:
 *
 *      ["IndexController.authAction.post", "IndexController.indexAction.get"]
 *
 * @chainable
 * @method
 * @member twee
 * @param moduleName string Module Name
 * @param prefix string Module request prefix
 * @returns {twee}
 */
twee.prototype.__setupRoutes = function(moduleName, prefix) {

    var self = this
        , routesFile = this.getModulePath(moduleName, this.MODULE_SETUP_FILE)
        , routes = require(routesFile)
        , router = express.Router(this.getConfig('twee:options:express:router', {}));

    if (!routes.routes) {
        throw Error('Module: `' + moduleName + '`. No `routes` field in file: ' + colors.red(routesFile));
    }

    self.emit('twee.__setupRoutes.Start', moduleName, prefix, router, self.__controllersRegistry);

    self.emit('twee.__setupRoutes.GlobalModuleParams.Start', routes.params, router, moduleName);

    // Install route global params
    this.__setupParams(routes.params, router, moduleName);

    self.emit('twee.__setupRoutes.GlobalModuleParams.End', routes.params, router, moduleName);

    routes.routes.forEach(function(route){
        var pattern = route.pattern || ''
            , controllers = route.controllers || []
            , middleware = route.middleware || {}
            , params = route.params || {};

        if (!controllers.length) {
            // Controllers can be missing if current module mission is just to load some extensions
            return;
        }

        if (route.disabled) {
            // If route has been disabled - then don't process it
            return;
        }

        if (!pattern) {
            throw Error('Module: `' + moduleName + '`. No valid `pattern` sat for route');
        }

        self.emit('twee.__setupRoutes.ControllerParams.Start', params, router, moduleName);

        // Installing params for each controller set
        self.__setupParams(params, router, moduleName);
        self.emit('twee.__setupRoutes.ControllerParams.End', params, router, moduleName);

        controllers.forEach(function(controller) {

            var controllerInfo = self.__getControllerInfo(controller, router, moduleName);

            self.__instantiateControllerClass(controllerInfo);

            var middlewareList = [];

            if (middleware && middleware.before && middleware.before.length && middleware.before instanceof Array) {
                middlewareList = self.__getMiddlewareInstanceArray(moduleName, middleware.before);
            }

            // Push the action to middleware list
            var bindedMiddlewareAction = self.__controllersRegistry[controllerInfo.registryControllerName][controllerInfo.action_name]
                .bind(self.__controllersRegistry[controllerInfo.registryControllerName]);

            middlewareList.push(bindedMiddlewareAction);

            if (middleware && middleware.after && middleware.after.length && middleware.after instanceof Array) {
                var afterMiddlewareList = self.__getMiddlewareInstanceArray(moduleName, middleware.after);

                for (var i = 0; i < afterMiddlewareList.length; i++) {
                    middlewareList.push(afterMiddlewareList[i]);
                }
            }

            self.__installControllerActionsIntoRoute(controllerInfo, pattern, router, middlewareList);
        });
    });

    // Install all the routes as a bunch under prefix
    this.emit('twee.__setupRoutes.preAppUse', prefix, router, moduleName);
    this.__app.use(prefix || '/', router);
    this.emit('twee.__setupRoutes.postAppUse', prefix, moduleName);
    return this;
};

/**
 * Installing routes for controller-action pairs with all the specified methods.
 *
 * @chainable
 * @method
 * @member twee
 * @param {Object} controllerInfo
 * @param {String} pattern
 * @param {Object} router Instance of __express.Router()__
 * @param {Array} middlewareList The list of instantiated middleware functions to use in the same bunch with controller-action
 * @private
 */
twee.prototype.__installControllerActionsIntoRoute = function(controllerInfo, pattern, router, middlewareList) {

    var self = this;

    controllerInfo.methods.forEach(function(method){
        // Setup router
        router[method](
            pattern,
            middlewareList
        );
    });


    var logMessage = {
        MODULE: controllerInfo.moduleName,
        CONTROLLER: controllerInfo.controller_name,
        ACTION: controllerInfo.action_name,
        METHODS: controllerInfo.methods.join(', ')
    }

    self.log('ROUTES INSTALLED: ' + JSON.stringify(logMessage));
};

/**
 * Instantiate controller for current application module.
 *
 * If it has been instantiated before - then do nothing.
 *
 * If is has not been instantiated - create new instance and try to call __init()__ method.
 *
 * @chainable
 * @method
 * @member twee
 * @param {Object} controllerInfo Details about controller
 * @private
 */
twee.prototype.__instantiateControllerClass = function(controllerInfo) {

    var self = this;

    // Check if it has not been instantiated before - then do it now
    if (!self.__controllersRegistry[controllerInfo.registryControllerName]) {
        // Include controller file
        var controllerRequireString = self.getModulePath(controllerInfo.moduleName, self.MODULE_CONTROLLERS_FOLDER, controllerInfo.controller_name)
            , ControllerClass = require(controllerRequireString);

        // Instantiate and inherit with EventEmitter class
        var controllerClassInstance = new ControllerClass;

        // Check if action exists in controller
        if (!controllerClassInstance[controllerInfo.action_name]) {
            throw new Error('No action: `' + controllerInfo.action_name + '` for Controller: `' + controllerInfo.controller_name + '`');
        }

        controllerClassInstance.prototype = new events.EventEmitter();
        controllerClassInstance.twee = self;
        self.__controllersRegistry[controllerInfo.registryControllerName] = controllerClassInstance;

        // If `init()` method exists in controller - then it should be called once during controller instantiation
        var init_called = false;
        if (self.__controllersRegistry[controllerInfo.registryControllerName]['init']
            && typeof self.__controllersRegistry[controllerInfo.registryControllerName]['init'] == 'function')
        {
            self.emit(
                'twee.__instantiateControllerClass.NewController.PreInit',
                controllerInfo
            );
            self.__controllersRegistry[controllerInfo.registryControllerName].init();
            init_called = true;
            self.emit(
                'twee.__instantiateControllerClass.NewController.PostInit',
                controllerInfo
            );
        }

        var logMessage = {
            MODULE: controllerInfo.moduleName,
            CONTROLLER_INFO: controllerInfo,
            INIT_CALLED: init_called ? 'TRUE' : 'FALSE'
        }
        self.log('CONTROLLER LOADED: ' + JSON.stringify(logMessage));
    }
};

/**
 * Return all the information about controller, action and methods by provided string.
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} controllerString The string of controller
 * @param {Object} router Instance of __express.Router__ is used to check if specified HTTP method function exists in router to set it up.
 * @param {String} moduleName The name of current module. Used for unique controller registry name construction.
 * @returns {{controller_name: string, action_name: string, methods: Array}}
 * @private
 */
twee.prototype.__getControllerInfo = function(controllerString, router, moduleName) {

    var controller_info = controllerString.split('.');

    if (controller_info.length == 0 || !controller_info[0].trim()) {
        throw new Error('Controller config value should follow this pattern: <ControllerName.actionNameAction[.get[,post[...]]]>');
    }

    var controller_name = controller_info[0].trim()
        , action_name = ''
        , methods = [];

    // If no action specified - then use by default indexAction
    if (controller_info.length === 1) {
        action_name = 'indexAction';
        methods.push('all');

    // If action has been specified and only it - then using specified action with `all` method
    } else if (controller_info.length === 2) {
        action_name = controller_info[1].trim();
        methods.push('all');

    // Here specified also HTTP methods, lets extract them
    } else if (controller_info.length === 3) {
        action_name = controller_info[1].trim();
        var _methods = controller_info[2].trim().split(',')
            , at_least_one_method = false;

        // Iterating for all the methods and check if this method exists in router
        _methods.forEach(function(requestMethod){
            requestMethod = requestMethod.trim();
            if (router[requestMethod]) {
                methods.push(requestMethod);
                at_least_one_method = true;
            }
        });

        // If no at least one existing method is used - then install `all`
        if (!at_least_one_method) {
            methods.push('all');
        }
    }

    // Deprecate all the actions that are not endWith `Action`
    if (action_name.indexOf('Action', action_name.length - 6) === -1) {
        throw new Error(
            "Action name for controller have to be in format: <actionName>Action." +
                ' It is used to protect all the methods from calling if they are not for Public requests'
        );
    }

    return {
        controller_name: controller_name,
        action_name: action_name,
        methods: methods,
        registryControllerName: moduleName + '::' + controller_name,
        moduleName: moduleName
    }
};

/**
 * Setting up middleware stack.
 * If placement is `head`, then middlewares list will be loaded from config by this key, and
 * will be sat up before all the routes
 * If placement is `tail`, then the same, but middlewares will be sat up after all the routes dispatching
 * If middlewares param has been passed - then it seems some controller wants some middleware to be
 * executed before controller.
 * Middleware is simple list of files or modules that should return middleware function or an object that includes it.
 *
 * Middleware example:
 *
 *      middleware: [
 *          {
 *              "name": "authMiddleware", // (not required)
 *
 *              // If your middleware is simple file (first priority). It is application specified middleware (not in packages)
 *              "file": "myFolder/myMiddleware"
 *
 *              // OR in module (second priority if both exists)
 *              "module": "express/some/middleware"
 *
 *              // As additional you can pass field name of object that should contain needed middleware:
 *              "method": "myMethod"
 *              // Then it will be passed to router
 *
 *              // If object is too complex with nested hierarchy, then it can be specified like this:
 *              "method": "mySubObject[.mySubObject2[...]].MyMethod"
 *
 *              // If this is a class and you need to use it's method as middleware, then probably
 *              // you want to set up `this` reference to this class. This option will allow to do this:
 *              "reference": true
 *              // It will do something like this:
 *              //      var ref = MyClass.MySubClass
 *              //      middleware = ref[myMethod].bind(ref)
 *
 *              // You can disable middleware by passing this value:
 *              "disabled": true
 *          }
 *      ]
 *
 * @chainable
 * @method
 * @member twee
 * @param moduleName
 * @param middlewareList
 * @returns {Array}
 */
twee.prototype.__getMiddlewareInstanceArray = function(moduleName, middlewareList) {
    if (!middlewareList instanceof Array) {
        throw new Error('Middleware list should be an Array');
    }

    var self = this
        , middlewareInstanceArray = []
        , middlewareModule = null
        , middlewareIndex
        , middlewareListLength = middlewareList.length;

    for (middlewareIndex=0; middlewareIndex < middlewareListLength; middlewareIndex++) {

        var middleware = middlewareList[middlewareIndex]
            , middlewareName = middleware.name || middleware.module || middleware.file
            , uniqueMiddlewareId = self.__getMiddlewareUniqueId(middleware);

        if (this.__middlewareListRegistry[uniqueMiddlewareId]) {
            middlewareModule = this.__middlewareListRegistry[uniqueMiddlewareId];
        } else {
            // Check if it has been disabled
            if (middleware.disabled) {
                this.log('MIDDLEWARE DISABLED: ' + JSON.stringify({MODULE: moduleName, MIDDLEWARE: middlewareName}));
                continue;
            }

            middlewareModule = self.__instantiateMiddlewareModule(middleware, moduleName);
        }

        middlewareInstanceArray.push(middlewareModule);

        this.__middlewareListRegistry[uniqueMiddlewareId] = middlewareModule;
        this.log('MIDDLEWARE LOADED: ' + JSON.stringify({MODULE: moduleName, MIDDLEWARE: middlewareName}));
    }
    return middlewareInstanceArray;
};

/**
 * Returning Middleware Unique ID string (__MUID__).
 *
 * Used to instantiate middleware with needed settings only once.
 *
 * @chainable
 * @method
 * @member twee
 * @param {Object} middleware
 * @returns {*}
 * @private
 */
twee.prototype.__getMiddlewareUniqueId = function(middleware) {
    var middlewareIdObject = {
        f: '',
        me: '',
        mo: '',
        ref: ''
    }

    if (middleware.file) {
        middlewareIdObject.f = middleware.file;
    }

    if (middleware.module) {
        middlewareIdObject.mo = middleware.module;
    }

    if (middleware.method) {
        middlewareIdObject.me = middleware.method;
    }

    if (middleware.reference) {
        middlewareIdObject.ref = 1;
    }

    return JSON.stringify(middlewareIdObject);
};

/**
 * Tries to include middleware file/module and do all the needed stuff to prepare function for including into
 * middleware list for router.
 *
 * @chainable
 * @method
 * @member twee
 * @param middleware
 * @param moduleName
 * @returns {Function}
 * @private
 */
twee.prototype.__instantiateMiddlewareModule = function(middleware, moduleName) {

    var self = this
        , middlewareModule;

    if (!middleware.file && !middleware.module) {
        throw new Error('In module `' + moduleName + '` middleware ' + JSON.stringify(middleware)
            + ' have to be specified with `file` or `module` filed');
    }

    // If there is middleware.method specified then it should be extracted
    middlewareModule = self.__resolveMiddlewareMethod(middleware, moduleName);

    // Then if there are instructions to call the constructor that returns middleware function
    // - we do it
    if (middleware.construct) {
        if (middleware.params) {
            // Resolving configuration injection
            middleware.params = self.__getConfigurationResolvedParams(middleware.params);

            // If params are not array which should be passed to Function.apply - then make params an array
            if (!Array.isArray(middleware.params)) {
                middleware.params = [middleware.params];
            }

            middlewareModule = middlewareModule.apply(null, middleware.params);
        } else {
            middlewareModule = middlewareModule();
        }
    }

    return middlewareModule;
};

/**
 * This function tries to look for entries like this:
 *
 *      "@twee:options:some-option"
 *
 * And replace these things with real configuration parts.
 *
 * The signal for that is __@__ character.
 *
 * @chainable
 * @method
 * @member twee
 * @param {*} params
 * @return {*}
 * @private
 */
twee.prototype.__getConfigurationResolvedParams = function(params) {
    var self = this;

    if (typeof params === 'string') {
        params = self.__replaceStringParamWithConfig(params);

    } else if (params instanceof Array) {
        var paramsLength = params.length;
        for (var i = 0; i < paramsLength; i++) {
            params[i] = self.__getConfigurationResolvedParams(params[i]);
        }

    } else if (params instanceof Object) {
        for (var param in params) {
            params[param] = self.__getConfigurationResolvedParams(params[param]);
        }
    }

    return params;
};

/**
 * Replace string param with it's config value from framework configuration
 *
 * @chainable
 * @method
 * @member twee
 * @param {String} param
 * @returns {String}
 * @private
 */
twee.prototype.__replaceStringParamWithConfig = function (param) {
    var self = this;

    if (typeof param !== 'string') {
        throw new Error('Param should be string to replace its value with real configuration');
    }

    if (param[0] === '@') {
        var replacedParam = param.replace('@', '');
        replacedParam = self.getConfig(replacedParam);

        if (typeof replacedParam === 'undefined') {
            throw new Error('Middleware param does not exists in configs: ' + param
                + '. Should be used for twee.getConfig("' + param.replace('@', '') + '").');
        }
        return replacedParam;
    }
    return param;
};

twee.prototype.__resolveMiddlewareMethod = function(middleware, moduleName) {

    var self = this,
        moduleOrFile = '';

    if (middleware.file) {
        moduleOrFile = self.getModulePath(moduleName, self.MODULE_MIDDLEWARE_FOLDER, middleware.file);
    } else if (middleware.module) {
        moduleOrFile = middleware.module;
    }

    // Instantiating middleware NPM module or local file
    var middlewareModule = require(moduleOrFile);

    if (!middleware.method) {
        return middlewareModule;
    }

    // If method has been sat up - then lets use it
    var method = middlewareModule
        , methodParent = middlewareModule
        , methodParts = String(middleware.method || '').trim().split('.');

    if (methodParts.length) {

        // Going through hierarchy of object and finding out if the last method part is the middleware function
        for (var index = 0; index < methodParts.length; index++) {
            if (method[methodParts[index]]) {
                methodParent = method;
                method = method[methodParts[index]];
            }

            // Check if it is function and not the last - then instantiate it
            if (index < methodParts.length - 1 && typeof method === 'function') {
                method = new method;
            }
        }

        // Do we need to provide class reference to middleware function?
        if (middleware.reference && typeof method === 'function') {
            middlewareModule = method.bind(methodParent);
        } else {
            middlewareModule = method;
        }
    }

    if (typeof middlewareModule !== 'function') {
        throw new Error('Middleware should be a function(req, res, [next]) or another app.use() valid middleware format. ' +
            'If middleware module is complex and `method` has been specified - then final method should be middleware function.');
    }

    return middlewareModule;
};

module.exports = twee;

var express = require('express')
    , path = require('path')
    , swig = require('swig')
    , favicon = require('serve-favicon')
    , logger = require('morgan')
    , mailer = require('express-mailer')
    , colors = require('colors/safe')
    , Localize = require('localize')
    , qorm = require('q-orm')
    , fs = require('fs')
    , extend = require('./utils/extend');

/**
 * twee Framework Class
 * @constructor
 */

function twee() {
    /**
     * Global middlewares registry to avoid double installing them
     * @type {{}}
     * @private
     */
    this.__globalMiddlewaresRegistry = {};

    /**
     * Express Application Instance
     */
    this.app = express();

    /**
     * Flag that shows that framework already bootstrapped
     * @type {boolean}
     * @private
     */
    this.__bootstraped = false;

    /**
     * Base Directory for including all the modules
     * @type {string}
     */
    this.baseDirectory = './';

    /**
     * Environment
     * @type {string}
     */
    this.env = 'production';

    /**
     * Configuration object. Stores all the modules configs and core config
     * @type {{}}
     */
    this.config = {};

    /**
     * Getting Application Instance
     */
    this.getApplication = function() {
        return this.app;
    };

    /**
     * Logging message to console
     * @param message
     * @returns {twee}
     */
    this.log = function(message) {
        console.log(colors.cyan('[CORE] ') + colors.yellow(message));
        return this;
    };

    /**
     * Logging error to console
     * @param message
     * @returns {twee}
     */
    this.error = function(message) {
        console.log(colors.cyan('[CORE][ERROR] ') + colors.red(message));
        return this;
    };

    /**
     * Bootstrapping application
     * @param options Object
     * @returns {twee}
     * @constructor
     */
    this.Bootstrap = function(options) {

        if (this.__bootstraped) {
            return this;
        }

        if (!options || !options.modules) {
            throw new Error('Modules field should not be empty!');
        }

        var modules = options.modules;

        // If this is file path with modules configuration - then load it
        if (typeof modules == 'string') {
            modules = this.Require(modules);
        }

        if (typeof modules != 'object') {
            throw new Error('Modules should be file path or Object');
        }

        // Loading default framework configuration
        var tweeConfig = require('./configs/default');

        // Extending framework configuration during Bootstrapping
        if (options.tweeConfig) {
            if (typeof options.tweeConfig == 'string') {
                var tweeConfigFullPath = path.join(this.baseDirectory, options.tweeConfig);
                try {
                    var loadedTweeConfig = require(tweeConfigFullPath);
                    tweeConfig = extend(true, tweeConfig, loadedTweeConfig);
                } catch (e) {
                    this.error('No valid twee main config specified! Using default values.');
                }
            }
        }

        // Setting up framework config
        this.config.twee = tweeConfig;

        // Setting framework object as global
        global.twee = this;

        // Setting package information
        this.config.twee.package = this.Require('package');
        this.app.settings['x-powered-by'] = 'Twee Framework by Dmitri Meshin <dmitri.mesin@gmail.com>';

        /*this.setupLogging();
        this.setupHttpParsers();
        this.setupStaticFilesServing();
        this.setupSession();
        // TODO
        //this.setupLocalization();
        //this.setupMailer();
        //this.setupDb();
        this.setupView();*/

        // Pre-loading all the modules configs, routes, patterns and other stuff
        this.LoadModulesInformation(modules);
        this.LoadModulesExtensions();

        return this;

        this.setupMiddleware(moduleName, 'head');
        this.setupRoutes(moduleName);
        this.setupMiddleware(moduleName, 'tail');

        this.__setupRouteForEmptyConfiguration();
        return this;
    };

    this.LoadModulesExtensions = function() {
        var self = this;

        for (var moduleName in this.config['__moduleOptions__']) {
            if (this.config['__setup__'][moduleName]['extensions']) {
                if (typeof this.config['__setup__'][moduleName]['extensions'] != 'object') {
                    this.error('Module: ' + moduleName + '. Extensions should be an array');
                    continue;
                }
                this.config['__setup__'][moduleName]['extensions'].forEach(function(extension){
                    extension.name = extension.name || 'Unnamed Extension';
                    extension.name += ' (module `' + moduleName + '`)';
                    if (!extension.file) {
                        throw new Error('Extension has no file: ' + extension.name);
                    }
                    self.log('Installing extension: ' + extension.name);
                    var extensionModule = require(self.config['__folders__'][moduleName]['moduleExtensionsFolder'] + '/' + extension.file);
                    if (typeof extensionModule !== 'function') {
                        throw new Error('Extension `' + extension.name + '` for module `' + moduleName + '` is not callable!');
                    }
                    extensionModule();
                });
            }
        }
        return this;
    };

    /**
     * Default 404 route
     * @private
     */
    this.__setupRouteForEmptyConfiguration = function() {
        this.app.use(function(req, res){
            res.status(404).send('Please Configure Twee Framework');
        });
    };

    /**
     * Loading modules information
     *
     * @param modules
     * @return {twee}
     */
    this.LoadModulesInformation = function(modules) {
        for (var moduleName in modules) {
            var moduleOptions = modules[moduleName];
            if (moduleOptions.disabled == true) {
                this.log('Module `' + moduleName + '` disabled. Skipping.');
                continue;
            }
            this.config['__moduleOptions__'] = this.config['__moduleOptions__'] || {};
            this.config['__moduleOptions__'][moduleName] = moduleOptions;
            this.LoadModuleInformation(moduleName, moduleOptions);
        }
        return this;
    };

    /**
     * Loading one module, including all the configs, middlewares and controllers
     * @param moduleName
     * @param moduleOptions
     * @returns {twee}
     * @constructor
     */
    this.LoadModuleInformation = function(moduleName, moduleOptions) {
        moduleOptions = extend(true, {
            disabled: false,
            prefix: '/',
            disableViewEngine: false
        }, moduleOptions || {});

        this.log('Loading module: ' + moduleName);

        moduleName = String(moduleName).trim();
        if (!moduleName) {
            throw new Error('twee::LoadModule - `moduleName` is empty');
        }

        if (moduleName == 'twee') {
            throw new Error('twee::LoadModule - `twee` name for modules is deprecated. It is used for framework');
        }

        var moduleFolder                    = path.join(this.baseDirectory, 'modules', moduleName)
            , moduleSetupFolder             = path.join(moduleFolder, 'setup')
            , moduleSetupFile              = path.join(moduleFolder, 'setup/setup.json')
            , moduleConfigsFolder           = path.join(moduleFolder, 'setup/configs')
            , moduleControllersFolder       = path.join(moduleFolder, 'controllers')
            , moduleModelsFolder            = path.join(moduleFolder, 'models')
            , moduleMiddlewareFolder        = path.join(moduleFolder, 'middleware')
            , moduleViewsFolder             = path.join(moduleFolder, 'views')
            , moduleExtensionsFolder        = path.join(moduleFolder, 'extensions')
            , moduleL12nFolder              = path.join(moduleFolder, 'l12n');


        this.config['__folders__'] = this.config['__folders__'] || {};
        this.config['__folders__'][moduleName] = {
            module: moduleFolder,
            moduleSetupFolder: moduleSetupFolder,
            moduleSetupFile: moduleSetupFile,
            moduleConfigsFolder: moduleConfigsFolder,
            moduleControllersFolder: moduleControllersFolder,
            moduleModelsFolder: moduleModelsFolder,
            moduleMiddlewareFolder: moduleMiddlewareFolder,
            moduleViewsFolder: moduleViewsFolder,
            moduleExtensionsFolder: moduleExtensionsFolder,
            moduleL12nFolder: moduleL12nFolder
        };

        for (var folder in this.config['__folders__'][moduleName]) {
            if (!fs.existsSync(this.config['__folders__'][moduleName][folder])) {
                throw new Error('twee::LoadModule - `' + colors.red(this.config['__folders__'][moduleName][folder]) + '` does not exists!');
            }
        }

        this.log('Loading configs for module..');

        // Load base configs and overwrite them according to environment
        this.loadConfigs(moduleName, moduleConfigsFolder);

        // Setting up Routes
        this.config['__setup__'] = this.config['__setup__'] || {};
        this.config['__setup__'][moduleName] = require(moduleSetupFile);
        return this;
    };

    /**
     * Loading all the bunch of configs from configuration folder according to environment
     * Configs will be stored in app object with following structure:
     *      app.get('<ModuleName>).<ConfigFileName>.<Config...>
     *
     * @param configsFolder string - configurations folder
     * @returns {twee}
     * @param moduleName
     */
    this.loadConfigs = function(moduleName, configsFolder) {
        var self = this;

        var configs = fs.readdirSync(configsFolder)
            , configsObject = {};

        configs.forEach(function(configFile){
            var configFilePath = path.join(configsFolder, configFile)
                , stats = fs.statSync(configFilePath);

            if (stats.isFile()) {
                var configData = self.loadConfig(configFilePath, moduleName);
                var cD = {};
                cD[configData["name"]] = configData.config;
                configsObject = extend(true, configsObject, cD);
            }
        });

        configsFolder = path.join(configsFolder, this.env);
        configs = fs.readdirSync(configsFolder);

        if (fs.existsSync(configsFolder)) {
            configs.forEach(function(configFile){
                var configFilePath = path.join(configsFolder, configFile)
                    , stats = fs.statSync(configFilePath);

                if (stats.isFile()) {
                    var configData = self.loadConfig(configFilePath, moduleName);
                    var cD = {};
                    cD[configData["name"]] = configData.config;
                    configsObject = extend(true, configsObject, cD);
                }
            });
        } else {
            this.log('No environment configs exists');
            return this;
        }

        this.config[moduleName] = configsObject;
        return this;
    };

    /**
     * Loading config file and returning it's name and contents
     * @param configFile
     * @param moduleName
     * @returns {{name: string, config: *}}
     */
    this.loadConfig = function(configFile, moduleName) {
        var configName = path.basename(configFile).toLowerCase().replace('.json', '')
            , config = require(configFile);

        this.log('Loading Config From Module `' + moduleName + '`: ' + configName + '(' + configFile + ')');
        return {name: configName, config: config};
    };

    /**
     * Setting base directory for including all the rest
     * @param directory
     * @returns {twee}
     */
    this.setBaseDirectory = function(directory) {
        this.baseDirectory = directory;

        // Fixing environment
        this.env = process.env.NODE_ENV;
        if (!this.env) {
            this.log('No NODE_ENV sat up. Setting to `production`');
            this.env = process.env.NODE_ENV = 'production';
        }
        this.log('NODE_ENV: ' + this.env);
        return this;
    };

    /**
     * Returning root application directory
     * @returns {string}
     */
    this.getBaseDirectory = function() {
        return this.baseDirectory;
    };

    /**
     * Including local module
     * @param module
     * @returns {*}
     */
    this.Require = function(module) {
        return require(path.join(this.baseDirectory, module));
    };

    /**
     * Setting View Engine for Frontend
     * @returns {twee}
     */
    this.setupView = function() {
        global.viewEngine = this.app.get('core').viewEngine;

        if (viewEngine.engine == 'swig') {
            this.__setupSwigView(viewEngine);
        }

        // Promise library to setup views
        this.app.use(require('express-promise')());
        return this;
    };

    /**
     * Setting Up swig template engine
     * @private
     */
    this.__setupSwigView = function() {
        var swig = require('swig');
        this.app.engine(global.viewEngine.engineExtension, swig.renderFile);
        this.app.set('view engine', global.viewEngine.engineExtension);
        this.app.set('views', path.join(this.baseDirectory, 'modules'));

        // In development environment disable cache
        if (this.app.get('env') === 'development') {
            this.app.set('view cache', false);
            swig.setDefaults(global.viewEngine.devOptions);
        } else {
            swig.setDefaults(global.viewEngine.options);
        }

        // TODO: setup extensions
        /*var self = this;
         nconf.get('routes:viewHelpers').forEach(function(viewHelper) {
         var includeLanguageTag = self.Require(viewHelper.file);
         swig.setTag(viewHelper.name, includeLanguageTag.parse, includeLanguageTag.compile);
         console.log(
         colors.cyan('[CORE] ')
         + colors.yellow('Installed View Helper: '
         + viewHelper.name)
         );
         });*/
    };

    /**
     * Setting Logging methods
     * @returns {twee}
     */
    this.setupLogging = function() {
        var expressWinston = require('express-winston');
        var winston = require('winston'); // for transports.Console

        // express-winston logger makes sense BEFORE the router.
        this.app.use(expressWinston.logger({
            transports: [
                new winston.transports.Console({
                    json: true,
                    colorize: true
                })
            ]
        }));

        return this;

        var logfile = path.join(this.baseDirectory, this.app.get('core').logging.file)
            , nodefs = require('node-fs');

        // Creating logging directory
        nodefs.mkdirSync(path.dirname(logfile), '0777', true);

        // Creating stream
        var accessLogStream = fs.createWriteStream(logfile, {flags: 'a'});

        this.app.use(logger('combined', {stream: accessLogStream}));
        return this;
    };

    /**
     * Setting all the parsers that are used in HTTP protocol
     * @returns {twee}
     */
    this.setupHttpParsers = function() {
        var faviconFile = this.baseDirectory + this.app.get('core').favicon.file;
        if (fs.existsSync(faviconFile)) {
            this.app.use(favicon(faviconFile));
        }

        var bodyParser = require('body-parser');

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded(this.app.get('core').bodyParser.urlencoded));

        return this;
    };

    /**
     * Setting Static Files handling and serving
     * @returns {twee}
     */
    this.setupStaticFilesServing = function() {
        this.app.use(express.static(path.join(this.baseDirectory, this.app.get('core').staticFiles.directory)));
        return this;
    };

    /**
     * Setting Session Options
     * https://github.com/mranney/node_redis
     * @returns {twee}
     */
    this.setupSession = function() {
        if (!this.app.get('core').session.enabled) {
            return this;
        }

        var _redis = require("redis")
            , redisConfig = this.app.get('core').cache.redis
            , self = this
            , cookieParser = require('cookie-parser')
            , session = require('express-session')
            , RedisStore = require('connect-redis')(session)
            , passport = require('passport');

        global.redis = _redis.createClient(redisConfig);
        global.redis.on("error", function (err) {
            self.error('Redis Error: ' + err);
        });

        var sessionOptions = this.app.get('core').session.options;
        sessionOptions.store = new RedisStore({client: global.redis});
        this.log('Sat Up Redis Session Store');

        this.app.use(cookieParser());
        this.app.use(session(sessionOptions));

        if (this.app.get('core').passport.enabled) {
            this.app.use(passport.initialize());
            this.app.use(passport.session());
        }

        // Handle Session Connection Troubles
        this.app.use(function (req, res, next) {
            if (!req.session) {
                self.error('Session Connection Trouble!');
            }
            next();
        });

        return this;
    };

    /**
     * Setting Mailer Configuration
     *
     * Example of Config:
     *  "mailer": {
            "from": "hitres.ltd@gmail.com",
            "host": "smtp.gmail.com",
            "secureConnection": true,
            "port": "465",
            "transportMethod": "SMTP",
            "auth": {
                "user": "hitres.ltd@gmail.com",
                "pass": "Qwertyhitres.com"
            }
        }
     *
     * @returns {twee}
     */
    this.setupMailer = function() {
        mailer.extend(this.app, nconf.get('mailer'));
        global.mailer = mailer;
        this.app.set('mailer', mailer);
        return this;
    };

    /**
     * Format for controllers in configuration:
     *      <ControllerName>Controller:<MethodName>Action:<get[,post[,all[...]]]>
     *
     * By default HTTP method is set to `all`. It means that all the HTTP methods are acceptable
     *
     * Example of Config:
     *  {
     *      "routes": [
     *       {
     *           "description": "Entry point for application. Landing page",
     *           "pattern": "/",
     *           "controllers": ["IndexController:indexAction"]
     *       }
     *  }
     *
     * Bundles of middlewares can be sat as:
     *      ["IndexController:authAction", "IndexController:indexAction"]
     *
     * @param moduleName string Module Name
     * @param prefix string Module request prefix
     * @returns {twee}
     */
    this.setupRoutes = function(moduleName, prefix) {
        var routesFile = 'modules/' + moduleName + '/setup/routes'
            , routes = this.Require(routesFile)
            , router = express.Router();

        var self = this;

        if (!routes.routes) {
            throw Error('Module: `' + moduleName + '`. No `routes` field in file: ' + colors.red(routesFile));
        }

        routes.routes.forEach(function(route){
            var pattern = route.pattern || ''
                , controllers = route.controllers || []
                , middleware = route.middleware || [];

            if (!pattern) {
                throw Error('Module: `' + moduleName + '`. No valid `pattern` sat for route');
            }

            if (!controllers.length) {
                return;
            }

            // If route has been disabled - then don't process it
            if (route.disabled) {
                return;
            }

            controllers.forEach(function(controller) {
                var controller_info = controller.split('.');
                if (controller_info.length == 0 || !controller_info[0].trim()) {
                    throw new Error('Controller does not have controller name, action and method');
                }

                var controller_name = controller_info[0].trim()
                    , action_name = ''
                    , methods = [];

                if (controller_info.length === 1) {
                    // trying indexAction
                    action_name = 'indexAction';
                    methods.push('all');
                } else if (controller_info.length === 2) {
                    action_name = controller_info[1].trim();
                    methods.push('all');
                } else if (controller_info.length === 3) {
                    action_name = controller_info[1].trim();
                    var _methods = controller_info[2].trim().split(',')
                        , at_least_one_method = false;

                    // Iterating for all the methods and call appropriate router
                    _methods.forEach(function(requestMethod){
                        if (router[requestMethod.trim()]) {
                            methods.push(requestMethod.trim());
                            at_least_one_method = true;
                        }
                    });

                    if (!at_least_one_method) {
                        methods.push('all');
                    }
                }

                // Deprecate all the actions that are not endWith `Action`
                if (action_name.indexOf('Action', action_name.length - 6) === -1) {
                    throw new Error(
                        "Action name for controller have to be in format: <ActionName>Action." +
                        ' It is used to protect all the methods from calling if they are not for Public requests'
                    );
                }

                if (middleware && typeof middleware == 'object') {
                    self.setupMiddleware(moduleName, 'preController-' + controller_name, middleware, pattern);
                }

                var ControllerInstance = self.Require('modules/' + moduleName + '/controllers/' + controller_name);

                // For pre-initializing controller with it's own stuff
                if (!ControllerInstance.__initCalled) {
                    if (ControllerInstance.hasOwnProperty('init')
                        && typeof ControllerInstance['init'] == 'function')
                    {
                        ControllerInstance.init();
                        self.log(
                            colors.yellow('Called ') +
                            colors.cyan(controller_name + '.init()')
                        );
                    }
                    ControllerInstance.__initCalled = true;
                }

                // Iterating over all collected methods and setup controllers into stack
                methods.forEach(function(method){
                    // Setup router
                    router[method](
                        pattern,
                        ControllerInstance[action_name]
                            .bind(ControllerInstance)
                    );

                    self.log(
                        colors.yellow('Sat Up Routing For: ') +
                        colors.cyan('controllers/' + controller_name + '.' + action_name) +
                        colors.yellow(' For method: ') +
                        colors.cyan(method)
                    );
                });
            });
        });

        // Install all the routes as a bunch
        //console.dir(router);
        this.app.use('/', router);
        return this;
    };

    /**
     * Setting up middleware stack.
     * If placement is `head`, then middlewares list will be loaded from config by this key, and
     * will be sat up before all the routes
     * If placement is `tail`, then the same, but middlewares will be sat up after all the routes dispatching
     * If middlewares param has been passed - then it seems some controller wants some middleware to be
     * executed before controller.
     * @param moduleName
     * @param placement
     * @param middlewares
     * @param routePath
     * @returns {twee}
     */
    this.setupMiddleware = function(moduleName, placement, middlewares, routePath) {
        middlewares = middlewares || this.getConfig('__setup__:' + moduleName + ':middleware')[String(placement)] || [];

        //console.log(middlewares);
        if (typeof middlewares != 'object') {
            throw new Error('Middleware list should be an object');
        }

        var self = this;

        middlewares.forEach(function(middleware){
            var middleware_info = middleware.split('.');

            if (middleware_info.length < 2) {
                throw new Error('Middlewares for head and tails must be in format: "CommonMiddleware.switch_language". I.e. "<MiddlewareName>Middleware.<MiddlewareMethod>"');
            }

            var mName = middleware_info[0],
                mMethod = middleware_info[1];

            if (self.__globalMiddlewaresRegistry[mName + '.' + mMethod]) {
                return;
            }
            self.__globalMiddlewaresRegistry[mName + '.' + mMethod] = true;

            var MiddlewareInstance = self.Require('/modules/' + moduleName + '/middleware/' + mName);

            if (MiddlewareInstance[mMethod]) {
                self.log(
                    'Installing `' + placement + '` Global Middleware from module `' + moduleName + '`: ' +
                    colors.cyan(mName + '.' + mMethod)
                );

                if (typeof routePath == 'string') {
                    // If route has been set up - then it is controller specific pre-dispatch middleware
                    self.app.use(routePath, MiddlewareInstance[mMethod]);
                } else {
                    // Otherwise it is global middleware that fires on every request
                    self.app.use(MiddlewareInstance[mMethod]);
                }
            }
        });

        return this;
    };

    /**
     * Setting localisation library
     * @returns {twee}
     */
    this.setupLocalization = function(moduleName) {
        // Using the same object for translations
        this.app.locals.l12n = global.l12n = global.l12n || new Localize();

        var translationsFolder = path.join(this.baseDirectory, moduleName, 'l12n');
        console.log(translationsFolder);
        l12n.loadTranslations(translationsFolder);
        l12n.throwOnMissingTranslation(this.app.get('core').l12n.throwOnMissingTranslation || false);

        // Setting short alias for translate method
        l12n.tr = l12n.tr || l12n.translate;
        global._ = global._ || l12n.translate.bind(l12n);

        return this;
    };

    /**
     * https://github.com/dresende/node-orm2
     * https://github.com/rafaelkaufmann/q-orm
     * @returns {twee}
     */
    this.setupDb = function() {
        var self = this;

        qorm.qConnect(nconf.get('databases:default:url'))
            .then(function(db) {
                // TODO: bootstrap all the models from folder
                var tr = self.Require('models/translates').translates
                    , translates = db.qDefine(tr.name, tr.fields, tr.extra);

                db['models'][tr.name] = translates;

                global.db = self.app.locals.db = db;
                self.app.set('db', db);

                console.log(colors.cyan('[CORE] ') + colors.yellow('Connected to DB.'));
            })
            .fail(function(error){
                if (error) {
                    return console.error(colors.red('[CORE] DB Connection error: ' + error));
                }
            });

        return this;
    };

    /**
     * Returning config by it's path
     * Examples:
     *      twee.getConfig('twee:foo', 'bar')
     *      twee.getConfig('myModule:myConfigFile:myConfig', 'baz')
     *
     * @param key
     * @param defaultValue
     * @returns {*}
     */
    this.getConfig = function(key, defaultValue) {

        key = key.trim();
        var keyParts = key.split(':');

        if (!keyParts.length) {
            return defaultValue;
        }

        for (var i = 0; i < keyParts.length; i++) {
            if (!keyParts[i].trim()) {
                throw new Error('Config path is not correct: ' + colors.red(key));
            }
        }

        var returnedValue = this.config;
        for (i = 0; i < keyParts.length; i++) {
            if (!returnedValue[keyParts[i]]) {
                return defaultValue;
            } else {
                returnedValue = returnedValue[keyParts[i]];
            }
        }

        return returnedValue;
    };

    /**
     * Setting config with all the deepness.
     * If key exists - then value will be replaced
     * If key does not exists - then all the path will be constructed and value will be sat to final path
     *
     * Examples:
     *      twee.setConfig('module:configFile:configName', '777');
     *      // It will produce: {module: {configFile: {configName: '777'}}}
     *
     *      // Setting config for non-existing key
     *      twee.setConfig('module:configFile:NotExistingConfigName', '123');
     *      // will produce: {module: {configFile: {NotExistingConfigName: '123', configName: '777'}}}
     *
     *      // Setting config for non-existing path
     *      twee.setConfig('module:configFile:NotExistingConfigName:foo', '123');
     *      // will produce: {module: {configFile: {NotExistingConfigName: {foo: '123'}, configName: '777'}}}
     *
     * @param key
     * @param value
     * @returns {twee}
     */
    this.setConfig = function(key, value) {
        key = String(key).trim();
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

        var configPointer = this.config; // First time pointer shows root element
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
}

module.exports = twee;

/**
 * Twee Framework Functionality
 */

'use strict';

var express = require('express')
    , path = require('path')
    , swig = require('swig')
    , mailer = require('express-mailer')
    , colors = require('colors/safe')
    , Localize = require('localize')
    , qorm = require('q-orm')
    , fs = require('fs')
    , extend = require('twee-extensions/utils/extend')
    , events = require('events');

/**
 * twee Framework Class
 * @constructor
 */

function twee() {
    /**
     * Registry of middlewares to avoild their double execution
     * @type {{}}
     * @private
     */
    this.__globalMiddlewaresRegistry = {};

    /**
     * Express Application Instance
     * @type express()
     * @private
     */
    this.__app = express();

    /**
     * Flag that shows that framework already bootstrapped
     * @type {boolean}
     * @private
     */
    this.__bootstraped = false;

    /**
     * Base Directory for including all the modules
     * @type {string}
     * @private
     */
    this.__baseDirectory = './';

    /**
     * Environment
     * @type {string}
     * @private
     */
    this.__env = 'production';

    /**
     * Configuration object. Stores all the modules configs and core config
     * @type {{}}
     * @private
     */
    this.__config = {};

    /**
     * Default Module Options
     * @type {{disabled: boolean, prefix: string, disableViewEngine: boolean}}
     * @private
     */
    this.__defaultModuleOptions = {
        disabled: false,
        prefix: '/',
        disableViewEngine: false
    };
}

/**
 * Setting prototype of framework
 */
twee.prototype.__proto__ = new events.EventEmitter();

/**
 * Getting Application Instance
 */
twee.prototype.getApplication = function() {
    return this.__app;
};

/**
 * Alias
 * @type {getApplication}
 */
twee.prototype.getApp = twee.prototype.getApplication;

/**
 * Logging message to console
 * @param message
 * @returns {twee}
 */
twee.prototype.log = function(message) {
    console.log(colors.cyan('[CORE] ') + colors.yellow(message));
    return this;
};

/**
 * Logging error to console
 * @param message
 * @returns {twee}
 */
twee.prototype.error = function(message) {
    console.log(colors.cyan('[CORE][ERROR] ') + colors.red(message));
    return this;
};

/**
 * Bootstrapping application
 * @param options Object
 * @returns {twee}
 * @constructor
 */
twee.prototype.Bootstrap = function(options) {

    this.emit('twee.Bootstrap.Start');

    var self = this;

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
        this.emit('twee.Bootstrap.ModulesList', modules);
    }

    if (typeof modules != 'object') {
        throw new Error('Modules should be file path or Object');
    }

    // Loading default framework configuration
    var tweeConfig = require('./configs/default');
    this.emit('twee.Bootstrap.DefaultConfig', tweeConfig);

    // Extending framework configuration during Bootstrapping
    if (options.tweeConfig) {
        if (typeof options.tweeConfig == 'string') {
            var tweeConfigFullPath = path.join(this.__baseDirectory, options.tweeConfig);
            try {
                var loadedTweeConfig = require(tweeConfigFullPath);
                tweeConfig = extend(true, tweeConfig, loadedTweeConfig);
                this.emit('twee.Bootstrap.ExtendedConfig', tweeConfig);
            } catch (e) {
                this.error('No valid twee main config specified! Using default values.');
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

    // Setting up framework config
    this.__config.twee = tweeConfig;
    this.emit('twee.Bootstrap.Config', tweeConfig);

    // Setting package information
    this.__config.twee.package = this.Require('package');
    this.emit('twee.Bootstrap.PackageInfo');

    // Setting framework object as global
    global.twee = this;

    // Load enabled twee core extensions
    this.LoadTweeExtensions();
    this.emit('twee.Bootstrap.TweeExtensionsLoaded');

    // Pre-loading all the modules configs, routes, patterns and other stuff
    this.LoadModulesInformation(modules);
    this.emit('twee.Bootstrap.ModulesInformationLoaded');

    // All the extensions that execute random not-standart or standart code - runs before everything
    this.LoadModulesExtensions();
    this.emit('twee.Bootstrap.ModulesExtensionsLoaded');

    //this.setupSession();
    // TODO
    //this.setupLocalization();
    //this.setupMailer();
    //this.setupDb();

    // Head middlewares are module-specific and used to initialize something into req or res objects
    this.LoadModulesMiddleware('head');
    this.emit('twee.Bootstrap.ModulesHeadMiddlewareLoaded');

    // Controllers is the place where all the business logic is concentrated
    this.LoadModulesControllers();
    this.emit('twee.Bootstrap.ModulesControllersLoaded');

    // Tail middleware is used for logging and doing post-calculations, post-stuff
    this.LoadModulesMiddleware('tail');
    this.emit('twee.Bootstrap.ModulesTailMiddlewareLoaded');

    // This route will be used to write user that he did not sat up any configuration file for framework
    this.__setupRouteForEmptyConfiguration();
    return this;
};

/**
 * Loading turned on twee extensions
 *
 * @returns {twee}
 */
twee.prototype.LoadTweeExtensions = function() {
    var extensions = this.getConfig('twee:extensions', {})
        , self = this;

    for (var extension_name in extensions) {
        var extension_info = extensions[extension_name];

        if (!extension_info.module) {
            this.error('Extension `' + extension_name + '` has wrong configuration. `module` is not correct');
            continue;
        }

        this.emit('twee.LoadTweeExtensions.PreLoad', extension_name, extension_info);
        // Possibility to disable extension via event
        if (extension_info.disabled) {
            this.log('Extension `' + extension_name + '` disabled. Skipping');
            continue;
        }

        self.log('Loading Twee Extension: ' + colors.yellow(extension_name));
        var extension = require(extension_info.module);

        if (typeof extension != 'function') {
            throw new Error('Extension `' + extension_name + '` should export a callable!');
        }
        extension();
        this.emit('twee.LoadTweeExtensions.Loaded', extension_name, extension_info);
    }
    return this;
};

/**
 * Loading all the modules
 *
 * @returns {twee}
 */
twee.prototype.LoadModulesControllers = function() {
    var self = this;

    for (var moduleName in this.__config['__moduleOptions__']) {
        this.setupRoutes(moduleName, this.__config['__moduleOptions__'][moduleName].prefix || '');
    }

    return this;
};

/**
 * Loading all the middlewares from all modules that should be dispatched before any constructor
 * Head middlewares are executed before all the controllers. It is like preDispatch.
 * Tail middlewares are executed after all the controllers. It is like postDispatch.
 *
 * @param placement String Placement of middleware: head or tail.
 * @returns {twee}
 */
twee.prototype.LoadModulesMiddleware = function(placement) {
    this.emit('twee.LoadModulesMiddleware.Start', placement);
    var self = this;

    for (var moduleName in this.__config['__moduleOptions__']) {
        this.emit('twee.LoadModulesMiddleware.OnLoad', placement, moduleName);
        this.setupMiddleware(moduleName, placement);
        this.emit('twee.LoadModulesMiddleware.Loaded', placement, moduleName);
    }

    this.emit('twee.LoadModulesMiddleware.End', placement);

    return this;
};

/**
 * Loading all extensions from all the modules by order:
 *      ModulesOrder -> ExtensionsOrderInEveryModule
 *
 * @returns {twee}
 */
twee.prototype.LoadModulesExtensions = function() {
    this.emit('twee.LoadModulesExtensions.Start');
    var self = this;

    for (var moduleName in this.__config['__moduleOptions__']) {
        if (this.__config['__setup__'][moduleName]['extensions']) {
            if (typeof this.__config['__setup__'][moduleName]['extensions'] != 'object') {
                this.error('Module: ' + moduleName + '. Extensions should be an array');
                continue;
            }
            for (var extension_name in this.__config['__setup__'][moduleName]['extensions']) {
                var extension = this.__config['__setup__'][moduleName]['extensions'][extension_name];
                extension.name = extension_name;

                self.emit('twee.LoadModulesExtensions.Extension', extension);
                // Here extension can be disabled dynamically
                if (extension.disabled) {
                    self.log('Extension: `' + extension.name + '` for module `' + moduleName + '` is disabled. Skipping.');
                    return;
                }

                if (!extension.file && !extension.module) {
                    throw new Error('Extension has no file: ' + extension.name);
                }

                var extensionModule = '';
                if (extension.file) {
                    extensionModule = require(self.__config['__folders__'][moduleName]['moduleExtensionsFolder'] + '/' + extension.file);
                } else if (extension.module) {
                    extensionModule = require(extension.module);
                }

                self.log('Installing Module (`' + moduleName + '`) extension: ' + extension.name);

                if (typeof extensionModule !== 'function') {
                    throw new Error('Extension `' + extension.name + '` for module `' + moduleName + '` is not callable!');
                }
                extensionModule();
                self.emit('twee.LoadModulesExtensions.ExtensionLoaded', extension);
            }
        }
    }
    this.emit('twee.LoadModulesExtensions.Stop');
    return this;
};

/**
 * Default 404 route
 * @private
 */
twee.prototype.__setupRouteForEmptyConfiguration = function() {
    this.emit('twee.__setupRouteForEmptyConfiguration.Start');
    this.__app.use(function(req, res){
        res.status(404);
        if (req.xhr) {
            res.json({message: 'Please Configure Twee Framework', error: 404});
        } else {
            res.send('Please Configure Twee Framework');
        }
    });
    this.emit('twee.__setupRouteForEmptyConfiguration.End');
};

/**
 * Loading modules information
 *
 * @param modules
 * @return {twee}
 */
twee.prototype.LoadModulesInformation = function(modules) {
    this.emit('twee.LoadModulesInformation.Start');
    for (var moduleName in modules) {
        var moduleOptions = modules[moduleName];
        if (moduleOptions.disabled == true) {
            this.log('Module `' + moduleName + '` disabled. Skipping.');
            continue;
        }
        this.__config['__moduleOptions__'] = this.__config['__moduleOptions__'] || {};
        this.__config['__moduleOptions__'][moduleName] = moduleOptions;
        this.LoadModuleInformation(moduleName, moduleOptions);
    }
    this.emit('twee.LoadModulesInformation.End');
    return this;
};

/**
 * Loading one module, including all the configs, middlewares and controllers
 * @param moduleName
 * @param moduleOptions
 * @returns {twee}
 * @constructor
 */
twee.prototype.LoadModuleInformation = function(moduleName, moduleOptions) {

    this.emit('twee.LoadModuleInformation.Start', moduleName, moduleOptions);

    moduleOptions = extend(true, this.__defaultModuleOptions, moduleOptions || {});

    this.log('Loading module: ' + moduleName);

    moduleName = String(moduleName).trim();
    if (!moduleName) {
        throw new Error('twee::LoadModuleInformation - `moduleName` is empty');
    }

    if (moduleName == 'twee') {
        throw new Error('twee::LoadModuleInformation - `twee` name for modules is deprecated. It is used for framework');
    }

    var moduleFolder                    = path.join(this.__baseDirectory, 'modules', moduleName)
        , moduleSetupFolder             = path.join(moduleFolder, 'setup')
        , moduleSetupFile               = path.join(moduleFolder, 'setup/setup.json')
        , moduleConfigsFolder           = path.join(moduleFolder, 'setup/configs')
        , moduleControllersFolder       = path.join(moduleFolder, 'controllers')
        , moduleModelsFolder            = path.join(moduleFolder, 'models')
        , moduleMiddlewareFolder        = path.join(moduleFolder, 'middleware')
        , moduleViewsFolder             = path.join(moduleFolder, 'views')
        , moduleExtensionsFolder        = path.join(moduleFolder, 'extensions')
        , moduleL12nFolder              = path.join(moduleFolder, 'l12n');

    this.__config['__folders__'] = this.__config['__folders__'] || {};
    this.__config['__folders__'][moduleName] = {
        module:                     moduleFolder,
        moduleSetupFolder:          moduleSetupFolder,
        moduleSetupFile:            moduleSetupFile,
        moduleConfigsFolder:        moduleConfigsFolder,
        moduleControllersFolder:    moduleControllersFolder,
        moduleModelsFolder:         moduleModelsFolder,
        moduleMiddlewareFolder:     moduleMiddlewareFolder,
        moduleViewsFolder:          moduleViewsFolder,
        moduleExtensionsFolder:     moduleExtensionsFolder,
        moduleL12nFolder:           moduleL12nFolder
    };

    // Check all the folders to be required
    for (var folder in this.__config['__folders__'][moduleName]) {
        if (!fs.existsSync(this.__config['__folders__'][moduleName][folder])) {
            throw new Error('twee::LoadModuleInformation - `' + colors.red(this.__config['__folders__'][moduleName][folder]) + '` does not exists!');
        }
    }

    this.log('Loading configs for module..');

    // Load base configs and overwrite them according to environment
    this.loadConfigs(moduleName, moduleConfigsFolder);

    // Loading Routes Information
    this.__config['__setup__'] = this.__config['__setup__'] || {};
    this.__config['__setup__'][moduleName] = require(moduleSetupFile);
    this.emit(
        'twee.LoadModuleInformation.End',
        moduleName,
        this.__config['__setup__'][moduleName],
        this.__config['__folders__'][moduleName]
    );
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
twee.prototype.loadConfigs = function(moduleName, configsFolder) {

    this.emit('twee.loadConfigs.Start', moduleName, configsFolder);

    var self = this
        , configs = fs.readdirSync(configsFolder)
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

    configsFolder = path.join(configsFolder, this.__env);
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

    this.__config[moduleName] = configsObject;
    this.emit('twee.loadConfigs.End', moduleName, this.__config[moduleName]);
    return this;
};

/**
 * Loading config file and returning it's name and contents
 * @param configFile
 * @param moduleName
 * @returns {{name: string, config: *}}
 */
twee.prototype.loadConfig = function(configFile, moduleName) {

    this.emit('twee.loadConfig.Start', configFile, moduleName);

    var configName = path.basename(configFile).toLowerCase().replace('.json', '')
        , config = require(configFile);

    this.log('Loading Config From Module `' + moduleName + '`: ' + configName + '(' + configFile + ')');
    config = {name: configName, config: config};

    this.emit('twee.loadConfig.Start', configFile, moduleName, config);

    return config;
};

/**
 * Setting base directory for including all the rest
 * @param directory
 * @returns {twee}
 */
twee.prototype.setBaseDirectory = function(directory) {
    this.__baseDirectory = directory;

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
 * Returning root application directory
 * @returns {string}
 */
twee.prototype.getBaseDirectory = function() {
    return this.__baseDirectory;
};

/**
 * Including local module
 * @param module
 * @returns {*}
 */
twee.prototype.Require = function(module) {
    return require(path.join(this.__baseDirectory, module));
};

/**
 * Setting Up swig template engine
 * @private
 */
twee.prototype.__setupSwigView = function() {
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
 * Setting Session Options
 * https://github.com/mranney/node_redis
 * @returns {twee}
 */
twee.prototype.setupSession = function() {
    if (!this.__app.get('core').session.enabled) {
        return this;
    }

    var _redis = require("redis")
        , redisConfig = this.__app.get('core').cache.redis
        , self = this
        , cookieParser = require('cookie-parser')
        , session = require('express-session')
        , RedisStore = require('connect-redis')(session)
        , passport = require('passport');

    global.redis = _redis.createClient(redisConfig);
    global.redis.on("error", function (err) {
        self.error('Redis Error: ' + err);
    });

    var sessionOptions = this.__app.get('core').session.options;
    sessionOptions.store = new RedisStore({client: global.redis});
    this.log('Sat Up Redis Session Store');

    this.__app.use(cookieParser());
    this.__app.use(session(sessionOptions));

    if (this.__app.get('core').passport.enabled) {
        this.__app.use(passport.initialize());
        this.__app.use(passport.session());
    }

    // Handle Session Connection Troubles
    this.__app.use(function (req, res, next) {
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
 * @deprecated
 */
twee.prototype.setupMailer = function() {
    mailer.extend(this.__app, nconf.get('mailer'));
    global.mailer = mailer;
    this.__app.set('mailer', mailer);
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
twee.prototype.setupRoutes = function(moduleName, prefix) {
    var routes = require(this.__config['__folders__'][moduleName]['moduleSetupFile'])
        , router = express.Router()
        , controllersRegistry = {};

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

            if (!controllersRegistry[controller_name]) {
                self.log("Loading Controller: `" + controller_name + "`");
                var ControllerClass = require(
                    self.__config['__folders__'][moduleName]['moduleControllersFolder'] + '/' + controller_name
                );
                controllersRegistry[controller_name] = new ControllerClass;
            }

            // For pre-initializing controller with it's own stuff
            if (!controllersRegistry[controller_name].__initCalled) {
                if (controllersRegistry[controller_name]['init']
                    && typeof controllersRegistry[controller_name]['init'] == 'function')
                {
                    controllersRegistry[controller_name].init();
                    self.log(
                        colors.yellow('Called ') +
                        colors.cyan(controller_name + '.init()')
                    );
                }
                // Setting parent class to Controller
                controllersRegistry[controller_name].__initCalled = true;
            }

            // Iterating over all collected methods and setup controllers into stack
            if (!controllersRegistry[controller_name][action_name]) {
                throw new Error('No action: `' + action_name + '` for Controller: `' + controller_name + '`');
            }

            methods.forEach(function(method){
                // Setup router
                router[method](
                    pattern,
                    controllersRegistry[controller_name][action_name]
                        .bind(controllersRegistry[controller_name])
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

    // Install all the routes as a bunch under prefix
    this.__app.use(prefix || '/', router);
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
twee.prototype.setupMiddleware = function(moduleName, placement, middlewares, routePath) {
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

        var MiddlewareInstance = require(self.__config['__folders__'][moduleName]['moduleMiddlewareFolder'] + '/' + mName);

        if (MiddlewareInstance[mMethod]) {
            self.log(
                'Installing `' + placement + '` Global Middleware from module `' + moduleName + '`: ' +
                colors.cyan(mName + '.' + mMethod)
            );

            if (typeof routePath == 'string') {
                // If route has been set up - then it is controller specific pre-dispatch middleware
                self.__app.use(routePath, MiddlewareInstance[mMethod]);
            } else {
                // Otherwise it is global middleware that fires on every request
                self.__app.use(MiddlewareInstance[mMethod]);
            }
        }
    });

    return this;
};

/**
 * Setting localisation library
 * @returns {twee}
 */
twee.prototype.setupLocalization = function(moduleName) {
    // Using the same object for translations
    this.__app.locals.l12n = global.l12n = global.l12n || new Localize();

    var translationsFolder = path.join(this.__baseDirectory, moduleName, 'l12n');
    console.log(translationsFolder);
    l12n.loadTranslations(translationsFolder);
    l12n.throwOnMissingTranslation(this.__app.get('core').l12n.throwOnMissingTranslation || false);

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
twee.prototype.setupDb = function() {
    var self = this;

    qorm.qConnect(nconf.get('databases:default:url'))
        .then(function(db) {
            // TODO: bootstrap all the models from folder
            var tr = self.Require('models/translates').translates
                , translates = db.qDefine(tr.name, tr.fields, tr.extra);

            db['models'][tr.name] = translates;

            global.db = self.__app.locals.db = db;
            self.__app.set('db', db);

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
twee.prototype.getConfig = function(key, defaultValue) {

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

    var returnedValue = this.__config;
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
twee.prototype.setConfig = function(key, value) {
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

module.exports = twee;

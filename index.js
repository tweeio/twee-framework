/**
 * Twee Framework Functionality
 */

"use strict";

var express = require('express')
    , debug = require('debug')('twee')
    , path = require('path')
    , colors = require('colors/safe')
    , fs = require('fs')
    , extend = require('./utils/extend')
    , events = require('events');

/**
 * twee Framework Class
 * @constructor
 */

function twee() {
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
    this.__baseDirectory = '';

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

    /**
     * Registry of extensions to avoid infinity recursion
     * @type {{}}
     * @private
     */
    this.__extensionsRegistry = {};

    /**
     * View helpers registry
     * @type {}
     */
    this.helper = {};

    /**
     * It allows us to call in views:
     *      {{ helper.foo(..) }} or {{ helper['foo'](...) }}
     *      BUT! NOT: {{ foo(...) }} because it can be overwritten by usual passed variables.
     *      So we should protect each of them. We don't want to care about this. So we'll protect only `helper` name.
     * @type {*}
     */
    this.__app.locals.helper = this.helper;

    /**
     * Extending one config from another
     * @type {*|exports}
     */
    this.extend = extend;

    /**
     * HTTP Server instance
     * @type {null}
     * @private
     */
    this.__http = null;

    /**
     * HTTPS Server instance
     * @type {null}
     * @private
     */
    this.__https = null;

    /**
     * For recursy control
     * @type {number}
     * @private
     */
    this.__extensionsRecursyDeepness = 0;
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
 * Logging message to console
 * @param message
 * @returns {twee}
 */
twee.prototype.log = function(message) {
    debug(colors.cyan('[WORKER:' + process.pid + '] ') + colors.yellow(message));
    return this;
};

/**
 * Logging error to console
 * @param message
 * @returns {twee}
 */
twee.prototype.error = function(message) {
    debug(colors.cyan('[WORKER:' + process.pid + '][ERROR] ') + colors.red(message.stack || message.toString()));
    return this;
};

/**
 * Bootstrapping application
 * @param options Object
 * @returns {twee}
 */
twee.prototype.Bootstrap = function(options) {
    if (this.__bootstraped) {
        return this;
    }

    var self = this;

    options = options || {};

    // This is default config state. It can be overwritten before running
    options = extend(true, {
        modules:        'configs/modules',
        tweeConfig:     'configs/twee'
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
        throw new Error('Bootstrap Error: ' + err.stack || err.toString());
    }

    this.__bootstraped = true;
    return this;
};

/**
 * Common bootstrap process is wrapped with exception catcher
 * @param options
 * @returns {twee}
 * @private
 */
twee.prototype.__bootstrap = function(options) {
    this.emit('twee.Bootstrap.Start');

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

    // Setting up framework config
    this.__config.twee = tweeConfig;
    this.emit('twee.Bootstrap.Config', tweeConfig);

    // Setting package information
    this.__config.twee.package = this.Require('package');
    this.emit('twee.Bootstrap.PackageInfo');

    // Setting framework object as global
    global.twee = this;

    // Pre-loading all the modules configs, routes, patterns and other stuff
    this.LoadModulesInformation(modules);
    this.emit('twee.Bootstrap.ModulesInformationLoaded');

    // Load enabled twee core extensions
    this.emit('twee.Bootstrap.TweeExtensionsPreLoad');
    this.LoadExtensions(this.getConfig('twee:extensions', {}), null);
    this.emit('twee.Bootstrap.TweeExtensionsLoaded');

    // All the extensions that execute random not-standard or standard code - runs before everything
    this.LoadModulesExtensions();
    this.emit('twee.Bootstrap.ModulesExtensionsLoaded');

    // Head middlewares are module-specific and used to initialize something into req or res objects
    this.LoadModulesMiddleware('head');
    this.emit('twee.Bootstrap.ModulesHeadMiddlewareLoaded');

    // Controllers is the place where all the business logic is concentrated
    this.LoadModulesControllers();
    this.emit('twee.Bootstrap.ModulesControllersLoaded');

    // Tail middleware is used for logging and doing post-calculations, post-stuff
    this.LoadModulesMiddleware('tail');
    this.emit('twee.Bootstrap.ModulesTailMiddlewareLoaded');

    this.emit('twee.Bootstrap.End');

    // This route will be used to write user that he did not sat up any configuration file for framework
    this.__handle404();

    return this;
};

/**
 * Loading turned on twee extensions
 *
 * @param extensions Object - Extensions object where keys are the names of extensions
 * @param moduleName String The name of current module
 * @returns {twee}
 */
twee.prototype.LoadExtensions = function(extensions, moduleName) {
    for (var extension_name in extensions) {
        extensions[extension_name].name = extension_name;
        this.__resolveDependencies(extensions[extension_name], extensions, moduleName);
    }
    return this;
};

/**
 * Generating extension unique ID for registry
 * @param extension
 * @param moduleName
 * @returns {string}
 * @private
 */
twee.prototype.__getExtensionUniqueID = function(extension, moduleName) {
    return 'module:' + (moduleName || 'twee')
             + (extension.file ? '|file:' + extension.file : '')
             + (extension.module ? '|npm-module:' + extension.module : '')
             + (extension.applicationModule ? '|appModule:' + extension.applicationModule : '');
};

/**
 * Loading all the extensions and it's dependencies tree
 *
 * @param currentExtension
 * @param extensions
 * @param moduleName
 * @private
 */
twee.prototype.__resolveDependencies = function(currentExtension, extensions, moduleName) {

    this.emit('twee.LoadExtensions.PreLoad', currentExtension, moduleName);

    var extensionID = this.__getExtensionUniqueID(currentExtension, moduleName);

    if (this.__extensionsRegistry[extensionID]) {
        return;
    }

    this.__extensionsRegistry[extensionID] = {options: currentExtension, extension: null};

    var moduleLog = moduleName ? '[MODULE::' + moduleName + ']' : '';


    // Dependencies are loaded only when needed by another extensions
    if (currentExtension.dependency || (currentExtension.disabled && !currentExtension.dependency)) {
        return;
    }

    var currentExtensionDependencies;
    currentExtensionDependencies = {};

    // First of all trying to import extension and load it's internal dependencies definition
    if (!currentExtension.module && !currentExtension.file) {
        moduleLog += ('[EXTENSION' + (moduleLog ? '' : '::GLOBAL') + '] ');
        throw new Error(moduleLog + colors.cyan(currentExtension.name) + '` has wrong configuration. `module` AND `file` are not correct');
    }

    // Loading extension module
    var extensionModule = ''
        , extensionModuleFolder = '';
    try {
        // This is simply local file or module
        if (currentExtension.file) {
            if (currentExtension.applicationModule) {
                try {
                    extensionModuleFolder = this.__config['__folders__'][currentExtension.applicationModule]['moduleExtensionsFolder'];
                    extensionModule = require(extensionModuleFolder + currentExtension.file);
                } catch (err) {
                    //noinspection ExceptionCaughtLocallyJS
                    throw new Error('Module `' + currentExtension.applicationModule
                        + '` is not installed. Needed as dependency provider for extension: '
                        + currentExtension.name + '. ' + err.stack || err.toString());
                }
            } else if (moduleName) {
                extensionModuleFolder = this.__config['__folders__'][moduleName]['moduleExtensionsFolder'];
                extensionModule = require(extensionModuleFolder + currentExtension.file);
            } else {
                //noinspection ExceptionCaughtLocallyJS
                throw new Error('Extension is wrong configured: ' + JSON.stringify(currentExtension));
            }

        // This is npm module
        } else if (currentExtension.module) {
            extensionModule = require(currentExtension.module);
        }
    } catch (err) {
        throw err;
    }

    if (!extensionModule.extension || typeof extensionModule.extension !== 'function') {
        moduleLog += ('[EXTENSION' + (moduleLog ? '' : '::GLOBAL') + '] ');
        throw new Error(moduleLog + extensionID + ' should export .extension as `function`');
    }

    this.__extensionsRegistry[extensionID].extension = extensionModule.extension;

    currentExtensionDependencies = extensionModule.dependencies || {};

    if (currentExtension.dependencies && typeof currentExtension.dependencies == 'object' && Object.keys(currentExtension.dependencies).length) {
        // Overwrite dependencies configuration if local configuration presents. It has greater priority
        currentExtensionDependencies = currentExtension.dependencies;
    }

    for (var dep in currentExtensionDependencies) {
        var dependency = currentExtensionDependencies[dep];
        try {
            if (!dependency || typeof dependency !== 'object' || !Object.keys(dependency).length) {
                // It means that dependency is empty object or we have only it's name
                // And should search in global extensions namespace
                if (!extensions[dep]) {
                    //noinspection ExceptionCaughtLocallyJS
                    throw new Error('Dependency info does not exists neither in dependency config nor in global extensions namespace');
                }

                dependency = extensions[dep];
                dependency.dependency = false;
            }

            dependency.name = dep;
            this.__extensionsRecursyDeepness++;
            if (this.__extensionsRecursyDeepness > 100) {
                throw new Error('It seems we have dependencies recursy infinity loop');
            }
            this.__resolveDependencies(dependency, extensions, moduleName);
        } catch (err) {
            throw new Error('Current Extension: `' + currentExtension.name + '`, dependency: `' + dep + '` exception: ' + err.stack || err.toString());
        }
    }

    moduleLog += ('[EXTENSION::' + currentExtension.name + '] ');
    this.log(moduleLog + 'Installed');
    extensionModule.extension();
    this.emit('twee.LoadExtensions.Loaded', currentExtension, moduleName);
};

/**
 * Loading all the modules
 *
 * @returns {twee}
 */
twee.prototype.LoadModulesControllers = function() {
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
    placement = String(placement).trim();
    if (placement !== 'head' && placement !== 'tail') {
        throw new Error('Middleware type should be `head` or `tail`');
    }

    this.emit('twee.LoadModulesMiddleware.Start', placement);

    for (var moduleName in this.__config['__moduleOptions__']) {
        this.emit('twee.LoadModulesMiddleware.OnLoad', placement, moduleName);
        var middlewareList = this.getConfig('__setup__:' + moduleName + ':middleware:' + placement) || {}
            , middlewareInstanceList = this.getMiddlewareInstanceArray(moduleName, middlewareList);

        if (middlewareInstanceList.length) {
            this.__app.use(middlewareInstanceList);
        }

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

    for (var moduleName in this.__config['__moduleOptions__']) {
        if (this.__config['__setup__'][moduleName]['extensions']) {
            if (typeof this.__config['__setup__'][moduleName]['extensions'] != 'object') {
                continue;
            }

            var extensions = this.__config['__setup__'][moduleName]['extensions'];
            this.emit('twee.LoadModulesExtensions.LoadExtensions.Start', moduleName, extensions);
            this.LoadExtensions(extensions, moduleName);
            this.emit('twee.LoadModulesExtensions.LoadExtensions.Stop', moduleName, extensions);
        }
    }
    this.emit('twee.LoadModulesExtensions.Stop');
    return this;
};

/**
 * Default 404 route
 * @private
 */
twee.prototype.__handle404 = function() {
    var self = this;

    // Here we can rewrite environment with framework extending
    this.emit('twee.__handle404.Start');

    this.__app.use(function(err, req, res, next){
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
                res.render(self.getConfig('twee:options:errorPages:404:viewTemplate'), {error: err});
            } else {
                res.send('<h1>' + message + '</h1>');
            }
        }
    });
    this.emit('twee.__handle404.End');
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

    this.log('[MODULE] Loading: ' + colors.cyan(moduleName));

    moduleName = String(moduleName).trim();
    if (!moduleName) {
        throw new Error('twee::LoadModuleInformation - `moduleName` is empty');
    }

    if (moduleName == 'twee') {
        throw new Error('twee::LoadModuleInformation - `twee` name for modules is deprecated. It is used for framework');
    }

    var moduleFolder                    = path.join(this.__baseDirectory, 'modules', moduleName + '/')
        , moduleSetupFolder             = path.join(moduleFolder, 'setup/')
        , moduleSetupFile               = path.join(moduleFolder, 'setup/setup')
        , moduleConfigsFolder           = path.join(moduleFolder, 'setup/configs/')
        , moduleControllersFolder       = path.join(moduleFolder, 'controllers/')
        , moduleModelsFolder            = path.join(moduleFolder, 'models/')
        , moduleMiddlewareFolder        = path.join(moduleFolder, 'middleware/')
        , moduleParamsFolder            = path.join(moduleFolder, 'params/')
        , moduleViewsFolder             = path.join(moduleFolder, 'views/')
        , moduleExtensionsFolder        = path.join(moduleFolder, 'extensions/')
        , moduleI18nFolder              = path.join(moduleFolder, 'i18n/')
        , moduleAssetsFolder            = path.join(moduleFolder, 'assets/');

    this.__config['__folders__'] = this.__config['__folders__'] || {};
    this.__config['__folders__'][moduleName] = {
        module:                     moduleFolder,
        moduleSetupFolder:          moduleSetupFolder,
        moduleSetupFile:            moduleSetupFile,
        moduleConfigsFolder:        moduleConfigsFolder,
        moduleControllersFolder:    moduleControllersFolder,
        moduleModelsFolder:         moduleModelsFolder,
        moduleMiddlewareFolder:     moduleMiddlewareFolder,
        moduleParamsFolder:         moduleParamsFolder,
        moduleViewsFolder:          moduleViewsFolder,
        moduleExtensionsFolder:     moduleExtensionsFolder,
        moduleI18nFolder:           moduleI18nFolder,
        moduleAssetsFolder:         moduleAssetsFolder
    };

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

    if (fs.existsSync(configsFolder)) {
        configs = fs.readdirSync(configsFolder);
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
        this.log('[WARNING] No environment configs exists');
    }

    this.__config[moduleName.toLowerCase()] = configsObject;
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

    var configName = path.basename(configFile).toLowerCase().replace('.json', '').replace('.js', '')
        , config = require(configFile);

    this.log('[MODULE::' + moduleName + '][CONFIGS::' + configName + '] Loaded: ' + configFile);
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
    this.__baseDirectory = this.__baseDirectory || directory || process.cwd();

    // Fixing environment
    this.__env = process.env.NODE_ENV;
    if (!this.__env) {
        this.log('No NODE_ENV sat up. Setting to `production`');
        this.__env = process.env.NODE_ENV = 'production';
    }
    this.log('NODE_ENV: ' + this.__env);
    this.__app.locals.env = this.__env;
    return this;
};

/**
 * Returning root application directory or full subfolder
 *
 * @param postfix String Postfix to add to base directory
 * @returns {string}
 */
twee.prototype.getBaseDirectory = function(postfix) {

    if (typeof postfix === 'string') {
        postfix = String(postfix).trim();
        return path.join(this.__baseDirectory, postfix);
    }

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

twee.prototype.setupParams = function(params, router, moduleName) {
    if (!router.param) {
        throw new Error('Router should be instance of express.Router()');
    }

    if (params && params instanceof Object) {
        for (var param in params) {
            // Regexp can be used too
            //console.log(param, typeof params[param]);
            if (params[param] instanceof RegExp) {
                router.param(param, function(req, res, next, p){
                    if (p.match(params[param])) {
                        next();
                    } else {
                        next('route');
                    }
                });
                this.log('[MODULE::' + moduleName + '][PARAM::' + param + '] Installed as RegExp(' + params[param] + ')');

            // If it is middleware function from setup.js file - it could be passed as is too
            } else if (typeof params[param] === 'function') {
                router.param(param, params[param]);
                this.log('[MODULE::' + moduleName + '][PARAM::' + param + '] Installed as inline middleware');

            // Otherwise it should be an instance or middleware function from file or module or applicationModule/params folder
            } else if (typeof params[param] === 'object') {
                // This is module
                var requireString = '';
                if (params[param].module && typeof params[param].module === 'string') {
                    requireString = params[param].module;
                } else if (params[param].applicationModule
                    && typeof params[param].applicationModule === 'string'
                    && this.__config['__folders__'][params[param].applicationModule]) {
                    if (params[param].file && typeof params[param].file === 'string') {
                        requireString = this.__config['__folders__'][params[param].applicationModule]['moduleParamsFolder'];
                        requireString += params[param].file;
                    }
                } else if (params[param].file && typeof params[param].file === 'string') {
                    requireString = this.__config['__folders__'][moduleName]['moduleParamsFolder'] + params[param].file;
                }

                if (requireString) {
                    var _module = require(requireString);

                    // If method specified - try to go in needed deepness to get right object
                    if (params[param].method) {
                        var methodParts = params[param].method.split('.')
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
                        if (neededMethod instanceof RegExp) {
                            router.param(param, function(req, res, next, p){
                                if (p.match(neededMethod)) {
                                    next();
                                } else {
                                    next('route');
                                }
                            });
                            this.log('[MODULE::' + moduleName + '][PARAM::' + param + '] Installed as RegExp(' + params[param] + ')');
                            continue;
                        }

                        if (typeof neededMethod !== 'function') {
                            throw new Error('Method for router.param() neither RegExp nor Middleware Function');
                        }

                        // If we need to bind function to parent reference - then do it
                        if (params[param].reference && previousMethod instanceof Object) {
                            neededMethod = neededMethod.bind(previousMethod);
                        }

                        router.param(param, neededMethod);
                        this.log('[MODULE::' + moduleName + '][PARAM::' + param + '] Installed as middleware');

                    // if we have no specified method - then in case when it is middleware or RegExp - setup it
                    } else if (typeof _module === 'function' || _module instanceof RegExp) {
                        router.param(param, _module);
                    }
                }
            }
        }
    }
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
    var routesFile = this.__config['__folders__'][moduleName]['moduleSetupFile']
        , routes = require(routesFile)
        , router = express.Router()
        , controllersRegistry = {};

    var self = this;

    if (!routes.routes) {
        throw Error('Module: `' + moduleName + '`. No `routes` field in file: ' + colors.red(routesFile));
    }

    // Install route global params
    this.setupParams(routes.params, router, moduleName);

    routes.routes.forEach(function(route){
        var pattern = route.pattern || ''
            , controllers = route.controllers || []
            , middleware = route.middleware || {}
            , params = route.params || {};

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

        // Installing params for each controller set
        self.setupParams(params, router, moduleName);

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

            if (!controllersRegistry[controller_name]) {
                self.log("[MODULE::" + moduleName + "][CONTROLLER::" + controller_name + "] Loading");
                var ControllerClass = require(self.__config['__folders__'][moduleName]['moduleControllersFolder'] + controller_name);
                controllersRegistry[controller_name] = new ControllerClass;
            }

            // For pre-initializing controller with it's own stuff
            if (!controllersRegistry[controller_name].__initCalled) {
                if (controllersRegistry[controller_name]['init']
                    && typeof controllersRegistry[controller_name]['init'] == 'function')
                {
                    controllersRegistry[controller_name].init();
                    self.log('[MODULE::' + moduleName + '][CONTROLLER][INIT] ' +
                        colors.cyan(controller_name + '.init()'));
                }
                // Setting parent class to Controller
                controllersRegistry[controller_name].__initCalled = true;
            }

            // Iterating over all collected methods and setup controllers into stack
            if (!controllersRegistry[controller_name][action_name]) {
                throw new Error('No action: `' + action_name + '` for Controller: `' + controller_name + '`');
            }

            var middlewareList = [];

            if (middleware && middleware.before && Object.keys(middleware.before).length) {
                self.log('[MODULE::'+ moduleName +'][CONTROLLER:' + colors.cyan(controller_name) + '] Loading PreControllerAction Middleware List');
                middlewareList = self.getMiddlewareInstanceArray(moduleName, middleware.before);
            }

            // This is Controller.Action installaction after `before-middlewares` and before `after-middlewares`
            middlewareList.push(controllersRegistry[controller_name][action_name]
                .bind(controllersRegistry[controller_name]));

            if (middleware && middleware.after && Object.keys(middleware.after).length) {
                self.log('[MODULE::'+ moduleName +'][CONTROLLER:' + colors.cyan(controller_name) + '] Loading PostControllerAction Middleware List');
                var afterMiddlewareList = self.getMiddlewareInstanceArray(moduleName, middleware.after);
                for (var i = 0; i < afterMiddlewareList.length; i++) {
                    middlewareList.push(afterMiddlewareList[i]);
                }
            }

            methods.forEach(function(method){
                // Setup router
                router[method](
                    pattern,
                    middlewareList
                );

                self.log('[MODULE::' + moduleName + '][ROUTE] HTTP METHOD: '
                    + colors.cyan(method)
                    + '. '
                    + 'ACTION: ' + colors.cyan(controller_name + '.' + action_name));
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
 * Middleware is simple list of files or modules that should return middleware function or an object that includes it.
 *
 * Middleware example:
 *      middleware: [
 *          "authMiddleware": {
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
 * @param moduleName
 * @param middlewareList
 * @returns {Array}
 */
twee.prototype.getMiddlewareInstanceArray = function(moduleName, middlewareList) {
    if (typeof middlewareList != 'object') {
        throw new Error('Middleware list should be an object');
    }

    var self = this
        , middlewareInstanceArray = [];

    for (var middlewareName in middlewareList) {
        var middleware = middlewareList[middlewareName];

        if (!middleware.file && !middleware.module) {
            throw new Error('In module `' + moduleName + '` middleware `' + middlewareName + '` have to be specified with `file` or `module` filed');
        }

        // Check if it has been disabled
        if (middleware.disabled) {
            this.log('[MODULE::' + moduleName + '][MIDDLEWARE::' + middlewareName + '] Disabled.');
            continue;
        }

        var middlewareModule = ''
            , middlewareModuleFolder = self.__config['__folders__'][moduleName]['moduleMiddlewareFolder'];

        // Instantiating middleware module
        if (middleware.file) {
            middlewareModule = require(middlewareModuleFolder + middleware.file);
        } else if (middleware.module) {
            middlewareModule = require(middleware.module);
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

            if (typeof method !== 'function') {
                throw new Error('Method should be a function, got: ' + (typeof method) + '. Method: ' + middleware.method + ', middlewareId: ' + middlewareId);
            }

            // Do we need to provide class reference to middleware function?
            if (middleware.reference) {
                middlewareModule = method.bind(methodParent);
            } else {
                middlewareModule = method;
            }
        }

        if (typeof middlewareModule !== 'function') {
            throw new Error('Middleware should be a function(req, res, [next]) or another app.use() valid middleware format');
        }

        middlewareInstanceArray.push(middlewareModule);
        this.log('[MODULE::' + moduleName + '][MIDDLEWARE::' + middlewareName + '] Installed');
    }

    return middlewareInstanceArray;
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

    key = String(key);
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

/**
 * View helper registration method
 *
 * @param name
 * @param helper
 * @returns {twee}
 */
twee.prototype.registerViewHelper = function(name, helper) {
    name = String(name).trim();

    if (!name) {
        throw new Error("Helper `" + name + "` should be not empty string");
    }

    if (typeof helper != 'function') {
        throw new Error("Helper `" + name + "` should be callable");
    }

    if (this.helper[name]) {
        throw new Error("Helper `" + name + "` already registered");
    }

    this.helper[name] = helper;

    return this;
};

/**
 * Creating servers: HTTP, HTTPS, Socket, REST, JSON-RPC
 * @private
 */
twee.prototype.__createServer = function(){
    this.__app.set('port', process.env.PORT || 3000);

    var http = require('http')
        , https = require('https');

    this.__http = http.createServer(this.__app).listen(this.__app.get('port'));

    if (this.getConfig('twee:options:useHTTPS', false)) {
        var options = {
            key: fs.readFileSync(process.cwd() + '/var/ssl/localhost.key'),
            cert: fs.readFileSync(process.cwd() + '/var/ssl/localhost.crt')
        };
        this.__https = https.createServer(options, this.__app).listen(443);
    }

    this.log('Worker ' + process.pid + ' spawned');
};

/**
 * Running application
 */
twee.prototype.run = function() {
    this.setBaseDirectory();
    this.Bootstrap();

    // In development mode we don't need to create workers
    if (this.__env === 'development') {
        return this.__createServer();
    }

    var cluster = require('cluster')
        , numCPUs = require('os').cpus().length
        , self = this;

    var maxWorkers = this.getConfig('twee:options:maxWorkers', 1);
    maxWorkers = (maxWorkers > numCPUs ? numCPUs : maxWorkers);

    if (cluster.isMaster) {
        for (var i = 0; i < maxWorkers; i++) {
            setTimeout(function(){
                cluster.fork();
            }, i*5000);
        }

        cluster.on('exit', function(worker, code, signal) {
            self.log('Worker ' + worker.process.pid + ' died');
            cluster.fork();
        });

        this.emit('twee.run.master', process.pid);
    } else {
        this.__createServer();
        this.emit('twee.run.fork', process.pid);
    }

    this.emit('twee.run', process.pid);
    return this;
};

/**
 * Returning assets folders
 * @returns {{}}
 */
twee.prototype.getModulesAssetsFolders = function() {
    var modulesAssets = {};
    for (var moduleName in this.__config['__folders__']) {
        modulesAssets[moduleName] = this.__config['__folders__'][moduleName]['moduleAssetsFolder'];
    }

    return modulesAssets;
};

/**
 * Returning i18n folders
 * @returns {{}}
 */
twee.prototype.getModulesI18nFolders = function() {
    var modulesI18n = {};
    for (var moduleName in this.__config['__folders__']) {
        modulesI18n[moduleName] = this.__config['__folders__'][moduleName]['moduleI18nFolder'];
    }

    return modulesI18n;
};

/**
 * Collecting all the grunt configs to manage application and modules assets
 * @returns {*}
 */
twee.prototype.collectGruntConfigs = function() {
    var initialConfig = this.Require('configs/grunt');
    var modulesConfig = this.Require('configs/modules');

    if (!modulesConfig instanceof Object) {
        console.log(colors.red('No modules config in application folder: config/modules'));
    } else {
        var moduleConfig = {};
        for (var moduleName in modulesConfig) {
            var moduleConfigPath = 'modules/' + moduleName + '/setup/configs/grunt';
            try {
                moduleConfig = this.Require(moduleConfigPath);
                initialConfig = this.extend(true, initialConfig, moduleConfig);
            } catch (err) {
                console.log(colors.red('[WARN]') + ' Module `' + moduleName + '` has no config: ' + moduleConfigPath);
            }
        }
    }

    return initialConfig;
};

module.exports = (new twee);
#!/usr/bin/env node

// Load required modules
var fs = require('fs')
    , path = require('path')
    , colors = require('colors')
    , commander = require('commander')
    , appGenerator = require('../utils/application-generator')
    , generateNewApplication = appGenerator.generateApplication
    , moduleOrApplicationGeneration = appGenerator.moduleOrApplicationGeneration;

/**
 * Dispatch commands from command line
 */
commander
    .version(require('../package.json').version)
    .option('-a, --application <name>', 'Generate application in specified folder (default: application)', 'application')
    .option('-m, --module <name>', 'Generate new module structure in application', 'Default')
    .option('-f, --folder <path>', 'Where to generate? (default: commander.folder)', process.cwd())
    .option('-e, --engine <engine>', 'What template engine to use in views', 'swig')
    .parse(process.argv);

var defaultOptions = {
    tweeVersion: require('../package').version,
    tweeVersionTemplate: "__TWEE_VERSION__",
    tweeVersionTemplateRegEx: /__TWEE_VERSION__/gi,
    tweeAppNameTemplate: "_Twee-App-Name_",
    tweeAppNameTemplateRegEx: /_Twee-App-Name_/gi,
    moduleName: 'Default',
    moduleNameLowerCase: 'default',
    applicationName: 'application',
    applicationFolder: commander.folder + '/' + this.applicationName,
    tweeModuleNameTemplate: '_Twee-MNT_',
    tweeModuleNameTemplateLowerCased: '_Twee-MNT-LC_',
    tweeModuleNameTemplateRegEx: /_Twee-MNT_/gi,
    tweeModuleNameTemplateLowerCasedRegEx: /_Twee-MNT-LC_/gi,
    applicationSourceFolder: path.join(__dirname, '../templates/application/'),
    generateOnlyModule: false
};

moduleOrApplicationGeneration(defaultOptions, commander);
console.log(colors.cyan('[TWEE] ') + 'Generating Module: ' + colors.cyan(defaultOptions.moduleName));
generateNewApplication(defaultOptions);
console.log(colors.cyan('[TWEE] ') + 'Done.');


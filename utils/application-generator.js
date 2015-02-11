var fse = require('fs-extra')
    , fs = require('fs')
    , path = require('path')
    , colors = require('colors')
    , commander = require('commander')
    , file = require('file');


module.exports.moduleOrApplicationGeneration = function (defaultOptions, commander) {
    // User generates new application
    defaultOptions.applicationName = commander.application.replace(/\s\t/gi, '');
    defaultOptions.applicationFolder = commander.folder + '/' + defaultOptions.applicationName;
    defaultOptions.moduleName = commander.module.replace(/[^a-zA-Z-_.]+/gi, '').capitalize();
    defaultOptions.moduleNameLowerCase = defaultOptions.moduleName.toLowerCase();

    console.log(colors.cyan('[TWEE] ') + 'Generating New Twee Application: ' + colors.cyan(defaultOptions.applicationName));

    if (fs.existsSync(defaultOptions.applicationFolder)) {

        console.log(colors.cyan('[TWEE] ') + 'Application Folder Exists');

        defaultOptions.applicationSourceFolder = defaultOptions.applicationSourceFolder + '/modules/' + defaultOptions.tweeModuleNameTemplate;
        defaultOptions.applicationFolder = defaultOptions.applicationFolder + '/modules/' + defaultOptions.tweeModuleNameTemplate;
        var newModuleFolder = defaultOptions.applicationFolder.replace(defaultOptions.tweeModuleNameTemplateRegEx, defaultOptions.moduleName);

        if (fs.existsSync(newModuleFolder)) {
            console.error(colors.cyan('[TWEE] ') + colors.red('Module folder exists: ' + newModuleFolder));
            process.exit(1);
        }

        defaultOptions.generateOnlyModule = true;
    } else {
        fs.mkdirSync(defaultOptions.applicationFolder);
    }
};

/**
 * Receiving all needed options and generating ready to use new application
 * @param options
 */
module.exports.generateApplication = function(options) {
    // Copying raw template structure
    fse.copySync(
        options.applicationSourceFolder,
        options.applicationFolder
    );

    // If we generate only module - then it won't be touch. Do it in special case
    if (options.generateOnlyModule) {
        var newApplicationFolder = options.applicationFolder.replace(options.tweeModuleNameTemplate, options.moduleName);
        fs.renameSync(options.applicationFolder, newApplicationFolder);
        options.applicationFolder = newApplicationFolder;
    }

    var allDirs = [], i = 0, j = 0, d = '';

    // Collect all the dir paths to rename directories before renaming files and chaning it's content
    file.walkSync(options.applicationFolder, function(dirPath, dirs, files){
        for (var i = 0; i < dirs.length; i++) {
            allDirs.push(path.join(dirPath, dirs[i]));
        }
    });

    // Bubble sort the directories by it's length
    for (i = 0; i < allDirs.length - 1; i++){
        for (j = i + 1; j < allDirs.length; j++){
            if (allDirs[i].length < allDirs[j].length) {
                d = allDirs[i];
                allDirs[i] = allDirs[j];
                allDirs[j] = d;
            }
        }
    }

    // Bubble sort the directories by it's length
    for (i = 0; i < allDirs.length - 1; i++){
        for (j = i + 1; j < allDirs.length; j++){
            if (howManyTimesInPath(allDirs[i], options.tweeModuleNameTemplate) < howManyTimesInPath(allDirs[j], options.tweeModuleNameTemplate)) {
                d = allDirs[i];
                allDirs[i] = allDirs[j];
                allDirs[j] = d;
            }
        }
    }

    // Renaming folders very accurate
    for (i = 0; i < allDirs.length; i++) {
        if (allDirs[i].endsWith(options.tweeModuleNameTemplate)) {
            var offsetStart = allDirs[i].indexOf(options.tweeModuleNameTemplate, allDirs[i].length - options.tweeModuleNameTemplate.length);
            var originalFolder = allDirs[i];
            allDirs[i] = allDirs[i].substr(0, offsetStart) + options.moduleName;
            fs.renameSync(originalFolder, allDirs[i]);
            for (j = 0; j < allDirs.length; j++){
                allDirs[j] = allDirs[j].replace(originalFolder, allDirs[i]);
            }
        }
    }

    //console.log(allDirs);
    // Now we renamed all the folders. Lets read structure once more to rename files
    var allFiles = [];
    file.walkSync(options.applicationFolder, function(dirPath, dirs, files){
        for (i = 0; i < files.length; i++) {
            allFiles.push(path.join(dirPath, files[i]));
        }
    });

    // Rename Patterned Files to new ones
    // And also at the same time with renamed files - replace patterns inside them.
    for (i = 0; i < allFiles.length; i++){
        var newName = allFiles[i].replace(options.tweeModuleNameTemplate, options.moduleName)
            .replace(options.tweeModuleNameTemplateLowerCased, options.moduleNameLowerCase);
        fs.renameSync(allFiles[i], newName);
        allFiles[i] = newName;
        var fileContents = fs.readFileSync(newName);
        fileContents = fileContents.toString()
            .replace(options.tweeAppNameTemplateRegEx, options.applicationName)
            .replace(options.tweeModuleNameTemplateRegEx, options.moduleName)
            .replace(options.tweeModuleNameTemplateLowerCasedRegEx, options.moduleNameLowerCase)
            .replace(options.tweeVersionTemplateRegEx, options.tweeVersion);

        fs.writeFileSync(newName, fileContents);
    }

    // Turning module ON
    var modulesAppConfig = path.join(generateDirectory, options.applicationName, 'configs/modules.js')
        , modulesConfig = require(modulesAppConfig);

    modulesConfig[options.moduleName] = {
        "disabled": false,
        "prefix": (options.generateOnlyModule ? "/" + options.moduleNameLowerCase : "/")
    };
    modulesConfig = JSON.stringify(modulesConfig, null, "\t");
    modulesConfig = "module.exports = " + modulesConfig + ";";
    fs.writeFileSync(modulesAppConfig, modulesConfig);
}


/**
 * Count how many times needed string occurs in source folder path
 * @param source
 * @param needed
 * @returns {number}
 */
function howManyTimesInPath(source, needed) {
    var sourceParts = source.split('/')
        , numberOfNeeded = 0;
    for (var i = 0; i < source.length; i++) {
        if (sourceParts[i] == needed) {
            numberOfNeeded++;
        }
    }

    return numberOfNeeded;
}

/**
 * Check if ends with
 * @param suffix
 * @returns {boolean}
 */
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

/**
 * Capitalize
 * @returns {string}
 */
String.prototype.capitalize = function ()
{
    return this.charAt(0).toUpperCase() + this.slice(1);
};
#!/usr/bin/env node
var extend = require('twee/utils/extend')
    , fs = require('fs')
    , path = require('path')
    , commander = require('commander');

var processLoadCharLast = '';

/**
 * Return progress char
 * @returns {string}
 */
function getProcessLoadChar() {
    processLoadCharLast = processLoadCharLast || '[-]';
    if (processLoadCharLast == '[-]') {
        processLoadCharLast = '[\\]';
    } else if (processLoadCharLast == '[\\]') {
        processLoadCharLast = '[|]';
    } else if (processLoadCharLast == '[|]') {
        processLoadCharLast = '[/]';
    } else if (processLoadCharLast == '[/]') {
        processLoadCharLast = '[-]';
    }

    return processLoadCharLast;
}

/**
 * Translation instructions regex
 * @type {RegExp}
 */
var trRegEx = /(tr\s{0,}\(\s{0,}'([^'](\\\'){0,})+'\s{0,})|(tr\s{0,}\(\s{0,}"([^\"](\\\"){0,})+"\s{0,})/gi;

/**
 * Search for all the entries of tr() in provided directories/files
 * @param directories
 * @returns {{}}
 */
function findTranslations(directories) {
    var translations = {};

    if (typeof directories == 'string') {
        directories = [directories];
    }

    if (!directories instanceof Array) {
        throw new Error('Directories should be string or array');
    }

    try {
        directories.forEach(function(directory){
            process.stdout.write('\rCollecting new translations from code.. ' + getProcessLoadChar());
            var fst = fs.statSync(directory);
            if (fst.isDirectory()) {
                var files = fs.readdirSync(directory);
                if (files) {
                    files.forEach(function(_file){
                        var subtrans = findTranslations(path.join(directory, _file));
                        if (typeof subtrans == 'object') {
                            translations = extend(true, translations, subtrans);
                        }
                    });
                }
            } else if (fst.isFile()) {
                var contents = fs.readFileSync(directory);
                var matches = contents.toString().match(trRegEx);

                if (matches) {
                    //console.log(matches, directory);
                    matches.forEach(function(tr){
                        //console.log(tr);
                        var openStr = ''
                            , translation = ''
                            , prevChr;
                        for (var i = 0; i < tr.length; i++){
                            prevChr = chr;
                            var chr = tr[i];
                            if (!openStr && (chr == '"' || chr == "'")) {
                                openStr = chr;
                            } else if (openStr && (chr == openStr) && prevChr != "\\") {
                                translation = translation.replace("\\\'", "\'").replace("\\\"", "\"");
                                translations[translation] = translation.replace("\\\'", "\'");
                                return;
                            } else if (openStr) {
                                translation += chr;
                            }
                        }
                    });
                }
            }
        });
    } catch (e) {
        console.log(e.stack || e.toString());
        process.exit(1);
    }

    return translations;
}

/**
 * Returning array from comma-separated list
 * @param strList String
 * @returns {Array|*}
 */
function list(strList) {
    return String(strList).split(',');
}

/**
 * Getting all the modules translations from all the modules for all the locales
 * @returns {{}}
 */
function getMergedModulesTranslations() {
    var modulesDirName = path.join(process.cwd(), 'modules');
    var modulesNames = fs.readdirSync(modulesDirName);
    var translations = {};
    modulesNames.forEach(function(moduleName){
        var moduleI18nFolder = path.join(process.cwd(), 'modules', moduleName, 'i18n');
        if (!fs.existsSync(moduleI18nFolder)) {
            return;
        }

        var moduleI18nFiles = fs.readdirSync(moduleI18nFolder);
        if (moduleI18nFiles.length) {
            moduleI18nFiles.forEach(function(moduleI18nFile){

                var fst = fs.statSync(moduleI18nFolder + '/' + moduleI18nFile);
                if (!fst.isFile()) {
                    return;
                }

                var locale = moduleI18nFile.replace('.json', '');

                moduleI18nFile = moduleI18nFolder + '/' + moduleI18nFile;

                translations[locale] = translations[locale] || {};
                translations[locale] = extend(true, translations[locale], require(moduleI18nFile));
            });
        }
    });

    return translations;
}

/**
 * Returning all the application translations as locale hash
 * @returns {{}}
 */
function getApplicationTranslations() {
    var applicationI18nFolder = path.join(process.cwd(), 'i18n')
        , applicationTranslations = {};

    if (!fs.existsSync(applicationI18nFolder)) {
        fs.mkdirSync(applicationI18nFolder);
        // No translations was in application folder. Just return empty hash
        return {};
    }

    // Loading translations
    var translationFiles = fs.readdirSync(applicationI18nFolder);
    if (translationFiles.length) {
        translationFiles.forEach(function(translationFile){
            var fst = fs.statSync(applicationI18nFolder + '/' + translationFile);
            if (fst.isFile()) {
                var locale = translationFile.replace('.json', '');
                translationFile = applicationI18nFolder + '/' + translationFile;
                applicationTranslations[locale] = require(translationFile);
            }
        });
    }

    return applicationTranslations;
}

commander
    //.version(require('../package.json').version)
    .option('-d, --directory <dir[,dir2[,dir3[...]]]>', 'Scan list of folders for `tr(..)` instructions (default: ["modules", "views"])', ['modules', 'views'])
    .option('-l, --locale <locale>', 'Default locale (default: en)', 'en')
    .parse(process.argv);

// ----------------------------------------------------------------------------

var modulesTranslations = {};

// First of all merge all the modules translations into application translations
console.log('Loading all the translates from all modules..');
modulesTranslations = getMergedModulesTranslations();
console.log('Done.');

console.log('Collecting main application translations..');
var applicationTranslations = getApplicationTranslations();
console.log('Done.');

var codeTranslations = findTranslations(list(commander.directory));
console.log();
console.log('Done.');

console.log('Processing everything..');
var translations = {};
translations[commander.locale] = codeTranslations;

translations = extend(true, translations, applicationTranslations);

// Extending application translations with modules translations (which was ready long before)
translations = extend(true, translations, modulesTranslations);

// Extending all the other locales with main locale
for (l in translations) {
    if (l == commander.locale) {
        continue;
    }

    //translations[l] = extend(true, translations[l], translations[commander.locale]);
    for (tr in translations[commander.locale]) {
        if (!translations[l][tr]) {
            translations[l][tr] = translations[commander.locale][tr];
        }
    }
}

// Order all the hashes for all locales by ASC for hash searching optimization
var sortedTranslations = {};
for (l in translations) {
    sortedTranslations[l] = {};
    var sortedKeys = Object.keys(translations[l]).sort(function(a, b) {return (a < b)});
    for (var i = 0; i < sortedKeys.length; i++) {
        sortedTranslations[l][sortedKeys[i]] = translations[l][sortedKeys[i]];
    }
}

translations = sortedTranslations;

// Saving all the translations into application folder
for (l in translations) {
    var applicationI18nFile = path.join(process.cwd(), 'i18n', l + '.json');
    fs.writeFileSync(applicationI18nFile, JSON.stringify(translations[l], null, '\t'));
}

console.log('Done.');
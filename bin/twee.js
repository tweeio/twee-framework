#!/usr/bin/env node

// Load required modules
var fs = require('fs')
    , path = require('path')
    , colors = require('colors')
    , commander = require('commander')
    , fse = require('fs-extra');

/**
 * Getting command line list
 * @param str
 * @returns {*|Array}
 */
function list(str) {
    return str.split(',');
}

/**
 * Dispatch commands from command line
 */
commander
    .version(require('../package.json').version)
    .option('-a, --application <name>')
    //.option('-r, --recursive', 'Set xlocalize to generate translations.json files recursively (default: true)', true)
    //.option('-R, --no-recursive', 'Set xlocalize to generate a translations.json file for the current directory')
    //.option('-e, --extensions <exts>', 'Set the file extensions to include for translation (default: html,js)', list, ['html', 'js'])
    //.option('-t, --translate-to <langs>', 'Set the languages to translate to (comma separated)', list, [])
    .parse(process.argv);

if (commander.application) {
    console.log('Generating Twee Application: ' + commander.application);
    var files = fs.readdirSync(process.cwd());

    if (files.length) {
        //console.error(colors.red('Current directory is not empty. Please generate your new application in empty directory.'));
        //return;
    }

    fse.copySync(
        path.join(__dirname, '../templates/application/'),
        process.cwd()
    );
}

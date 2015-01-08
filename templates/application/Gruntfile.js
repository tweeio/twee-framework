module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);

    // Running notify
    //grunt.task.run('notify_hooks');

    //build scripts
    grunt.registerTask('default', ['bower', 'concat', 'uglify', 'cssmin', 'copy']);

    var defaultConfig = {
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            twee: {
                files:  [
                    '**/*.*',
                    '!**node_modules**',
                    '!**.git**',
                    '!**.idea**'
                ],
                tasks:  ['build-dev', 'express:dev', 'notify:server'],
                options: {
                    // For grunt-contrib-watch v0.5.0+, "nospawn: true" for lower versions.
                    // Without this option specified express won't be reloaded
                    spawn: false
                }
            }
        },
        twee: {
            options: {
                script: './application.js'
            },
            dev: {
                options: {
                    port: 3000,
                    node_env: 'development',
                    background: false
                }
            },
            prod: {
                options: {
                    node_env: 'production',
                    port: 80,
                    background: false
                }
            }
        },
        notify: {
            js: {
                options: {
                    title: 'Twee Grunt',
                    message: 'JavaScript Building Done'
                }
            },
            css: {
                options: {
                    title: 'Twee Grunt',
                    message: 'Styles Building Done'
                }
            },
            server: {
                options: {
                    title: 'Twee Grunt',
                    message: 'Server is ready!'
                }
            }
        }
    };

    var twee = require('twee').setBaseDirectory(__dirname);
    defaultConfig = twee.extend(true, defaultConfig, twee.collectGruntConfigs());

    grunt.initConfig(defaultConfig);
};

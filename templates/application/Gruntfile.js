module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);

    // Running notify
    grunt.task.run('notify_hooks');

    //build scripts
    grunt.registerTask('default', ['bower', 'build', 'watch']);
    grunt.registerTask('build', ['concat', 'uglify', 'cssmin', 'copy']);

    var defaultConfig = {
        pkg: grunt.file.readJSON('package.json')
    };

    var twee = require('twee').setBaseDirectory(__dirname);
    defaultConfig = twee.extend(true, defaultConfig, twee.collectGruntConfigs());

    grunt.initConfig(defaultConfig);
};

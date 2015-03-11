/**
 * Collecting all the grunt configs into one standalone compiled final config to pass it
 * to __grunt-cli__.
 *
 * @member twee/lib/utils/grunt
 * @param {twee} twee Instance of application
 * @returns {Object} Final configuration object
 */
function collectGruntConfigs(twee) {

    var gruntConfig, modulesConfig;
    gruntConfig = twee.getConfig('twee:grunt');
    modulesConfig = twee.getConfig('twee:modules');

    if (!modulesConfig instanceof Object) {
        console.log(colors.red('No modules config in application folder: config/modules'));
    } else {
        var moduleConfig = {};
        for (var moduleName in modulesConfig) {
            var moduleConfigPath = 'modules/' + moduleName + '/setup/configs/grunt';
            try {
                moduleConfig = this.Require(moduleConfigPath);
                gruntConfig = this.extend(true, gruntConfig, moduleConfig);
            } catch (err) {
                console.log(colors.red('[WARN]') + ' Module `' + moduleName + '` has no config: ' + moduleConfigPath);
            }
        }
    }

    return gruntConfig;
}

module.exports.collectGruntConfigs = collectGruntConfigs;
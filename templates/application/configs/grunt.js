module.exports = {
    "bower": {
        "install": {
            "options": {
                "targetDir": "./public/components/vendor/",
                "layout": "byType",
                "install": true,
                "verbose": true,
                "cleanTargetDir": false,
                "cleanBowerDir": false,
                "bowerOptions": {}
            }
        }
    },
    "jshint": {
        "modules": {
            "files": {
                "src": ["Gruntfile.js", "modules/**/*.js", "!**node_modules**"]
            }
        }
    },
    "concat": {
        "options": {
            "sourceMap": true
        },
        "js-core": {
            "src": [
                "public/components/vendor/jquery/dist/jquery.js",
                "public/components/vendor/bootstrap/dist/js/bootstrap.js"
            ],
            "dest": "public/build/<%= pkg.version %>/js/core.<%= pkg.version %>.js"
        },
        "js-ie-support": {
            "src": [
                "public/components/vendor/html5shiv/dist/html5shiv.js",
                "public/components/vendor/respond/dest/respond.js",
                "public/components/vendor/jquery-placeholder/jquery.placeholder.js",
                "public/js/ie10-viewport-fix.js"
            ],
            "dest": "public/build/<%= pkg.version %>/js/ie-support.<%= pkg.version %>.js"
        },
        "css-core": {
            "src": [
                "public/components/vendor/bootstrap/dist/css/bootstrap.css",
                "public/css/custom.css"
            ],
            "dest": "public/build/<%= pkg.version %>/css/core.<%= pkg.version %>.css"
        }
    },
    uglify: {
        core: {
            files: {
                'public/build/<%= pkg.version %>/js/core.<%= pkg.version %>.min.js': ['public/build/<%= pkg.version %>/js/core.<%= pkg.version %>.js']
            }
        },
        ie_support: {
            files: {
                "public/build/<%= pkg.version %>/js/ie-support.<%= pkg.version %>.min.js": ["public/build/<%= pkg.version %>/js/ie-support.<%= pkg.version %>.js"]
            }
        },
        options: {
            compress: true
        }
    },
    cssmin: {
        core: {
            files: {
                'public/build/<%= pkg.version %>/css/core.<%= pkg.version %>.min.css': ['public/build/<%= pkg.version %>/css/core.<%= pkg.version %>.css']
            }
        }
    },
    copy: {
        bootstrap_media: {
            files: [
                {
                    expand: true,
                    flatten: true,
                    //filter: 'isFile',
                    src: ['public/components/vendor/bootstrap/fonts/*.*'],
                    dest: 'public/build/<%= pkg.version %>/fonts/'
                }
            ]
        }
    },
};

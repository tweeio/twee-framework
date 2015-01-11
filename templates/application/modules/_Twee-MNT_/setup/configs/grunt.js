module.exports = {
    "concat": {
        "_Twee-MNT-LC_-js": {
            "src": [
                "modules/_Twee-MNT-LC_/assets/js/*.js",
                "modules/_Twee-MNT-LC_/assets/js/**/*.js"
            ],
            "dest": "public/build/<%= pkg.version %>/js/_Twee-MNT-LC_.<%= pkg.version %>.js"
        },
        "_Twee-MNT-LC_-css": {
            "src": [
                "modules/_Twee-MNT-LC_/assets/css/*.css",
                "modules/_Twee-MNT-LC_/assets/css/**/*.css"
            ],
            "dest": "public/build/<%= pkg.version %>/css/_Twee-MNT-LC_.<%= pkg.version %>.css"
        }
    },
    uglify: {
        "_Twee-MNT-LC_": {
            files: {
                'public/build/<%= pkg.version %>/js/_Twee-MNT-LC_.<%= pkg.version %>.min.js': ['public/build/<%= pkg.version %>/js/_Twee-MNT-LC_.<%= pkg.version %>.js']
            }
        },
        options: {
            compress: true
        }
    },
    cssmin: {
        "_Twee-MNT-LC_": {
            files: {
                'public/build/<%= pkg.version %>/css/_Twee-MNT-LC_.<%= pkg.version %>.min.css': ['public/build/<%= pkg.version %>/css/_Twee-MNT-LC_.<%= pkg.version %>.css']
            }
        }
    },
    copy: {
        "_Twee-MNT-LC_-img": {
            files: [
                {
                    expand: true,
                    flatten: true,
                    //filter: 'isFile',
                    src: ["modules/_Twee-MNT-LC_/assets/img/*.*"],
                    dest: 'public/build/<%= pkg.version %>/img/_Twee-MNT-LC_'
                }
            ]
        },
        "_Twee-MNT-LC_-fonts": {
            files: [
                {
                    expand: true,
                    flatten: true,
                    //filter: 'isFile',
                    src: ["modules/_Twee-MNT-LC_/assets/fonts/*.*"],
                    dest: 'public/build/<%= pkg.version %>/fonts/_Twee-MNT-LC_'
                }
            ]
        }
    }
};

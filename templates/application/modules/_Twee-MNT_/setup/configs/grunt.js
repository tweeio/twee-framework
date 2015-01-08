module.exports = {
    "concat": {
        "default-js": {
            "src": [
                "foo/bar.js"
            ],
            "dest": "public/build/<%= pkg.version %>/default.<%= pkg.version %>.js"
        },
        "default-css": {
            "src": [
                "bas/stop.css"
            ],
            "dest": "public/build/<%= pkg.version %>/default.<%= pkg.version %>.css"
        }
    }
};

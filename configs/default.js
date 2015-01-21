module.exports = {
    "extensions": {
        "HTTP Parser": {
            "module": "twee-http-parser-extension"
        },

        "XML Response": {
            "module": "twee-xml-response-extension",
            "disabled": true
        },

        "Winston Logger": {
            "module": "twee-logging-extension"
        },

        "`Powered With` Header": {
            "module": "twee-powered-extension"
        },

        "Static Files": {
            "module": "twee-static-extension"
        },

        "Session": {
            "module": "twee-session-extension",
            "disabled": true
        },

        "HTML Compressor": {
            "module": "twee-compressor-extension"
        },

        "View Engines": {
            "module": "twee-view-extension"
        },

        "View Helpers": {
            "module": "twee-view-extension/helpers"
        },

        "Passport": {
            "module": "twee-passport-extension",
            "disabled": true
        },

        "i18n": {
            "module": "twee-i18n-extension"
        }
    },

    "options": {
        "i18n": {
            "init": {
                locales:['en', 'ru']
                , defaultLocale: 'en'
                , cookie: 'locale'
                , directory: 'i18n'
                , updateFiles: false
            },
            "autoUpdate": false
        },

        "compress": {
            "html": true,
            "gzip": true
        },

        "passport": {
            "enabled": true
        },

        "staticFiles": {
            "directory": "public"
        },

        "logging": {
            "winston": {
                "accessFile": "var/log/access.json",
                "exceptionsFile": "var/log/exceptions.json",
                "exitOnError": false,
                "consoleLogging": false,
                "consoleLoggingOptions": {
                    "colorize": true,
                    // optional: control whether you want to log the meta data about the request (default to true)
                    "meta": true,
                    "msg": "HTTP {{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}",
                    // Use the default Express/morgan request formatting, with the same colors. Enabling this will override any msg and colorStatus if true.
                    // Will only output colors on transports with colorize set to true
                    "expressFormat": true,
                    "colorStatus": true
                }
            }
        },

        "favicon": {
            "file": "public/favicon.ico"
        },

        "bodyParser": {
            "urlencoded": {
                "extended": false
            }
        },

        "session": {
            "enabled": true,
            "options": {
                "secret": "expR3ssS3cR3TASD:Fwfk%$^$%&*&",
                "cookie": {
                    "secure": false,
                    "maxAge": 999999999999,
                    "signed": true,
                    "path": "/"
                },
                "resave": true,
                "saveUninitialized": true
            }
        },

        "view": {
            "engines": {
                "swig": {
                    "fileExt": "html",
                    "options": {
                        "cache": "memory"
                    },
                    "disabled": false
                }
            },
            "appDefaultEngine": "html"

        },

        "cache": {
            "redis": {
                "host": "127.0.0.1",
                "port": 6379
            },
            "memcache": {}
        },

        "errorPages": {
            "404": {
                "viewTemplate": __dirname + "/../templates/pages/404.html"
            }
        }
    }
};

module.exports = {
    "extensions": {
        "Twee Basic HTTP Parsers": {
            "module": "twee-extensions/http/parsers"
        },

        "Twee Response Formats": {
            "module": "twee-extensions/http/responses"
        },

        "Twee Winston Logger": {
            "module": "twee-extensions/logging/winston"
        },

        "Twee Custom Headers": {
            "module": "twee-extensions/http/headers/requested-with"
        },

        "Twee Static Files Serving": {
            "module": "twee-extensions/http/static"
        },

        "Twee Session": {
            "module": "twee-extensions/http/session",
            "disabled": true
        },

        "Twee Compressor": {
            "module": "twee-extensions/http/compressor"
        },

        "Twee View Engines": {
            "module": "twee-extensions/view/engines"
        },

        "Twee View Helpers": {
            "module": "twee-extensions/view/helpers"
        },

        "Twee Passport": {
            "module": "twee-extensions/http/session/passport",
            "disabled": true
        },

        "Twee i18n": {
            "module": "twee-extensions/i18n"
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
                "html": "swig"
            },
            "defaultEngine": "html"
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

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
        "errorPages": {
            "404": {
                "viewTemplate": __dirname + "/../templates/pages/404.html"
            }
        }
    }
};

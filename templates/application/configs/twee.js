module.exports = {
    "extensions": {
        "i18n": {
            "module": "twee-i18n-extension",
            "dependencies": {
                "Cookies": {
                    "module": "twee-cookies-extension"
                }
            }
        }
    },
    "options": {
        "errorPages": {
            "404": {
                "viewTemplate": __dirname + "/../views/common/pages/404.html"
            }
        }
    }
};

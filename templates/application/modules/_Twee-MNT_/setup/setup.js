module.exports = {
    "params": {
        "id": /^\d+$/,
        "range": {
            "file": "RangeParam"
        }
    },
    "middleware": {
        "description": "These are globally installed middleware functions",
        "head": [
            // Middleware Example
            {
                "name": "_Twee-MNT_ Middleware",
                "file": "_Twee-MNT_Middleware",
                "method": "_Twee-MNT-LC_Middleware"
            },
            // Middleware for UI translating
            {
                "name": "SwitchLanguage",
                "file": "LanguageMiddleware",
                "method": "switchLanguage"
            }
        ],
        "tail": []
    },
    "extensions": {
        // Dummy Extension Example
        "_Twee-MNT_ Extensions": {
            "file": "_Twee-MNT_Extension"
        }
    },
    "routes": [
        {
            "description": "Entry point for application. Landing page",
            // Example of pattern with not-required `range` param
            // Try URLs: /123-456 and /123-a456
            "pattern": "/:range?",
            "controllers": ["_Twee-MNT_Controller.indexAction"],
            "middleware": {
                "before": [],
                "after": []
            }
        },
        {
            "description": "Bootstrap Styles Page",
            // Check in URL without ID and with different ID (INT and not INT):
            // /bootstrap/a123 and /bootstrap/123
            "pattern": "/bootstrap/:id?",
            "controllers": ["_Twee-MNT_Controller.bootstrapAction"],
            "middleware": {
                "before": [],
                "after": []
            }
        }
    ]
};

module.exports = {
    "params": {},
    "middleware": {
        "description": "These are globally installed middleware functions",
        "head": [
            {
                "name": "_Twee-MNT_ Middleware",
                "file": "_Twee-MNT_Middleware",
                "method": "_Twee-MNT-LC_Middleware"
            },
            {
                "name": "SwitchLanguage",
                "file": "LanguageMiddleware",
                "method": "switchLanguage"
            }
        ],
        "tail": []
    },
    "extensions": {
        "_Twee-MNT_ Extensions": {
            "file": "_Twee-MNT_Extension"
        }
    },
    "routes": [
        {
            "description": "Entry point for application. Landing page",
            "pattern": "/",
            "controllers": ["_Twee-MNT_Controller.indexAction"],
            "middleware": {
                "before": [],
                "after": []
            }
        },
        {
            "description": "Bootstrap Styles Page",
            "pattern": "/bootstrap/",
            "controllers": ["_Twee-MNT_Controller.bootstrapAction"],
            "middleware": {
                "before": [],
                "after": []
            }
        }
    ]
};

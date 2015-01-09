module.exports = {
    "params": [],
    "middleware": {
        "description": "These are globally installed middleware functions",
        "head": {
            "_Twee-MNT_ Middleware": {
                "file": "_Twee-MNT_Middleware",
                "method": "_Twee-MNT-LC_Middleware"
            }
        },
        "tail": {}
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
                "before": {},
                "after": {}
            }
        }
    ]
};

require.config({
    // Paths that contain the various different javascript files.
    "paths": {
        "lib": "./lib",
        "utils/dates": "./lib/utils/dates",
        "utils/strings": "./lib/utils/strings",
        "utils/numbers": "./lib/utils/numbers",
        "models": "./models",
        "collections": "./collections",
        "views": "./views",

        // Library paths.
        "jquery": "./lib/jquery",
        "underscore": "./lib/lodash",
        "backbone": "./lib/backbone",
        "hogan": "./lib/hogan"
    },

	// The shim config allows us to configure dependencies for
	// scripts that do not call define() to register a module
	"shim": {
		"underscore": {
			"exports": '_'
		},
		"backbone": {
			"deps": [
				"underscore",
				"jquery"
			],
			"exports": "Backbone"
        },
        "hogan": {
            "exports": "Hogan"
        }
	}
});

define([
    "lib/domReady",
    "router",
    "app",
    "views/view.search",
    "views/view.list",
    "collections/collection.packages"
], function(domReady, Router, app, SearchView, ListView, Packages) {
    domReady(function() {
        app.views.search = new SearchView();
        app.views.list = new ListView({
            "collection": new Packages()
        });
        app.router = new Router();
    });
});


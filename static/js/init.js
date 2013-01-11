require.config({
    // Paths that contain the various different javascript files.
    "deps": ["init"],
    "paths": {
        "models": "./models",
        "collections": "./collections",
        "views": "./views",

        // Library paths.
        "jquery": "./lib/jquery",
        "underscore": "./lib/lodash",
        "backbone": "./lib/backbone",
        "swig": "./lib/swig"
    },

	// The shim config allows us to configure dependencies for
	// scripts that do not call define() to register a module
	"shim": {
        "jquery": {
            "exports": "$"
        },
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
        "swig": {
            "exports": "swig"
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
        // hijack all relative links for pushState enabled browsers
        if (Backbone.history && Backbone.history._hasPushState) {
            $(document).on("click", "a", function (event) {
                // Get the anchor href and protcol
                var href = $(this).attr("href");
                var protocol = this.protocol + "//";
                // Ensure the protocol is not part of URL, meaning its relative.
                // Stop the event bubbling to ensure the link will not cause a page refresh.
                if (href.slice(0, protocol.length) !== protocol &&
                        href.indexOf("/download/") < 0) {
                    event.preventDefault();
                    app.router.navigate(href, true);
                }
            });

        }
    });
});


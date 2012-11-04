define([
    "backbone",
    "app"
], function(Backbone, app) {

    var Router = Backbone.Router.extend({

        "routes": {
           "packages/:name": "single",
           "search/*q": "search",
            "*actions": "index"
        },

        "initialize": function(settings) {
            Backbone.history.start({
                "pushState": true
            });
            return this;
        }

    });

    Router.prototype.index = function() {
        app.views.list.search(null);
    };

    Router.prototype.search = function(q) {
        app.views.list.search(decodeURIComponent(q));
    };

    Router.prototype.single = function(name) {
        app.views.list.single(name);
    };

    return Router;
});

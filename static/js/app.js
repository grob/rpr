define(function(require, exports, module) {

    var MainView = require("views/view.main").MainView;
    var Packages = require("collections/collection.packages").Packages;

    var App = exports.App = Backbone.Router.extend({

        "routes": {
           "": "index"
        },

        "init": function(settings) {
            var mainView = new MainView({
                "collection": new Packages()
            });
            Backbone.history.start();
        }

    });

    App.prototype.index = function() {
        console.log("Route: INDEX");
    }

});

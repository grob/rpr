define(function(require, exports, module) {

    var PackageView = require("views/view.package").PackageView;

    var MainView = exports.MainView = Backbone.View.extend({
       "el": "#main",

        "events": {
            "keyup #search": "search"
        },

        "initialize": function() {
            this.collection.bind("reset", this.render, this);
            this.collection.fetch();
            return this;
        }

    });

    MainView.prototype.render = function() {
        var $list = $("#list", this.el).empty();
        this.collection.each(function(package) {
            var packageView = new PackageView({
                "model": package
            });
            $list.append(packageView.render().el);
        });
    };

    MainView.prototype.search = function(event) {
        this.collection.fetch({
            "data": {
                "q": $(event.target).val() || "",
                "limit": 50
            }
        });
    };
});
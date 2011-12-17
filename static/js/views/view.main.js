define(function(require, exports, module) {

    var PackageView = require("views/view.package").PackageView;
    var query = null;
    var timeoutId = null;

    var MainView = exports.MainView = Backbone.View.extend({
       "el": "#main",

        "events": {
            "keyup #search": "handleInput"
        },

        "initialize": function() {
            this.collection.bind("reset", this.renderList, this);
            return this;
        }

    });

    MainView.prototype.render = function() {
        $("#list", this.el).empty();
        var q = $("#search").val();
        if (q.length > 0) {
            this.search(q);
        }
        return this;
    };

    MainView.prototype.renderList = function() {
        $("#loader", this.el).hide();
        var $list = $("#list", this.el).empty();
        this.collection.each(function(package) {
            var packageView = new PackageView({
                "model": package
            });
            $list.append(packageView.render().el);
        });
    };

    MainView.prototype.handleInput = function(event) {
        var q = $(event.target).val();
        if (event.keyCode === 13) {
            // immediate search when pressing enter key
            window.clearTimeout(timeoutId);
            this.search(q);
        } else if (q != query) {
            window.clearTimeout(timeoutId);
            timeoutId = window.setTimeout($.proxy(function() {
                this.search(q);
            }, this), 500);
        }
    };

    MainView.prototype.search = function(q, limit) {
        query = q;
        if (q.length > 0) {
            $("#loader", this.el).show();
            this.collection.fetch({
                "data": {
                    "q": q || "",
                    "limit": limit || 50
                }
            });
        }
    }
});
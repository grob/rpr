define(function(require, exports, module) {

    var ListView = require("views/view.list").ListView;
    var query = null;
    var timeoutId = null;

    var MainView = exports.MainView = Backbone.View.extend({
        "el": "#main",
        "$searchInput": $("#search", this.el),

        "events": {
            "keyup #search": "handleInput"
        },

        "initialize": function() {
            this.listView = new ListView({
                "collection": this.collection
            });
            this.collection.bind("fetching", this.onLoading, this);
            this.collection.bind("fetched", this.onLoaded, this);
            this.search(this.$searchInput.val());
            return this;
        }

    });

    MainView.prototype.onLoading = function() {
        this.$searchInput.addClass("active");
    };

    MainView.prototype.onLoaded = function() {
        this.$searchInput.removeClass("active");
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
        this.listView.search(q, 20);
    }
});
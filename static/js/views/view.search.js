define(function(require, exports, module) {

    var SearchView = exports.SearchView = Backbone.View.extend({
        "el": "#search",
        "timeoutId": null,
        "events": {
            "keyup": "search"
        }
    });

    SearchView.prototype.search = function(event) {
        if (this.timeoutId != null) {
            window.clearTimeout(this.timeoutId);
        }
        this.timeoutId = window.setTimeout($.proxy(function() {
            console.log("TRIGGERING SEARCH EVENT", event);
            this.trigger("update");
        }, this), 200);
    };

});

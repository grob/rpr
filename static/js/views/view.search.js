define([
    "backbone",
    "app"
], function(Backbone, app) {

    var timeoutId = null;

    var SearchView = Backbone.View.extend({
        "el": "#search",
        "events": {
            "keyup": "handleInput"
        },

        "initialize": function() {
            app.on("list:loading", this.onLoading, this);
            app.on("list:loaded", this.onLoaded, this);
            this.query = this.$el.val();
            return this;
        }

    });

    SearchView.prototype.onLoading = function(q) {
        this.$el.val(q).addClass("active");
    };

    SearchView.prototype.onLoaded = function() {
        this.$el.removeClass("active");
        this.setDocTitle();
    };

    SearchView.prototype.handleInput = function(event) {
        var q = this.$el.val();
        if (event.keyCode === 13) {
            // immediate search when pressing enter key
            window.clearTimeout(timeoutId);
            this.query = q;
            app.views.list.search(q);
            app.router.navigate("search/" + encodeURIComponent(q));
        }
    };

    SearchView.prototype.setDocTitle = function() {
        var docTitle = window.document.title;
        docTitle = docTitle.split(":").slice(0, 1);
        if (this.query.length > 0) {
            docTitle.push("'" + this.query + "'");
        }
        window.document.title = docTitle.join(": ");
    };

    return SearchView;

});
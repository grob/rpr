define(function(require, exports, module) {

    var ListView = require("views/view.list").ListView;
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
            this.query = this.$searchInput.val();
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
        var q = this.$searchInput.val();
        if (event.keyCode === 13) {
            // immediate search when pressing enter key
            window.clearTimeout(timeoutId);
            window.location.hash = "#!/search/" + q;
        }
    };

    MainView.prototype.setDocTitle = function() {
        var docTitle = window.document.title;
        docTitle = docTitle.split(":").slice(0, 1);
        if (this.query.length > 0) {
            docTitle.push("'" + this.query + "'");
        }
        window.document.title = docTitle.join(": ");
    };

    MainView.prototype.search = function(q, limit) {
        this.query = q || "";
        this.$searchInput.val(this.query).focus();
        this.setDocTitle();
        this.listView.search(this.query, 20);
    };

    MainView.prototype.single = function(name) {
        this.query = name || "";
        this.$searchInput.val("").blur();
        this.setDocTitle();
        this.listView.single(name);
    };

});
define([
    "backbone",
    "app",
    "views/view.package",
    "models/model.package"
], function(Backbone, app, PackageView, Package) {

    var ListView = Backbone.View.extend({
        "el": "#list",
        "events": {
            "click #loadmore": "loadMore"
        },
        "initialize": function() {
            this.$result = this.$("#result");
            this.$loadmore = this.$("#loadmore").hide();
            this.perPage = 10;
            this.collection.bind("reset", this.clearList, this);
            this.collection.bind("fetched", this.onLoaded, this);
        }
    });

    ListView.prototype.clearList = function() {
        this.$result.empty();
    };

    ListView.prototype.onLoaded = function() {
        this.$loadmore.removeClass("active");
        var items = this.collection.rest(this.collection.offset).map(function(package) {
            var packageView = new PackageView({
                "model": package
            });
            return packageView.render().el;
        });
        this.$result.append($(items).hide().fadeIn(300));
        $(items[0]).addClass("pageborder");
        this.$loadmore.toggle(this.collection.hasMore());
        if (this.query) {
            this.setDocTitle("Search for '" + this.query + "'");
        } else {
            this.setDocTitle();
        }
        app.trigger("list:loaded", this.query);
    };

    ListView.prototype.loadMore = function(event) {
        this.$loadmore.addClass("active");
        this.collection.fetch({
            "add": true,
            "data": _.extend(this.getUrlParameters(), {
                "o": this.collection.length
            })
        });
        return false;
    };

    ListView.prototype.getUrlParameters = function() {
        return {
            "q": this.query,
            "l": this.perPage
        };
    };

    ListView.prototype.search = function(q, perPage) {
        this.query = q || "";
        this.perPage = perPage || this.perPage;
        this.offset = 0;
        this.collection.fetch({
            "data": this.getUrlParameters()
        });
        app.trigger("list:loading", this.query);
    };

    ListView.prototype.single = function(name) {
        (new Package()).fetch({
            "url": "/api/packages/" + name + "/",
            "success": $.proxy(function(model) {
                var packageView = new PackageView({
                    "model": model
                });
                $(packageView.render().el)
                    .appendTo(this.$result.empty())
                    .addClass("selected").triggerHandler("click");
                this.$loadmore.hide();
                this.setDocTitle(name);
            }, this)
        });
    };

    ListView.prototype.setDocTitle = function(text) {
        var docTitle = window.document.title;
        docTitle = docTitle.split(":").slice(0, 1);
        if (typeof(text) === "string" && text.length > 0) {
            docTitle.push(text);
        }
        window.document.title = docTitle.join(": ");
    };

    return ListView;

});

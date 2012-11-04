define([
    "backbone",
    "app",
    "views/view.package",
    "models/model.package"
], function(Backbone, app, PackageView, Package) {

    var ListView = Backbone.View.extend({
        "el": "#list",
        "$result": $("#result", this.el),
        "$loadmore": $("#loadmore", this.el).hide(),

        "events": {
            "click #loadmore": "loadMore"
        },

        "initialize": function() {
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
        app.trigger("list:loaded");
    };

    ListView.prototype.loadMore = function(event) {
        event.preventDefault();
        this.$loadmore.addClass("active");
        this.collection.fetch({
            "add": true,
            "data": _.extend(this.getUrlParameters(), {
                "o": this.collection.length
            })
        });
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
        app.trigger("list:loading", q);
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
            }, this)
        });
    };

    return ListView;

});

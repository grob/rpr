define([
    "underscore",
    "backbone",
    "app",
    "swig",
    "views/view.details",
    "views/view.versions"
], function(_, Backbone, app, swig, DetailsView, VersionsView) {

    var PackageView = Backbone.View.extend({
        "tagName": "li",
        "template": swig.compile(document.getElementById("tmpl-package").innerHTML),
        "events": {
            "click .menu li.details": "toggleDetails",
            "click .menu li.versions": "toggleVersions",
            "click h2 a": function(event) {
                app.router.navigate($(event.target).attr("href"), true);
                return false;
            },
            "click": "toggle"
        }
    });

    PackageView.prototype.render = function() {
        this.$el.append(this.template(this.model.toJSON()));
        return this;
    };

    PackageView.prototype.toggle = function(event) {
        if ($(event.target).is("a")) {
            return;
        }
        if (this.current != null) {
            this.toggleTab(this.$(".menu li.expanded"), this.current.constructor);
        } else {
            this.toggleTab(this.$(".menu li.details"), DetailsView);
        }
    };

    PackageView.prototype.toggleDetails = function(event) {
        event.stopImmediatePropagation();
        this.toggleTab($(event.target), DetailsView);
    };

    PackageView.prototype.toggleVersions = function(event) {
        event.stopImmediatePropagation();
        this.toggleTab($(event.target), VersionsView);
    };

    PackageView.prototype.toggleTab = function($menuItem, View) {
        if (this.current != null) {
            if (this.current instanceof View) {
                $menuItem.removeClass("expanded");
                this.current.close(true);
                this.current = null;
                return;
            } else {
                this.current.close();
            }
        }
        $menuItem.addClass("expanded").siblings().removeClass("expanded");
        var view = new View({
            "model": this.model
        });
        var $tab = this.$(".tab").html(view.render().el).hide();
        if (this.current == null) {
            $tab.slideDown("fast");
        } else {
            $tab.show();
        }
        this.current = view;
    };

    return PackageView;

});
define([
    "underscore",
    "backbone",
    "swig"
], function(_, Backbone, swig) {

    var VersionsView = Backbone.View.extend({
        "tagName": "dl",
        "className": "versions",
        "template": swig.compile(document.getElementById("tmpl-versions").innerHTML),
        "events": {
            "click .checksums": "toggleChecksums"
        },
        "render": function() {
            console.log(this.model.toJSON());
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    });

    VersionsView.prototype.toggleChecksums = function(event) {
        event.stopPropagation();
        var $toggler = $(event.target).toggleClass("expanded");
        $toggler.next("dd.checksums").slideToggle("fast");
    };

    VersionsView.prototype.close = function(animate) {
        if (animate === true) {
            this.$el.slideUp("fast", _.bind(function() {
                this.remove();
            }, this));
        } else {
            this.remove();
        }
    };

    return VersionsView;
});
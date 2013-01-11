define([
    "underscore",
    "backbone",
    "swig"
], function(_, Backbone, swig) {

    var DetailsView = Backbone.View.extend({
        "tagName": "dl",
        "className": "details",
        "template": swig.compile(document.getElementById("tmpl-details").innerHTML),
        "render": function() {
            var ctx = this.model.toJSON();
            if (ctx.engines != null) {
                ctx.ringoVersion = ctx.engines.ringojs;
            }
            console.log(ctx);
            this.$el.html(this.template(ctx));
            return this;
        }
    });

    DetailsView.prototype.close = function(animate) {
        if (animate === true) {
            this.$el.slideUp("fast", _.bind(function() {
                this.remove();
            }, this));
        } else {
            this.remove();
        }
    };

    return DetailsView;

});
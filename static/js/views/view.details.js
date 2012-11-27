define([
    "underscore",
    "backbone",
    "hogan",
    "utils/dates"
], function(_, Backbone, hogan, dates) {

    // lambdas needed for rendering the template
    var lambdas = {
        "formatDate": function() {
            return function(str, render) {
                return dates.format(dates.parse(render(str)), "dd.MM.yyyy HH:mm");
            }
        }
    };

    var convert = function(obj) {
        return _.map(_.keys(obj), function(key) {
            return {
                "name": key,
                "version": obj[key]
            };
        });
    };

    var DetailsView = Backbone.View.extend({
        "tagName": "dl",
        "className": "details",
        "template": hogan.compile(document.getElementById("tmpl-details").innerHTML),
        "render": function() {
            var ctx = $.extend(true, {}, this.model.toJSON(), lambdas);
            ctx.dependencies = convert(ctx.dependencies);
            ctx.engines = convert(ctx.engines);
            if (ctx.engines != null) {
                ctx.ringoVersion = ctx.engines.ringojs;
            }
            this.$el.html(this.template.render(ctx));
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
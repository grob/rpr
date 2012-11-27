define([
    "backbone",
    "hogan",
    "utils/dates",
    "utils/numbers"
], function(Backbone, hogan, dates, numbers) {

    // lambdas needed for rendering the template
    var lambdas = {
        "formatDate": function() {
            return function(str, render) {
                return dates.format(dates.parse(render(str)), "dd.MM.yyyy HH:mm");
            }
        },
        "formatFileSize": function() {
            return function(bytes, render) {
                return numbers.formatFileSize(render(bytes));
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

    var VersionsView = Backbone.View.extend({
        "tagName": "dl",
        "className": "versions",
        "template": hogan.compile(document.getElementById("tmpl-versions").innerHTML),
        "events": {
            "click .checksums": "toggleChecksums"
        },
        "render": function() {
            var ctx = $.extend(true, {}, this.model.toJSON(), lambdas);
            _.each(ctx.versions, function(version) {
                version.dependencies = convert(version.dependencies);
                version.engines = convert(version.engines);
            });
            this.$el.html(this.template.render(ctx));
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
define(function(require, exports, module) {

    var PackageView = exports.PackageView = Backbone.View.extend({
        "tagName": "li",
        "template": "#tmpl-package",
        "initialize": function() {
            this.model.bind("change", this.render, this);
        }

    });

    PackageView.prototype.render = function() {
        $(this.el).empty().append($(this.template).tmpl(this.model.toJSON()));
        return this;
    };

});
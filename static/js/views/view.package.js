define(function(require, exports, module) {

    var PackageView = exports.PackageView = Backbone.View.extend({
        "tagName": "li",
        "template": "#tmpl-package",
        "events": {
            "click .menu li": "toggle"
        },
        "initialize": function() {
            this.model.bind("change", this.render, this);
        }

    });

    PackageView.prototype.render = function() {
        $(this.el).empty().append($(this.template).tmpl(this.model.toJSON()));
        return this;
    };

    PackageView.prototype.toggle = function(event) {
        var $item = $(event.target);
        $item.toggleClass("expanded").siblings().removeClass("expanded");
        var $lists = $item.parent().nextAll("dl").removeClass("expanded");
        if ($item.hasClass("expanded")) {
            $lists.filter($item.data("display")).addClass("expanded");
        }
    };

});
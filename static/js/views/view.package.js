define(function(require, exports, module) {

    var PackageView = exports.PackageView = Backbone.View.extend({
        "tagName": "li",
        "template": "#tmpl-package",
        "events": {
            "click .menu li": "toggle",
            "click": "toggleTabs"
        },
        "initialize": function() {
            this.model.bind("change", this.render, this);
        }

    });

    PackageView.prototype.render = function() {
        $(this.el).empty().append($(this.template).tmpl(this.model.toJSON()));
        return this;
    };

    PackageView.prototype.toggleTabs = function(event) {
        var $expanded = $(".menu li.expanded", this.el);
        if ($expanded.length == 0) {
            $(".menu li:first-child", this.el).trigger("click");
        } else if ($expanded.length > 0 && $expanded.next().length < 1) {
            $expanded.trigger("click");
        } else {
            $expanded.next().trigger("click");
        }
        return false;
    };

    PackageView.prototype.toggle = function(event) {
        var $item = $(event.target);
        $item.toggleClass("expanded").siblings().removeClass("expanded");
        $(this.el).toggleClass("selected", $item.hasClass("expanded"));
        var $lists = $item.parent().nextAll("dl").removeClass("expanded");
        if ($item.hasClass("expanded")) {
            $lists.filter($item.data("display")).addClass("expanded");
        }
        return false;
    };

});
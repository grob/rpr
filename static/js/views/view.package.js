define(function(require, exports, module) {

    var hogan = require("lib/hogan");

    var dates = require("lib/utils/dates");
    var numbers = require("lib/utils/numbers");

    // lambdas needed for rendering the template
    var lambdas = {
        "formatDate": function() {
            return function(str, render) {
                return dates.format(Date.parse(render(str)), "dd.MM.yyyy HH:mm");
            }
        },
        "formatFileSize": function() {
            return function(bytes, render) {
                return numbers.formatFileSize(render(bytes));
            }
        }
    };

    var PackageView = exports.PackageView = Backbone.View.extend({
        "tagName": "li",
        "events": {
            "click .menu li": "toggle",
            "click .checksums": "toggleChecksums",
            "click": "toggleTabs"
        },
        "initialize": function() {
            this.model.bind("change", this.render, this);
            this.template = hogan.compile(document.getElementById("tmpl-package").innerHTML);
        }

    });

    PackageView.prototype.render = function() {
        var ctx = _.extend(this.model.toJSON(), lambdas);
        $(this.el).append(this.template.render(ctx));
        return this;
    };

    PackageView.prototype.toggleTabs = function(event) {
        if ($(event.target).is("a")) {
            return true;
        }
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

    PackageView.prototype.toggleChecksums = function(event) {
        var $toggler = $(event.target).toggleClass("expanded");
        $toggler.next("dd.checksums").fadeToggle();
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
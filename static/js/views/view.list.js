define(function(require, exports, module) {

    var Packages = require("collections/collection.packages").Packages;

    var ListView = exports.ListView = Backbone.View.extend({
        "el": "#list",
        "collection": Packages,
        "initialize": function() {
        }
    });

});
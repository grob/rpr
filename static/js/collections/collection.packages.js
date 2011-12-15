define(function(require, exports, module) {

    var Package = require("models/model.package").Package;

    var Packages = exports.Packages = Backbone.Collection.extend({
        "url": "/search.json",
        "model": Package
    });

    Packages.prototype.parse = function(data) {
        return _.map(data, function(pkgData) {
            return Package.prototype.parse.call(null, pkgData);
        });
    };

});
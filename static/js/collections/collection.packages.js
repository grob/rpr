define(function(require, exports, module) {

    var Package = require("models/model.package").Package;

    var Packages = exports.Packages = Backbone.Collection.extend({
        "url": "/packages.json",
        "model": Package
    });

});
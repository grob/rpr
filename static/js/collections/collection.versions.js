define(function(require, exports, module) {

    var Version = require("models/model.version").Version;

    var Versions = exports.Versions = Backbone.Collection.extend({
        "model": Version
    });

});
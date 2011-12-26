define(function(require, exports, module) {

    var Versions = require("collections/collection.versions").Versions;

    var Package = exports.Package = Backbone.MappedModel.extend({
        "mapping": {
            "versions": Versions
        }
    });

    Package.prototype.parse = function(data) {
        data.modified = new Date(Date.parse(data.modified));
        return data;
    };

});
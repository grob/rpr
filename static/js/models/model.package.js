define(function(require, exports, module) {

    var Versions = require("collections/collection.versions").Versions;

    var Package = exports.Package = Backbone.MappedModel.extend({
        "mapping": {
            "versions": Versions
        }
    });

});
define(function(require, exports, module) {

    var Versions = require("collections/collection.versions").Versions;
    var Version = require("models/model.version").Version;

    var Package = exports.Package = Backbone.MappedModel.extend({
        "mapping": {
            "versions": Versions
        },
        "initialize": function() {
        }
    });

    Package.prototype.parse = function(data) {
        data.versions = _.map(_.values(data.versions), function(data) {
            return Version.prototype.parse.call(null, data);
        }).sort(Version.sorter);
        data.modified = new Date(Date.parse(data.modified));
        return data;
    };

});
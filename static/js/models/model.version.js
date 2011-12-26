define(function(require, exports, module) {

    var Version = exports.Version = Backbone.Model.extend({});

    Version.prototype.parse = function(data) {
        data.modified = new Date(Date.parse(data.modified));
        return data;
    };

    Version.sorter = function(v1, v2) {
        if (v1.version < v2.version) {
            return 1;
        } else if (v1.version > v2.version) {
            return -1;
        }
        return 0;
    };

});
define(function(require, exports, module) {

    var Version = exports.Version = Backbone.Model.extend({});

    Version.prototype.parse = function(data) {
        data.modified = new Date(Date.parse(data.modified));
        return data;
    };

});
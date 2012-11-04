define([
    "backbone",
    "collections/collection.versions"
], function(Backbone, Versions) {

    var Package = Backbone.Model.extend({});

    Package.prototype.parse = function(data) {
        this.versions = new Versions(data.versions);
        return data;
    };

    return Package;

});
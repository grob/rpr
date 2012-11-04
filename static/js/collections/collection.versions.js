define([
    "backbone",
    "models/model.version"
], function(Backbone, Version) {

    var Versions = Backbone.Collection.extend({
        "model": Version
    });

    return Versions;

});
define([
    "backbone"
], function(Backbone) {

    var app = window.app = _.extend({
        "views": {}
    }, Backbone.Events);

    return app;

});
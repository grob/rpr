define([
    "underscore",
    "backbone",
    "swig"
], function(_, Backbone, swig) {

    var UNITS = ["bytes", "kB", "MB", "GB", "TB"];

    swig.init({
        "filters": {
            "filesize": function(bytes) {
                if (bytes > 0) {
                    var e = Math.floor(Math.log(bytes) / Math.log(1024));
                    return [(bytes / Math.pow(1024, e)).toFixed(1), UNITS[e]].join(" ");
                }
                return [bytes, UNITS[0]].join(" ");
            }
        }
    });

    var app = window.app = _.extend({
        "views": {}
    }, Backbone.Events);

    return app;

});
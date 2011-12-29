define(function(require, exports, module) {

    var Package = require("models/model.package").Package;

    var Packages = exports.Packages = Backbone.Collection.extend({
        "url": "/search",
        "model": Package,
        "initialize": function() {
            this.total = 0;
            this.offset = 0;
        }
    });

    /**
     * Overwriting fetch to fire custom events "fetching" and "fetched"
     * @param options
     */
    Packages.prototype.fetch = function (options) {
        typeof(options) != 'undefined' || (options = {});
        this.trigger("fetching");
        options = options || {};
        var success = options.success;
        options.success = function(collection, response) {
            collection.trigger("fetched");
            if (success) {
                success(collection, response);
            }
        };
        return Backbone.Collection.prototype.fetch.call(this, options);
    };

    Packages.prototype.hasMore = function() {
        return this.total > this.length;
    };

    Packages.prototype.reset = function(models, options) {
        this.total = models.length;
        this.offset = 0;
        return Backbone.Collection.prototype.reset.apply(this, arguments);
    };

    Packages.prototype.parse = function(response) {
        this.total = response.total;
        this.offset = response.offset;
        this.perPage = response.length;
        return _.map(response.hits, function(pkgData) {
            return Package.prototype.parse.call(null, pkgData);
        });
    };

});
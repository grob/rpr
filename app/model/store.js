var {Store, ConnectionPool, Cache} = require("ringo-sqlstore");
var config = require('../config/config');

/**
 * The store this application uses
 * @type {Store}
 */
var connectionPool = module.singleton("connectionpool", function() {
    return new ConnectionPool({
        "url": config.db.url,
        "driver": config.db.driver,
        "username": config.db.username,
        "password": config.db.password
    });
});

var entityCache = module.singleton("entityCache", function() {
    return new Cache(config.db.cacheSize);
});

var queryCache = module.singleton("queryCache", function() {
    return new Cache(config.db.cacheSize);
});

/**
 * The store this application uses
 * @type {Store}
 */
var store = exports.store = new Store(connectionPool);
store.setEntityCache(entityCache);
store.setQueryCache(queryCache);

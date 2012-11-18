var {Store} = require("ringo-sqlstore");
var {ConnectionPool} = require("ringo-sqlstore/lib/sqlstore/connectionpool");
var {Cache} = require("ringo-sqlstore/lib/sqlstore/cache");
var config = require('../config/config');

var store = exports.store = new Store(module.singleton("connectionpool", function() {
    return new ConnectionPool({
        "url": config.db.url,
        "driver": config.db.driver,
        "username": config.db.username,
        "password": config.db.password
    });
}));

store.setEntityCache(module.singleton("entityCache", function() {
    return new Cache(config.db.cacheSize);
}));

store.setQueryCache(module.singleton("queryCache", function() {
    return new Cache(config.db.cacheSize);
}));

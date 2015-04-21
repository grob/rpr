var {Store, ConnectionPool, Cache} = require("ringo-sqlstore");
var config = require('../config/config');
var log = require("ringo/logging").getLogger(module.id);

var isInUnitTestMode = function() {
    var mode = environment["rpr.mode"];
    return mode != null && mode.toString() === "unittest";
};

/**
 * The store this application uses
 * @type {Store}
 */
var connectionPool = module.singleton("connectionpool", function() {
    var url = config.db.url;
    var driver = config.db.driver;
    var username = config.db.username;
    var password = config.db.password;
    if (isInUnitTestMode()) {
        url = "jdbc:h2:mem:test;MVCC=TRUE";
        driver = "org.h2.Driver";
    }
    log.info("Instantiating connection pool:", username + "@" + url);
    return new ConnectionPool({
        "url": url,
        "driver": driver,
        "user": username,
        "password": password
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
store.registerEntityModule(module.resolve("./all"));

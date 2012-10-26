var {Store} = require("ringo-sqlstore");

exports.store = module.singleton("store", function() {
    var config = require('../config/config');
    return new Store({
        "url": config.db.url,
        "driver": config.db.driver,
        "username": config.db.username,
        "password": config.db.password
    }, {
        "maxConnections": config.db.maxConnections || 100,
        "cacheSize": config.db.cacheSize || 1000
    });
});


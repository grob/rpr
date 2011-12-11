exports.dbProps = {
    "url": "jdbc:mysql://localhost/rpr",
    "driver": "com.mysql.jdbc.Driver",
    "username": "rpr",
    "password": "rpr"
};

exports.storeOptions = {
    "maxConnections": 100,
    "cacheSize": 1000
};

// temporary directory
exports.tmpDir = module.resolve("../rpr.static/tmp/");

// directory containing static resources
exports.staticDir = module.resolve("../rpr/static/");

// directory containing published package tarballs
exports.packageDir = module.resolve("../rpr.static/packages/");

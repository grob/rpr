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

// directory containing the lucene index
exports.indexDir = module.resolve("../rpr.static/");

// the address of the smtp server
exports.smtp = {
    "host": "grace.nomatic.org",
    "port": 25,
    "encrypt": false
};

// the email address used to send password reset mails
exports.email = "RingoJS Package Registry <rpr@nomatic.org>";

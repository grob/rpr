/**
 * @fileoverview The configuration module. This exports the application
 * configuration as a singleton. It accepts the following command line arguments:
 *
 * - `-h` (or `--homedir`) with the path to a custom configuration directory
 *
 * @see main
 */
var fs = require("fs");
var system = require("system");

module.exports = module.singleton("config", function() {
    var {Parser} = require("ringo/args");
    var parser = new Parser();
    parser.addOption("h", "homedir", "homedir", "Path to home directory");
    var opts = parser.parse(system.args.slice(1));

    var homeDir = fs.resolve(opts.homedir || module.directory);
    var configFile = fs.resolve(homeDir, "./config.json");
    if (!fs.exists(configFile)) {
        configFile = module.resolve("./config.json");
    }
    var config = {};
    try {
        config = JSON.parse(fs.read(configFile));
    } catch (e) {
        throw new Error("Invalid configuration file '" + configFile + "': " + e);
    }
    var logConfig = fs.resolve(homeDir, "./log4j.properties");
    if (!fs.exists(logConfig)) {
        logConfig = module.resolve("./log4j.properties");
    }

    return {
        /**
         * The home directory of this application, containing the files
         * `config.json`, `log4j.properties` and `users.json`.
         * @name homeDir
         * @type {String}
         */
        "homedir": homeDir,

        /**
         * The log4j properties used by this application
         * @name logging
         * @type {Resource}
         */
        "logging": getResource(fs.absolute(logConfig)),

        /**
         * An array containing the template paths used by this application
         * @name templates
         * @type {Array}
         */
        "templates": [
            module.resolve("../templates"),
            fs.resolve(homeDir, "./templates/")
        ],

        /**
         * The port to use for the HTTP server
         * @name port
         * @type {Number}
         */
        "port": config.httpPort,

        /**
         * An object containing the database configuration properties
         * @name db
         * @type {Object}
         */
        "db": config.db,

        /**
         * The email address used as sender
         * @name email
         * @type String
         */
        "email": config.email,

        /**
         * The SMTP configuration properties
         * @name smtp
         * @type Object
         */
        "smtp": config.smtp,

        /**
         * The temporary directory (relative to the `config.json` file
         * specifying it)
         * @name tmpDir
         * @type String
         */
        "tmpDir": fs.resolve(homeDir, config.tmpDir),

        /**
         * The directory containing the published packages (relative to the
         * `config.json` file specifying it)
         * @name packageDir
         * @type String
         */
        "downloadDir": fs.resolve(homeDir, config.downloadDir),

        /**
         * The directory containing the search index (relative to the
         * `config.json` file specifying it)
         * @name indexDir
         * @type String
         */
        "indexDir": fs.resolve(homeDir, config.indexDir)
    }
});

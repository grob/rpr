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
var {Parser} = require("ringo/args");
var config = require("gestalt").load(module.resolve("./config.json"));

var parser = new Parser();
parser.addOption("h", "homedir", "homedir", "Path to home directory");
var opts = parser.parse(system.args.slice(1));

var homeDir = fs.resolve(opts.homedir || module.directory);
if (opts.homedir) {
    homeDir = fs.resolve(opts.homedir);
    var customConfigFile = fs.resolve(homeDir, "./config.json");
    if (fs.exists(customConfigFile)) {
        config.merge(customConfigFile);
    }
}

var logConfig = fs.resolve(homeDir, "./log4j.properties");
if (!fs.exists(logConfig)) {
    logConfig = module.resolve("./log4j.properties");
}

/**
 * The home directory of this application, containing the files
 * `config.json` and `log4j.properties`.
 * @name homeDir
 * @type {String}
 */
exports.homedir = homeDir;

/**
 * The log4j properties used by this application
 * @name logging
 * @type {Resource}
 */
exports.logging = getResource(fs.absolute(logConfig));

/**
 * An array containing the template paths used by this application
 * @name templates
 * @type {Array}
 */
exports.templates = [
    module.resolve("../templates"),
    fs.resolve(homeDir, "./templates/")
];

/**
 * The port to use for the HTTP server
 * @name port
 * @type {Number}
 */
exports.port = config.get("httpPort");

/**
 * An object containing the database configuration properties
 * @name db
 * @type {Object}
 */
exports.db = config.get("db");

/**
 * The email address used as sender
 * @name email
 * @type String
 */
exports.email = config.get("email");

/**
 * The SMTP configuration properties
 * @name smtp
 * @type Object
 */
exports.smtp = config.get("smtp");

/**
 * The temporary directory (relative to the `config.json` file
 * specifying it)
 * @name tmpDir
 * @type String
 */
exports.tmpDir = fs.resolve(homeDir, config.get("tmpDir"));

/**
 * The directory containing the published packages (relative to the
 * `config.json` file specifying it)
 * @name packageDir
 * @type String
 */
exports.downloadDir = fs.resolve(homeDir, config.get("downloadDir"));

/**
 * The directory containing the search index (relative to the
 * `config.json` file specifying it)
 * @name indexDir
 * @type String
 */
exports.indexDir = fs.resolve(homeDir, config.get("indexDir"));

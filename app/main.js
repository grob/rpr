var engine = require("ringo/engine");
var config = require("./config/config");
var logging = require("ringo/logging");
if (config.logging.exists()) {
    logging.setConfig(config.logging);
}
var log = logging.getLogger(module.id);
var {Server} = require("ringo/httpserver");
var {store} = require("./model/store");

var httpServer = new Server({
    "appName": "app",
    "appModule": module.resolve("./actions"),
    "port": config.port
});

/**
 * Called when the application starts
 */
var start = function() {
    log.info("Starting application");
    httpServer.start();
    // register shutdown hook to stop ftp server
    engine.addShutdownHook(function() {
        stop();
    });
};

/**
 * Called when the engine is shut down
 */
var stop = function() {
    httpServer.stop();
    httpServer.destroy();
    store.connectionPool.stopScheduler();
    store.connectionPool.closeConnections();
    log.info("Stopped application");
};

//Script run from command line
if (require.main === module) {
    start();
}

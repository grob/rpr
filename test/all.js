var system = require("system");

exports.testModel = require("./model/all");
exports.testRegistry = require("./registry_test");

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}
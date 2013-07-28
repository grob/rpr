var system = require("system");

exports.testAuthor = require("./author_test");
exports.testLogEntry = require("./logentry_test");
exports.testPackage = require("./package_test");
exports.testRelPackageAuthor = require("./relpackageauthor_test");
exports.testRelPackageOwner = require("./relpackageowner_test");
exports.testResetToken = require("./resettoken_test");
exports.testUser = require("./user_test");
exports.testVersion = require("./version_test");

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}
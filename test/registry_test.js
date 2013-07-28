// IMPORTANT: this *must* be on top of every unit test module!
var common = require("./common");

var assert = require("assert");
var system = require("system");
var strings = require("ringo/utils/strings");
var registry = require("../app/registry");
var config = require("../app/config/config");
var fs = require("fs");
var utils = require("../app/utils/utils");
var {User} = require("../app/model/all");
var {RegistryError, AuthenticationError} = require("../app/errors");

var tmpDir = fs.join(environment["java.io.tmpdir"], "rpr-test");

exports.setUp = function() {
    common.setUp();
};

exports.tearDown = function() {
    common.tearDown();
    fs.exists(tmpDir) && fs.removeTree(tmpDir);
};

exports.testAuthenticate = function() {
    var username = "johndoe";
    var password = "secret";
    var user = User.create(username, strings.b64encode(password));
    user.save();
    assert.throws(function() {
        registry.authenticate("nonexisting");
    }, AuthenticationError);
    assert.throws(function() {
        registry.authenticate(username, strings.b64encode("wrong"));
    }, AuthenticationError);
    // returns the user if authentication was successful
    assert.isTrue(registry.authenticate(username, strings.b64encode(password)).equals(user));
};

exports.testStoreTemporaryFile = function() {
    fs.makeDirectory(tmpDir);
    // change tmpDir to the one defined in this test
    config.tmpDir = tmpDir;
    var zip = module.resolve("./testpackage.zip");
    var filename = fs.base(zip);
    var bytes = fs.read(zip, {"binary": true});
    var [path, size, checksums] = registry.storeTemporaryFile(bytes, filename);
    assert.isTrue(fs.exists(path));
    assert.strictEqual(size, fs.size(zip));
    for each (let [algorithm, propname] in [["MD5", "md5"], ["SHA-1", "sha1"], ["SHA-256", "sha256"]]) {
        let digest = java.security.MessageDigest.getInstance(algorithm);
        digest.update(bytes, 0, bytes.length);
        let checksum = utils.bytesToHex(digest.digest());
        assert.strictEqual(checksums[propname], checksum, "Checksum " + algorithm);
    }
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}

// IMPORTANT: this *must* be on top of every unit test module!
var common = require("../common");

var assert = require("assert");
var system = require("system");
var objects = require("ringo/utils/objects");
var {Package, Version, User, Author} = require("../../app/model/all");

var packagename = "test";
var descriptor = {
    "name": packagename,
    "description": "a test package",
    "keywords": ["testing"],
    "version": "0.1alpha1",
    "engines":{
        "ringojs":"0.9"
    },
    "homepage": "http://example.org",
    "repositories": [{
        "type": "git",
        "url": "http://example.org"
    }],
    "licenses": [{
        "type": "Apache License Version 2.0",
        "url": "http://www.apache.org/licenses/LICENSE-2.0.txt"
    }]
};
var descriptor2 = objects.clone(descriptor);
descriptor2.version = "0.1beta2";

var filename = packagename + ".zip";
var filesize = 100;
var checksums = {
    "md5": "md5",
    "sha1": "sha1",
    "sha256": "sha256"
};
var user = null;
var author = null;
var pkg = null;

exports.setUp = function() {
    common.setUp();
    user = User.create("test", "test", "test", "test@example.org");
    user.save();
    author = Author.create("johndoe", "john.doe@example.org", "http://example.org");
    author.save();
    pkg = Package.create(packagename, author, user);
    pkg.save();
};

exports.tearDown = function() {
    common.tearDown();
};

exports.testCreate = function() {
    var version = Version.create(pkg, descriptor, filename, filesize, checksums, user);
    // .create() doesn't persist
    assert.strictEqual(Version.all().length, 0);
    assert.isTrue(version.package.equals(pkg));
    assert.strictEqual(version.version, descriptor.version);
    assert.deepEqual(JSON.parse(version.descriptor), descriptor);
    assert.strictEqual(version.filename, filename);
    assert.strictEqual(version.filesize, filesize);
    assert.strictEqual(version.md5, checksums.md5);
    assert.strictEqual(version.sha1, checksums.sha1);
    assert.strictEqual(version.sha256, checksums.sha256);
    assert.isTrue(version.creator.equals(user));
    assert.isTrue(version.modifier.equals(user));
    assert.isTrue(version.createtime instanceof Date);
    assert.isTrue(version.modifytime instanceof Date);
};

exports.testRemove = function() {
    var version1 = Version.create(pkg, descriptor, filename, filesize, checksums, user);
    var version2 = Version.create(pkg, descriptor2, filename, filesize, checksums, user);
    version1.save();
    version2.save();
    pkg.latestVersion = version2;
    pkg.save();
    assert.strictEqual(pkg.versions.length, 2);
    // remove latest version - this assigns version1 as latest one
    Version.remove(pkg, version2);
    assert.strictEqual(pkg.versions.length, 1);
    assert.isTrue(pkg.latestVersion.equals(version1));
    // now remove remaining version
    Version.remove(pkg, version1);
    assert.strictEqual(pkg.versions.length, 0);
    assert.isNull(pkg.latestVersion);
};

exports.testGetByVersion = function() {
    var version1 = Version.create(pkg, descriptor, filename, filesize, checksums, user);
    var version2 = Version.create(pkg, descriptor2, filename, filesize, checksums, user);
    version1.save();
    version2.save();
    var result = Version.getByVersion(descriptor.version, pkg);
    assert.isTrue(result.equals(version1));
    result = Version.getByVersion(descriptor2.version, pkg);
    assert.isTrue(result.equals(version2));
    assert.isNull(Version.getByVersion("1.0", pkg));
};

exports.testGetByPackage = function() {
    var version = Version.create(pkg, descriptor, filename, filesize, checksums, user);
    version.save();
    var versions = Version.getByPackage(pkg);
    assert.strictEqual(versions.length, 1);
    assert.isTrue(versions[0].equals(version));
};

exports.testTouch = function() {
    var version = Version.create(pkg, descriptor, filename, filesize, checksums, user);
    version.save();
    var modifytime = version.modifytime;
    java.lang.Thread.sleep(100);
    version.touch();
    version.save();
    assert.notStrictEqual(Version.get(version._id).modifytime.getTime(),
            modifytime.getTime());
};

exports.testEquals = function() {
    var version1 = Version.create(pkg, descriptor, filename, filesize, checksums, user);
    var version2 = Version.create(pkg, descriptor2, filename, filesize, checksums, user);
    version1.save();
    version2.save();
    assert.isTrue(version1.equals(Version.get(version1._id)));
    assert.isFalse(version1.equals(Version.get(version2._id)));
};

exports.testSerialize = function() {
    var version1 = Version.create(pkg, descriptor, filename, filesize, checksums, user);
    var version2 = Version.create(pkg, descriptor2, filename, filesize, checksums, user);
    version1.save();
    version2.save();
    pkg.latestVersion = version2;
    pkg.save();
    var serialized = version1.serialize();
    var keys = [
        ["name", packagename],
        ["version", descriptor.version],
        ["description", descriptor.description],
        ["keywords", descriptor.keywords],
        ["latest", descriptor2.version],
        ["filename", filename],
        ["filesize", filesize],
        ["modified", version1.modifytime.toISOString()],
        ["homepage", descriptor.homepage],
        ["implements", undefined],
        ["author", author.serialize()],
        ["repositories", descriptor.repositories],
        ["licenses", descriptor.licenses],
        ["maintainers", []],
        ["contributors", []],
        ["dependencies", {}],
        ["engines", descriptor.engines],
        ["checksums", checksums]
    ];
    assert.strictEqual(Object.keys(serialized).length, keys.length);
    for each (let key in keys) {
        let value = null;
        if (Array.isArray(key)) {
            [key, value] = key;
        }
        assert.isTrue(serialized.hasOwnProperty(key));
        if (value != null && (Array.isArray(value) || value.constructor === Object)) {
            assert.deepEqual(serialized[key], value, key);
        }
    }
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}

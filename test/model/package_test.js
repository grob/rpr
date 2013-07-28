// IMPORTANT: this *must* be on top of every unit test module!
var common = require("../common");

var assert = require("assert");
var system = require("system");
var objects = require("ringo/utils/objects");
var {Package, Author, User, Version, RelPackageOwner, RelPackageAuthor} = require("../../app/model/all");

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
var filename = packagename + ".zip";
var filesize = 100;
var checksums = {
    "md5": "md5",
    "sha1": "sha1",
    "sha256": "sha256"
};
var user = null;
var author = null;

exports.setUp = function() {
    common.setUp();
    user = User.create("test", "test", "test", "test@example.org");
    user.save();
    author = Author.create("johndoe", "john.doe@example.org", "http://example.org");
    author.save();
};

exports.tearDown = function() {
    common.tearDown();
};

exports.testCreate = function() {
    var pkg = Package.create(packagename, author, user);
    // .create() doesn't persist
    assert.strictEqual(Package.all().length, 0);
    assert.strictEqual(pkg.name, packagename);
    assert.isTrue(pkg.author.equals(author));
    assert.isTrue(pkg.creator.equals(user));
};

exports.testRemove = function() {
    var pkg = Package.create(packagename, author, user);
    var version = Version.create(pkg, descriptor, filename, filesize, checksums, user);
    // add initial owner to package
    RelPackageOwner.create(pkg, user, user).save();
    pkg.latestVersion = version;
    // add contributors/maintainers
    RelPackageAuthor.create(pkg, author, RelPackageAuthor.ROLE_CONTRIBUTOR).save();
    RelPackageAuthor.create(pkg, author, RelPackageAuthor.ROLE_MAINTAINER).save();
    version.save();
    pkg.save();
    assert.strictEqual(Package.all().length, 1);
    assert.strictEqual(Version.all().length, 1);
    assert.strictEqual(RelPackageOwner.all().length, 1);
    assert.strictEqual(RelPackageAuthor.all().length, 2);
    // now remove the package
    Package.remove(pkg);
    assert.strictEqual(Package.all().length, 0);
    assert.strictEqual(Version.all().length, 0);
    assert.strictEqual(RelPackageOwner.all().length, 0);
    assert.strictEqual(RelPackageAuthor.all().length, 0);
    // authors/users are not affected
    assert.strictEqual(Author.all().length, 1);
    assert.strictEqual(User.all().length, 1);
};

exports.testGetByName = function() {
    Package.create(packagename, author, user).save();
    var pkg = Package.getByName(packagename);
    assert.isNotNull(pkg);
    assert.strictEqual(pkg.name, packagename);
};

exports.testGetUpdatedSince = function() {
    Package.create(packagename, author, user).save();
    var date = new Date();
    date.setHours(date.getHours() + 1);
    var pkgs = Package.getUpdatedSince(date);
    assert.isTrue(Array.isArray(pkgs));
    assert.strictEqual(pkgs.length, 0);
    date.setHours(date.getHours() - 2);
    pkgs = Package.getUpdatedSince(date);
    assert.strictEqual(pkgs.length, 1);
    assert.strictEqual(pkgs[0].name, packagename);
};

exports.testSerialize = function() {
    var pkg = Package.create(packagename, author, user);
    var version = Version.create(pkg, descriptor, filename, filesize, checksums, user);
    version.save();
    // add initial owner to package
    RelPackageOwner.create(pkg, user, user).save();
    pkg.latestVersion = version;
    pkg.save();
    var serialized = pkg.serialize();
    var keys = [
        ["name", packagename],
        ["version", descriptor.version],
        ["description", descriptor.description],
        ["keywords", descriptor.keywords],
        ["latest", descriptor.version],
        ["filename", filename],
        ["filesize", filesize],
        ["modified", version.modifytime.toISOString()],
        ["homepage", descriptor.homepage],
        ["implements", undefined],
        ["author", author.serialize()],
        ["repositories", descriptor.repositories],
        ["licenses", descriptor.licenses],
        ["maintainers", []],
        ["contributors", []],
        ["dependencies", {}],
        ["engines", descriptor.engines],
        ["checksums", checksums],
        "versions",
        ["owners", [{
            "name": user.name,
            "email": user.email
        }]]
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
        assert.strictEqual(serialized.versions.length, 1);
    }
};

exports.testGetVersion = function() {
    var pkg = Package.create(packagename, author, user);
    var version = Version.create(pkg, descriptor, filename, filesize, checksums, user);
    pkg.latestVersion = version;
    version.save();
    pkg.save();
    var result = pkg.getVersion(version.version);
    assert.strictEqual(result.version, version.version);
    assert.isTrue(result.package.equals(pkg));
    assert.isNull(pkg.getVersion("0.1"));
};

exports.testIsOwner = function() {
    var pkg = Package.create(packagename, author, user);
    RelPackageOwner.create(pkg, user, user).save();
    pkg.save();
    assert.isTrue(pkg.isOwner(user));
    var other = User.create("test2", "test2", "test2", "test2@example.org");
    other.save();
    assert.isFalse(pkg.isOwner(other));
};

exports.testIsLatestVersion = function() {
    var pkg = Package.create(packagename, author, user);
    var version1 = Version.create(pkg, descriptor, filename, filesize, checksums, user);
    var descriptor2 = objects.clone(descriptor);
    var version2 = Version.create(pkg, descriptor2, filename, filesize, checksums, user);
    pkg.latestVersion = version1;
    version1.save();
    version2.save();
    pkg.save();
    assert.isTrue(pkg.isLatestVersion(version1));
    assert.isFalse(pkg.isLatestVersion(version2));
};

exports.testEquals = function() {
    var pkg = Package.create(packagename, author, user);
    var pkg2 = Package.create("other", author, user);
    pkg.save();
    pkg2.save();
    assert.isTrue(pkg.equals(Package.getByName(packagename)));
    assert.isFalse(pkg.equals(Package.getByName("other")));
};

exports.testTouch = function() {
    var pkg = Package.create(packagename, author, user);
    pkg.save();
    var modifytime = pkg.modifytime;
    java.lang.Thread.sleep(100);
    pkg.touch();
    pkg.save();
    assert.notStrictEqual(Package.getByName(packagename).modifytime.getTime(),
            modifytime.getTime());
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}

// IMPORTANT: this *must* be on top of every unit test module!
var common = require("./common");

var assert = require("assert");
var system = require("system");
var strings = require("ringo/utils/strings");
var config = require("../app/config/config");
var registry = require("../app/registry");
var fs = require("fs");
var utils = require("../app/utils/utils");
var objects = require("ringo/utils/objects");
var {Package, Version, Author, User, RelPackageAuthor, RelPackageOwner, LogEntry} = require("../app/model/all");
var {RegistryError, AuthenticationError} = require("../app/errors");

var tmpDir = fs.join(environment["java.io.tmpdir"], "rpr-test");
var downloadDir = fs.join(tmpDir, "download");
var indexDir = fs.join(tmpDir, "index");

var packagename = "test";
var descriptorVersion1 = {
    "name": packagename,
    "description": "a test package",
    "keywords": ["testing"],
    "version": "1.0",
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
    }],
    "contributors": [{
            "name": "contributor1"
        }],
    "maintainers": [{
            "name": "maintainer1"
        }]
};
var descriptorVersion2 = objects.clone(descriptorVersion1, {}, true);
descriptorVersion2.version = "2.0";
descriptorVersion2.maintainers[0] = {
    "name": "maintainer2"
};

var filename = packagename + ".zip";
var filesize = 100;
var checksums = {
    "md5": "md5",
    "sha1": "sha1",
    "sha256": "sha256"
};

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
    assert.deepEqual(checksums, getChecksums(bytes));
};

exports.testPublishFile = function() {
    fs.makeDirectory(tmpDir);
    fs.makeDirectory(downloadDir);
    var zip = module.resolve("./testpackage.zip");
    var filename = fs.base(zip);
    // copy zip file to tmpDir, since publishFile removes it
    var srcZip = fs.join(tmpDir, filename);
    fs.copy(zip, srcZip);
    config.downloadDir = "path/to/nonexisting/download/dir";
    assert.throws(function() {
        registry.publishFile(srcZip, filename);
    });
    config.downloadDir = downloadDir;
    var destZip = registry.publishFile(srcZip, filename);
    assert.isTrue(fs.exists(destZip));
    assert.strictEqual(fs.size(zip), fs.size(destZip));
    assert.isFalse(fs.exists(srcZip));
};

exports.testCreateFileName = function() {
    var zip = module.resolve("./testpackage.zip");
    var extension = fs.extension(zip);
    var version = "0.1alpha1";
    var filename = registry.createFileName(zip, packagename, version);
    assert.strictEqual(filename, [packagename, "-", version, extension].join(""));
};

exports.testStoreAuthor = function() {
    var author1Props = {
        "name": "johndoe",
        "email": "john.doe@example.org",
        "web": "http://example.org"
    };
    var author1 = registry.storeAuthor(author1Props);
    assert.isTrue(author1 instanceof Author);
    for each (let [key, value] in Iterator(author1Props)) {
        assert.strictEqual(author1[key], value);
    }
    // do the same again
    assert.isTrue(registry.storeAuthor(author1Props).equals(author1));
    // name and email are the author key
    var author2Props = {
        "name": "johndoe",
        "email": "doejohn@example.org"
    };
    var author2 = registry.storeAuthor(author2Props);
    assert.isFalse(author1.equals(author2));
    assert.strictEqual(Author.all().length, 2);
    // rpr treats this one as separate author too
    var author3Props = {
        "name": "johndoe"
    };
    var author3 = registry.storeAuthor(author3Props);
    assert.isFalse(author1.equals(author3));
    assert.isFalse(author2.equals(author3));
    assert.strictEqual(Author.all().length, 3);
    // "web" property can be updated, but not removed
    author2Props.web = "http://example.org";
    author2 = registry.storeAuthor(author2Props);
    assert.strictEqual(author2.web, author2Props.web);
    author2Props.web = null;
    author2 = registry.storeAuthor(author2Props);
    assert.isNotNull(author2.web);
    author2Props.web = undefined;
    author2 = registry.storeAuthor(author2Props);
    assert.isNotUndefined(author2.web);
    delete author2Props.web;
    author2 = registry.storeAuthor(author2Props);
    assert.isNotNull(author2.web);
};

exports.testStoreAuthorRelations = function() {
    var user = User.create("johndoe", "secret", "salt", "john.doe@example.org");
    user.save();
    var author = Author.create("johndoe");
    author.save();
    var author2 = Author.create("janedoe");
    author2.save();
    var pkg = Package.create(packagename, author, user);
    pkg.save();
    // add maintainer
    var types = [
        ["maintainers", RelPackageAuthor.ROLE_MAINTAINER],
        ["contributors", RelPackageAuthor.ROLE_CONTRIBUTOR]
    ];
    for each (let [name, role] in types) {
        let collection = pkg[name];
        registry.storeAuthorRelations(pkg, collection, [author], role);
        assert.strictEqual(collection.length, 1, name);
        // adding again doesn't have an effect
        registry.storeAuthorRelations(pkg, collection, [author], role);
        assert.strictEqual(collection.length, 1, name);
        registry.storeAuthorRelations(pkg, collection, [author, author2], role);
        assert.strictEqual(collection.length, 2, name);
        registry.storeAuthorRelations(pkg, collection, [author2], role);
        assert.strictEqual(collection.length, 1, name);
        registry.storeAuthorRelations(pkg, collection, [], role);
        assert.strictEqual(collection.length, 0, name);
    }
};

exports.testAddOwner = function() {
    var user1 = User.create("johndoe", "secret", "salt");
    var user2 = User.create("janedoe", "secret", "salt");
    var pkg = registry.createPackage(packagename, null, user1);
    user1.save();
    user2.save();
    // user1 is already owner
    assert.throws(function() {
        registry.addOwner(pkg, user1, user1);
    });
    // user2 isn't an owner of pkg
    assert.throws(function() {
        registry.addOwner(pkg, user2, user2);
    });
    registry.addOwner(pkg, user2, user1);
    assert.strictEqual(pkg.owners.length, 2);
};

exports.testRemoveOwner = function() {
    var user1 = User.create("johndoe", "secret", "salt");
    var user2 = User.create("janedoe", "secret", "salt");
    var pkg = registry.createPackage(packagename, null, user1);
    user1.save();
    user2.save();
    // user1 is last owner
    assert.throws(function() {
        registry.removeOwner(pkg, user1, user1);
    });
    // user2 isn't an owner of pkg
    assert.throws(function() {
        registry.removeOwner(pkg, user2, user2);
    });
    registry.addOwner(pkg, user2, user1);
    assert.strictEqual(pkg.owners.length, 2);
    registry.removeOwner(pkg, user1, user2);
    assert.strictEqual(pkg.owners.length, 1);
};

exports.testPublishPackage = function() {
    config.tmpDir = tmpDir;
    config.downloadDir = downloadDir;
    // FIXME: indexing the package shouldn't be part of publishPackage
    config.indexDir = indexDir;
    var owner = User.create("johndoe", "secret", "salt", "john.doe@example.org");
    owner.save();
    var pkg, version1, version2;
    [pkg, version1] = registry.publishPackage(descriptorVersion1,
            filename, filesize, checksums, owner);
    assert.isNotNull(pkg);
    assert.strictEqual(pkg.versions.length, 1);
    assert.isTrue(pkg.owners.get(0).equals(owner));
    assert.strictEqual(pkg.contributors.length, 1);
    assert.strictEqual(pkg.maintainers.length, 1);
    assert.strictEqual(Author.all().length, 2);
    // descriptor doesn't have an author set, so the first contributor
    // is assigned as author
    assert.isTrue(pkg.author.equals(pkg.contributors.get(0)));
    assert.isTrue(pkg.latestVersion.equals(version1));
    // log entry
    assert.strictEqual(LogEntry.all().length, 1);
    var entry = LogEntry.all()[0];
    assert.strictEqual(entry.type, LogEntry.TYPE_ADD);
    assert.strictEqual(entry.packagename, pkg.name);
    // re-publish without force throws exception
    assert.throws(function() {
        registry.publishPackage(descriptorVersion1, filename, filesize, checksums, owner);
    });
    [pkg, version2] = registry.publishPackage(descriptorVersion1, filename, filesize, checksums, owner, true);
    assert.isTrue(version1.equals(version2));
    // publishing by a non-owner too
    var nonOwner = User.create("janedoe", "secret", "salt", "jane.doe@example.org");
    nonOwner.save();
    assert.throws(function() {
        registry.publishPackage(descriptorVersion1, filename, filesize, checksums, owner);
    });

    // publish version2
    [pkg, version2] = registry.publishPackage(descriptorVersion2,
                filename, filesize, checksums, owner);
    assert.strictEqual(Package.all().length, 1);
    assert.strictEqual(pkg.versions.length, 2);
    assert.isTrue(pkg.latestVersion.equals(version2));
    // in version2 the original maintainer was replaced
    assert.strictEqual(pkg.maintainers.length, 1);
    // the old maintainer is still in database as author
    assert.strictEqual(Author.all().length, 3);
    assert.strictEqual(pkg.maintainers.get(0).name, descriptorVersion2.maintainers[0].name);
    assert.strictEqual(pkg.contributors.length, 1);
    assert.isTrue(pkg.author.equals(pkg.contributors.get(0)));
};

exports.testUnpublishPackage = function() {
    config.tmpDir = tmpDir;
    config.downloadDir = downloadDir;
    // FIXME: indexing the package shouldn't be part of publishPackage
    config.indexDir = indexDir;
    var owner = User.create("johndoe", "secret", "salt", "john.doe@example.org");
    owner.save();
    var pkg, version1, version2;
    [pkg, version1] = registry.publishPackage(descriptorVersion1,
            filename, filesize, checksums, owner);
    [pkg, version2] = registry.publishPackage(descriptorVersion2,
            filename, filesize, checksums, owner);
    assert.isNotNull(pkg);
    assert.isNotNull(version1);
    assert.isNotNull(version2);
    // unpublishing by a non-owner throws exception
    var nonOwner = User.create("janedoe", "secret", "salt", "jane.doe@example.org");
    nonOwner.save();
    assert.throws(function() {
        registry.unpublish(pkg, null, nonOwner);
    });
    registry.unpublish(pkg, null, owner);
    assert.strictEqual(Package.all().length, 0);
    assert.strictEqual(Version.all().length, 0);
    assert.strictEqual(RelPackageOwner.all().length, 0);
    assert.strictEqual(RelPackageAuthor.all().length, 0);
};

exports.testUnpublishVersion = function() {
    config.tmpDir = tmpDir;
    config.downloadDir = downloadDir;
    // FIXME: indexing the package shouldn't be part of publishPackage
    config.indexDir = indexDir;
    var owner = User.create("johndoe", "secret", "salt", "john.doe@example.org");
    owner.save();
    var pkg, version1, version2;
    [pkg, version1] = registry.publishPackage(descriptorVersion1,
            filename, filesize, checksums, owner);
    [pkg, version2] = registry.publishPackage(descriptorVersion2,
            filename, filesize, checksums, owner);
    assert.isNotNull(pkg);
    assert.isNotNull(version1);
    assert.isNotNull(version2);
    // trying to unpublish an invalid version number throws
    assert.throws(function() {
        registry.unpublish(pkg, "invalid version number", owner);
    });
    // unpublish latest version
    registry.unpublish(pkg, pkg.latestVersion.version, owner);
    assert.strictEqual(Version.all().length, 1);
    assert.strictEqual(pkg.versions.length, 1);
    assert.isTrue(pkg.versions.get(0).equals(version1));
    assert.isTrue(pkg.latestVersion.equals(version1));
};

exports.testCreatePackage = function() {
    var owner = User.create("johndoe", "secret", "salt", "john.doe@example.org");
    var author = Author.create("johndoe");
    owner.save();
    author.save();
    var pkg = registry.createPackage(packagename, author, owner);
    assert.strictEqual(Package.all().length, 1);
    assert.strictEqual(RelPackageOwner.all().length, 1);
    assert.strictEqual(pkg.owners.length, 1);
    assert.isTrue(pkg.owners.get(0).equals(owner));
    assert.isTrue(pkg.creator.equals(owner));
    assert.isTrue(pkg.modifier.equals(owner));
};

var getChecksums = function(bytes) {
    var checksums = {};
    var algorithms = [["MD5", "md5"], ["SHA-1", "sha1"], ["SHA-256", "sha256"]];
    for each (let [algorithm, propname] in algorithms) {
        let digest = java.security.MessageDigest.getInstance(algorithm);
        digest.update(bytes, 0, bytes.length);
        checksums[propname] = utils.bytesToHex(digest.digest());
    }
    return checksums;
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}

// IMPORTANT: this *must* be on top of every unit test module!
var common = require("../common");

var assert = require("assert");
var system = require("system");
var {Package, User, Author, RelPackageOwner} = require("../../app/model/all");

var pkg, user, author;

exports.setUp = function() {
    common.setUp();
    user = User.create("test", "test", "test", "test@example.org");
    user.save();
    author = Author.create("johndoe", "john.doe@example.org", "http://example.org");
    author.save();
    pkg = Package.create("test", author, user);
    pkg.save();
};

exports.tearDown = function() {
    common.tearDown();
};

exports.testCreate = function() {
    var rel = RelPackageOwner.create(pkg, user, user);
    // .create() doesn't persist
    assert.strictEqual(RelPackageOwner.all().length, 0);
    assert.isTrue(rel.package.equals(pkg));
    assert.isTrue(rel.owner.equals(user));
    rel.save();
    assert.strictEqual(pkg.owners.length, 1);
};

exports.testGet = function() {
    RelPackageOwner.create(pkg, user, user).save();
    var rel = RelPackageOwner.get(pkg, user);
    assert.isTrue(rel.package.equals(pkg));
    assert.isTrue(rel.owner.equals(user));
    var other = User.create("test2", "test2", "test2", "test2@example.org");
    assert.isNull(RelPackageOwner.get(pkg, other));
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}

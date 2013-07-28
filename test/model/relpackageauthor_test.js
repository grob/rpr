// IMPORTANT: this *must* be on top of every unit test module!
var common = require("../common");

var assert = require("assert");
var system = require("system");
var {Package, Author, User, RelPackageAuthor} = require("../../app/model/all");

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
    assert.throws(function() {
        RelPackageAuthor.create(pkg, author, "invalid");
    });
    for each (let role in RelPackageAuthor.ROLES) {
        let rel = RelPackageAuthor.create(pkg, author, role);
        // .create() doesn't persist
        assert.strictEqual(RelPackageAuthor.all().length, 0);
        assert.isTrue(rel.package.equals(pkg));
        assert.isTrue(rel.author.equals(author));
        assert.strictEqual(rel.role, role);
    }
};

exports.testGet = function() {
    var maintainer = RelPackageAuthor.create(pkg, author, RelPackageAuthor.ROLE_MAINTAINER);
    var contributor = RelPackageAuthor.create(pkg, author, RelPackageAuthor.ROLE_CONTRIBUTOR);
    maintainer.save();
    contributor.save();
    for each (let role in RelPackageAuthor.ROLES) {
        let rel = RelPackageAuthor.get(pkg, author, role);
        assert.isTrue(rel.package.equals(pkg));
        assert.isTrue(rel.author.equals(author));
    }
    assert.isNull(RelPackageAuthor.get(pkg, author, "invalid"));
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}

// IMPORTANT: this *must* be on top of every unit test module!
var common = require("../common");

var assert = require("assert");
var system = require("system");
var {ResetToken, User} = require("../../app/model/all");

var username = "johndoe";
var password = "secret";
var salt = "salt";
var email = "john.doe@example.org";
var user = null;

exports.setUp = function() {
    common.setUp();
    user = User.create(username, password, salt, email);
    user.save();
};

exports.tearDown = function() {
    common.tearDown();
};

exports.testCreate = function() {
    var token = ResetToken.create(user);
    // .create() doesn't persist
    assert.strictEqual(ResetToken.all().length, 0);
    assert.isTrue(token.user.equals(user));
    assert.strictEqual(typeof(token.hash), "string");
    assert.isTrue(token.createtime instanceof Date);
};

exports.testCreateHash = function() {
    var hash = ResetToken.createHash();
    // quite senseless test ...
    assert.strictEqual(typeof(hash), "string");
};

exports.testGetByUser = function() {
    assert.isNull(ResetToken.getByUser(user));
    var token = ResetToken.create(user);
    token.save();
    assert.isTrue(ResetToken.getByUser(user).equals(token));
};

exports.testEvaluate = function() {
    var token = ResetToken.create(user);
    token.save();
    assert.isTrue(token.evaluate(user, token.hash));
    var other = User.create("other", password, salt, email);
    assert.isFalse(token.evaluate(other, token.hash));
    assert.isFalse(token.evaluate(user, "differenthash"));
    token.createtime = new Date(Date.now() - (ResetToken.MAX_AGE - 10));
    token.save();
    assert.isTrue(token.evaluate(user, token.hash));
    token.createtime = new Date(Date.now() - ResetToken.MAX_AGE);
    token.save();
    assert.isFalse(token.evaluate(user, token.hash));
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}

// IMPORTANT: this *must* be on top of every unit test module!
var common = require("../common");

var assert = require("assert");
var system = require("system");
var {User} = require("../../app/model/all");

var username = "johndoe";
var password = "secret";
var salt = "salt";
var email = "john.doe@example.org";

exports.setUp = function() {
    common.setUp();
};

exports.tearDown = function() {
    common.tearDown();
};

exports.testCreate = function() {
    var user = User.create(username, password, salt, email);
    // .create() doesn't persist
    assert.strictEqual(User.all().length, 0);
    assert.strictEqual(user.name, username);
    assert.strictEqual(user.password, password);
    assert.strictEqual(user.salt, salt);
    assert.strictEqual(user.email, email);
    assert.isTrue(user.createtime instanceof Date);
    assert.isTrue(user.modifytime instanceof Date);
};

exports.testGetByName = function() {
    User.create(username, password, salt, email).save();
    assert.strictEqual(User.getByName(username).name, username);
    assert.isNull(User.getByName("nonexisting"));
};

exports.testEquals = function() {
    var user1 = User.create(username, password, salt, email);
    var user2 = User.create("other", password, salt, email);
    user1.save();
    user2.save();
    assert.isTrue(user1.equals(User.getByName(user1.name)));
    assert.isFalse(user1.equals(User.getByName(user2.name)));
};

exports.testTouch = function() {
    var user = User.create(username, password, salt, email);
    user.save();
    var modifytime = user.modifytime;
    java.lang.Thread.sleep(100);
    user.touch();
    user.save();
    assert.notStrictEqual(User.getByName(username).modifytime.getTime(),
            modifytime.getTime());
};

exports.testSerialize = function() {
    var user = User.create(username, password, salt, email);
    user.save();
    var serialized = user.serialize();
    assert.strictEqual(Object.keys(serialized).length, 2);
    assert.strictEqual(serialized.name, user.name);
    assert.strictEqual(serialized.email, user.email);
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}

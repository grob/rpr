// IMPORTANT: this *must* be on top of every unit test module!
var common = require("../common");

var assert = require("assert");
var system = require("system");
var {Author} = require("../../app/model/author");

var name = "johndoe";
var email = "john.doe@example.org";
var web = "http://example.org";

exports.setUp = function() {
    common.setUp();
};

exports.tearDown = function() {
    common.tearDown();
};

exports.testCreate = function() {
    var author = Author.create(name, email, web);
    // .create() doesn't persist
    assert.strictEqual(Author.all().length, 0);
    assert.strictEqual(author.name, name);
    assert.strictEqual(author.email, email);
    assert.strictEqual(author.web, web);
};

exports.testGetByName = function() {
    Author.create(name, email, web).save();
    var author = Author.getByName(name);
    assert.isNotNull(author);
    assert.strictEqual(author.name, name);
};

exports.testGetByEmail = function() {
    Author.create(name, email, web).save();
    var author = Author.getByEmail(email);
    assert.isNotNull(author);
    assert.strictEqual(author.name, name);
};

exports.testSerialize = function() {
    var author = Author.create(name, email, web);
    var serialized = author.serialize();
    assert.strictEqual(serialized.constructor, Object);
    assert.strictEqual(Object.keys(serialized).length, 3);
    assert.strictEqual(serialized.name, name);
    assert.strictEqual(serialized.email, email);
    assert.strictEqual(serialized.web, web);
};

exports.testEquals = function() {
    var author = Author.create(name, email, web);
    author.save();
    var author2 = Author.getByName(name);
    assert.isTrue(author.equals(author2));
    assert.isTrue(author2.equals(author));
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}

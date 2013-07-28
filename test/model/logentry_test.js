// IMPORTANT: this *must* be on top of every unit test module!
var common = require("../common");

var assert = require("assert");
var system = require("system");
var {LogEntry, User, Package} = require("../../app/model/all");

var type = LogEntry.TYPE_ADD;
var packagename = "test";
var versionstr = "0.1alpha1";
var user = null;

exports.setUp = function() {
    common.setUp();
    user = User.create("test", "test", "test", "test@example.org");
    user.save();
};

exports.tearDown = function() {
    common.tearDown();
};

exports.testCreate = function() {
    var entry = LogEntry.create(type, packagename, versionstr, user);
    // .create() doesn't persist
    assert.strictEqual(LogEntry.all().length, 0);
    assert.strictEqual(entry.type, type);
    assert.strictEqual(entry.packagename, packagename);
    assert.strictEqual(entry.versionstr, versionstr);
    assert.isTrue(entry.user.equals(user));
};

exports.testGetByPackage = function() {
    var pkg = Package.create(packagename, null, user);
    pkg.save();
    LogEntry.create(type, packagename, versionstr, user).save();
    var entries = LogEntry.getByPackage(pkg);
    assert.isTrue(Array.isArray(entries));
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].packagename, pkg.name);
};

exports.testGetByType = function() {
    LogEntry.create(type, packagename, versionstr, user).save();
    LogEntry.create(LogEntry.TYPE_UPDATE, packagename, versionstr, user).save();
    LogEntry.create(LogEntry.TYPE_DELETE, packagename, null, user).save();
    var entries = LogEntry.getByType(LogEntry.TYPE_ADD);
    assert.isTrue(Array.isArray(entries));
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].packagename, packagename);
    entries = LogEntry.getByType(LogEntry.TYPE_ADD, LogEntry.TYPE_UPDATE);
    assert.strictEqual(entries.length, 2);
    entries = LogEntry.getByType(LogEntry.TYPE_ADD,
            LogEntry.TYPE_UPDATE, LogEntry.TYPE_DELETE);
    assert.strictEqual(entries.length, 3);
};

exports.testGetEntriesSince = function() {
    LogEntry.create(type, packagename, versionstr, user).save();
    LogEntry.create(LogEntry.TYPE_UPDATE, packagename, versionstr, user).save();
    LogEntry.create(LogEntry.TYPE_DELETE, packagename, null, user).save();
    var date = new Date();
    date.setHours(date.getHours() + 1);

    var entries = LogEntry.getEntriesSince(date);
    assert.isTrue(Array.isArray(entries));
    assert.strictEqual(entries.length, 0);
    // without type filter
    date.setHours(date.getHours() - 2);
    entries = LogEntry.getEntriesSince(date);
    assert.strictEqual(entries.length, 3);
    entries = LogEntry.getEntriesSince(date, LogEntry.TYPE_ADD);
    assert.strictEqual(entries.length, 1);
    entries = LogEntry.getEntriesSince(date,
            LogEntry.TYPE_ADD, LogEntry.TYPE_UPDATE);
    assert.strictEqual(entries.length, 2);
    entries = LogEntry.getEntriesSince(date,
            LogEntry.TYPE_ADD, LogEntry.TYPE_UPDATE, LogEntry.TYPE_DELETE);
    assert.strictEqual(entries.length, 3);
};

exports.testGetRemovedPackages = function() {
    LogEntry.create(LogEntry.TYPE_DELETE, packagename, versionstr, user).save();
    LogEntry.create(LogEntry.TYPE_DELETE, packagename, null, user).save();
    var date = new Date();
    date.setHours(date.getHours() + 1);
    var entries = LogEntry.getRemovedPackages(date);
    assert.isTrue(Array.isArray(entries));
    assert.strictEqual(entries.length, 0);
    date.setHours(date.getHours() - 2);
    entries = LogEntry.getRemovedPackages(date);
    assert.strictEqual(entries.length, 1);
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}

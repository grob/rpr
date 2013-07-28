// switch rpr into unit testing mode
environment["rpr.mode"] = "unittest";

var assert = require("assert");
var models = require("../app/model/all");
var {store} = require("../app/model/store");
var logging = require("ringo/logging");
logging.setConfig(getResource("./log4j.properties"));
var log = logging.getLogger(module.id);
var sqlUtils = require("ringo-sqlstore/lib/sqlstore/util");

var truncateTable = function(entityName) {
    var entityConstructor = store.getEntityConstructor(entityName);
    var idMapping = entityConstructor.mapping.id;
    var table = entityConstructor.mapping.tableName;
    var transaction = store.beginTransaction();
    var conn = transaction.getConnection();
    var schema = store.dialect.getDefaultSchema(conn);
    if (sqlUtils.tableExists(conn, table, schema)) {
        try {
            store.executeUpdate("TRUNCATE TABLE " + table, [], transaction);
            if (idMapping.hasSequence() && store.dialect.hasSequenceSupport()) {
                store.executeUpdate("ALTER SEQUENCE " + idMapping.sequence +
                        " RESTART WITH 1", [], transaction)
            }
            store.commitTransaction();
            log.debug("Truncated table", table);
        } catch (exception) {
            store.abortTransaction();
            throw exception;
        }
    }
};

exports.setUp = function() {
    assert.strictEqual(store.connectionPool.getDriverClass(),
            "org.h2.Driver");
};

exports.tearDown = function() {
    assert.strictEqual(store.connectionPool.getDriverClass(),
            "org.h2.Driver");
    Object.keys(models).forEach(truncateTable);
    store.entityCache.clear();
    store.queryCache.clear();
    // make sure the database is empty
    for each (let Entity in models) {
        assert.strictEqual(Entity.all().length, 0);
    }
};

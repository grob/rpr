var {store} = require("./store");

var LogEntry = exports.LogEntry = store.defineEntity("LogEntry", {
    "table": "T_LOG",
    "id": {
        "column": "LOG_ID",
        "sequence": "LOG_ID"
    },
    "properties": {
        "type": {
            "type": "integer",
            "column": "LOG_TYPE",
            "length": 2
        },
        "packagename": {
            "type": "string",
            "column": "LOG_PACKAGENAME",
            "length": 255
        },
        "versionstr": {
            "type": "string",
            "column": "LOG_VERSION",
            "length": 30
        },
        "user": {
            "type": "object",
            "entity": "User",
            "column": "LOG_F_USR"
        },
        "createtime": {
            "type": "timestamp",
            "column": "LOG_CREATETIME"
        }
    }
});

LogEntry.TYPE_ADD = 1;
LogEntry.TYPE_UPDATE = 2;
LogEntry.TYPE_DELETE = 3;

LogEntry.create = function(type, packagename, versionstr, user) {
    return new LogEntry({
        "type": type,
        "packagename": packagename,
        "versionstr": versionstr,
        "user": user,
        "createtime": new Date()
    });
};

LogEntry.getByPackage = function(pkg) {
    return store.query("from LogEntry l where l.packagename = :name", {
        "name": pkg.name
    });
};

LogEntry.getByType = function(type /*, [type[, type]...] */) {
    return store.query("from LogEntry l where l.type in (" +
            Array.prototype.join.call(arguments, ", ") + ")");
};

LogEntry.getEntriesSince = function(date /*, [type[, type]...] */) {
    var query = "from LogEntry l where l.createtime > :date";
    if (arguments.length > 1) {
        query += " and l.type in (" + Array.prototype.join.call(arguments, ", ") + ")";
    }
    return store.query(query);
};

LogEntry.getRemovedPackages = function(date) {
    return store.query("select distinct l.packagename from LogEntry l where l.type = :type and l.versionstr is null and l.createtime > :date", {
        "type": LogEntry.TYPE_DELETE,
        "date": date
    });
};

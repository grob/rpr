var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");
var {Package, LogEntry} = require("../model/all");
var response = require("../utils/response");
var index = require("../index");

var app = exports.app = new Application();
app.configure("mount", "route");

app.mount("/packages", module.resolve("./packages"));
app.mount("/users", module.resolve("./users"));
app.mount("/owners", module.resolve("./owners"));


/**
 * Returns the packages that have been added/updated/removed since
 * the date in the "if-modified-since" header field
 */
app.get("/updates", function(request) {
    var dateStr = request.headers["if-modified-since"];
    if (dateStr != null) {
        var sdf = new java.text.SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zz");
        var date;
        try {
            date = new Date(sdf.parse(dateStr).getTime());
        } catch (e) {
            return response.bad({
                "message": "Invalid 'if-modified-since' header"
            });
        }
        var updated = Package.getUpdatedSince(date).map(function(pkg) {
            return pkg.serialize();
        });
        var removed = LogEntry.getRemovedPackages(date);
        if (updated.length > 0 || removed.length > 0) {
            return response.ok({
                "updated": updated,
                "removed": removed
            });
        }
    }
    return response.notModified();
});

app.get("/search", function(request) {
    try {
        return response.ok(index.search(request.queryParams.q,
                request.queryParams.l, request.queryParams.o));
    } catch (e) {
        log.error(e);
        return response.error({
            "message": e.message
        });
    }
});

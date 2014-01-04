var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");
var response = require("ringo/jsgi/response");
var index = require("./index");

var app = exports.app = new Application();
app.configure("gzip", "etag", "requestlog", "error", "notfound", "params",
        "upload", "mount", "route");

// mount apps
app.mount("/api", module.resolve("./api/main"));
app.mount("/download", module.resolve("./download"));

app.get("/_rebuildIndex", function() {
    index.rebuild();
    return response.json({
        "message": "Done"
    });
});
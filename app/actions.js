var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");
var response = require("./utils/response");
var index = require("./index");

var app = exports.app = new Application();
app.configure("gzip", "etag", "requestlog", "error", "notfound", "params",
        "upload", "mount", "route");
app.configure("static");
app.static(module.resolve("../static/"), "index.html");

// mount apps
app.mount("/api", module.resolve("./api/main"));
app.mount("/download", module.resolve("./download"));

app.get("/search*?", function(request) {
    return response.static(module.resolve("../static/index.html"));
});

app.get("/packages*?", function(request) {
    return response.static(module.resolve("../static/index.html"));
});

app.get("/_rebuildIndex", function() {
    index.rebuild();
    return response.ok({
        "message": "Done"
    });
});
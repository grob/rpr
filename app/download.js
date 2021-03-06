var {Application} = require("stick");
var {mimeType} = require("ringo/mime");
var config = require("./config/config");
var {Package} = require("./model/package");
var semver = require("ringo-semver");
var response = require("ringo/jsgi/response");
var {sanitizeFilename} = require("./utils/utils");

var app = exports.app = new Application();
app.configure("route");

/**
 * Download a .zip archive
 */
app.get("/:filename", function(request, filename) {
    var repo = getRepository(config.downloadDir);
    var archive = repo.getResource(sanitizeFilename(filename));
    if (archive && archive.exists()) {
        return response.static(archive, mimeType(filename));
    }
    return response.json({
        "message": "Package archive '" + filename + "' does not exist"
    }).notFound();
});

/**
 * Download a package's .zip archive
 */
app.get("/:pkgName/:versionStr", function(request, pkgName, versionStr) {
    var pkg = Package.getByName(pkgName);
    if (pkg !== null) {
        var version = (versionStr === "latest") ? pkg.latestVersion :
                pkg.getVersion(semver.cleanVersion(versionStr));
        if (version != null) {
            return response.redirect("/download/" + version.filename);
        }
    }
    return response.json({
        "message": "Package '" + pkgName + "' does not exist"
    }).notFound();
});


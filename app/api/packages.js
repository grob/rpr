var fs = require("fs");
var log = require("ringo/logging").getLogger(module.id);

var {Application} = require("stick");
var response = require("../utils/response");
var {AuthenticationError, RegistryError} = require("../errors");
var {Package, Version, User, Author, RelPackageAuthor, LogEntry} =
        require("../model/all");
var registry = require("../registry");
var utils = require("../utils/utils");
var semver = require("ringo-semver");


var app = exports.app = new Application();
app.configure("route");

/**
 * Returns the packages catalog
 */
app.get("/", function(request) {
    return response.ok(Package.all().map(function(pkg) {
        return pkg.serialize();
    }));
});

/**
 * Returns the metadata of the package
 */
app.get("/:pkgName", function(request, pkgName, versionStr) {
    var pkg = Package.getByName(pkgName);
    if (pkg != null) {
        return response.ok(pkg.serialize());
    }
    log.info("Package", pkgName, "not found");
    return response.notfound({
        "message": "Package '" + pkgName + "' not found"
    });
});

/**
 * Returns the metadata of a specific version of a package
 */
app.get("/:pkgName/:versionStr", function(request, pkgName, versionStr) {
    var pkg = Package.getByName(pkgName);
    if (pkg != null) {
        var version = (versionStr == "latest") ? pkg.latestVersion :
            pkg.getVersion(semver.cleanVersion(versionStr));
        if (version != null) {
            return response.ok(version.serialize());
        }
    }
    log.info("Version", versionStr, "of package", pkgName, "does not exist");
    return response.notfound({
        "message": "Version " + versionStr + " of package '" + pkgName + "' not found"
    });
});

/**
 * Deletes a package
 */
app.del("/:pkgName", function(request, pkgName) {
    var [username, password] = utils.getCredentials(request);
    var pkg = Package.getByName(pkgName);
    if (pkg == null) {
        return response.notfound({
            "message": "Package '" + pkgName + "' does not exist"
        });
    }
    try {
        var user = registry.authenticate(username, password);
        registry.unpublish(pkg, null, user);
        log.info("Unpublished", pkg.name);
        return response.ok({
            "message": "Package " + pkg.name + " has been removed"
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.forbidden({
            "message": e.message
        });
    } catch (e) {
        log.error(e);
        return response.error({
            "message": e.message
        });
    }
});

/**
 * Deletes a specific version of the package
 */
app.del("/:pkgName/:versionStr", function(request, pkgName, versionStr) {
    var [username, password] = utils.getCredentials(request);
    var pkg = Package.getByName(pkgName);
    if (pkg == null) {
        return response.notfound({
            "message": "Version " + versionStr + " of package '" + pkgName + "' does not exist"
        });
    }
    try {
        var user = registry.authenticate(username, password);
        registry.unpublish(pkg, versionStr, user);
        log.info("Unpublished", versionStr, "of package", pkg.name);
        return response.ok({
            "message": "Version " + versionStr + " of package " +
                pkg.name + " has been removed"
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.forbidden({
            "message": e.message
        });
    } catch (e) {
        log.error(e);
        return response.error({
            "message": e.message
        });
    }
});

app.post("/:pkgName/:versionStr", function(request, pkgName, versionStr) {
    var [username, password] = utils.getCredentials(request);
    var force = request.postParams.force === "true";
    var descriptorJson = request.postParams.descriptor;
    var pkg = request.postParams.pkg;
    var tmpFilePath = null;
    try {
        var user = registry.authenticate(username, password);
        var descriptor = JSON.parse(descriptorJson);
        utils.normalizeDescriptor(descriptor);
        utils.evalDescriptor(descriptor);
        // store package as temporary file
        var [tmpFilePath, filesize, checksums] = registry.storeTemporaryFile(pkg.value, pkg.filename);
        var filename = registry.createFileName(tmpFilePath, descriptor.name, descriptor.version);
        // publish package
        registry.publishPackage(descriptor, filename, filesize, checksums, user, force);
        // move file to final destination
        registry.publishFile(tmpFilePath, filename);
        log.info("Published", descriptor.name, descriptor.version);
        return response.ok({
            "message": "The package " + descriptor.name + " (v" +
                descriptor.version + ") has been published"
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.forbidden({
            "message": e.message
        });
    } catch (e) {
        log.error(e);
        return response.error({
            "message": e.message
        });
    } finally {
        // cleanup
        if (tmpFilePath !== null && fs.exists(tmpFilePath)) {
            fs.remove(tmpFilePath);
        }
    }
    return;
});

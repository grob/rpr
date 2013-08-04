var fs = require("fs");
var log = require("ringo/logging").getLogger(module.id);

var {Application} = require("stick");
var response = require("ringo/jsgi/response");
var {AuthenticationError, RegistryError} = require("../errors");
var {Package, Version, User, Author, RelPackageAuthor, LogEntry} =
        require("../model/all");
var registry = require("../registry");
var utils = require("../utils/utils");
var semver = require("ringo-semver");
var cors = require("./cors");


var app = exports.app = new Application();
app.configure("route");

/**
 * Returns the packages catalog
 */
app.get("/", function(request) {
    return cors.json(Package.all().map(function(pkg) {
        return pkg.serialize();
    }));
});

/**
 * Returns the metadata of the package
 */
app.get("/:pkgName", function(request, pkgName, versionStr) {
    var pkg = Package.getByName(pkgName);
    if (pkg != null) {
        return cors.json(pkg.serialize());
    }
    log.info("Package", pkgName, "not found");
    return cors.json({
        "message": "Package '" + pkgName + "' not found"
    }).notFound();
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
            return cors.json(version.serialize());
        }
    }
    log.info("Version", versionStr, "of package", pkgName, "does not exist");
    return cors.json({
        "message": "Version " + versionStr + " of package '" + pkgName + "' not found"
    }).notFound();
});

/**
 * Deletes a package
 */
app.del("/:pkgName", function(request, pkgName) {
    var [username, password] = utils.getCredentials(request);
    var pkg = Package.getByName(pkgName);
    if (pkg == null) {
        return response.json({
            "message": "Package '" + pkgName + "' does not exist"
        }).notFound();
    }
    try {
        var user = registry.authenticate(username, password);
        registry.unpublish(pkg, null, user);
        log.info("Unpublished", pkg.name);
        return response.json({
            "message": "Package " + pkg.name + " has been removed"
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.json({
            "message": e.message
        }).forbidden();
    } catch (e) {
        log.error(e);
        return response.json({
            "message": e.message
        }).error();
    }
});

/**
 * Deletes a specific version of the package
 */
app.del("/:pkgName/:versionStr", function(request, pkgName, versionStr) {
    var [username, password] = utils.getCredentials(request);
    var pkg = Package.getByName(pkgName);
    if (pkg == null) {
        return response.json({
            "message": "Version " + versionStr + " of package '" + pkgName + "' does not exist"
        }).notFound();
    }
    try {
        var user = registry.authenticate(username, password);
        var version = semver.cleanVersion(versionStr);
        registry.unpublish(pkg, version, user);
        log.info("Unpublished", version, "of package", pkg.name);
        return response.json({
            "message": "Version " + version + " of package " +
                pkg.name + " has been removed"
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.json({
            "message": e.message
        }).forbidden();
    } catch (e) {
        log.error(e);
        return response.json({
            "message": e.message
        }).error();
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
        return response.json({
            "message": "The package " + descriptor.name + " (v" +
                descriptor.version + ") has been published"
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.json({
            "message": e.message
        }).forbidden();
    } catch (e) {
        log.error(e);
        return response.json({
            "message": e.message
        }).error();
    } finally {
        // cleanup
        if (tmpFilePath !== null && fs.exists(tmpFilePath)) {
            fs.remove(tmpFilePath);
        }
    }
    return;
});

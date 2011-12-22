var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");
var fs = require("fs");
var {store, Package, Version, User, Author, RelPackageAuthor} = require("./model");
var {mimeType} = require("ringo/mime");
var config = require("./config");
var response = require("./response");
var semver = require("ringo-semver");
var registry = require("./registry");
var index = require("./index");
var utils = require("./utils");

var app = exports.app = new Application();
app.configure("etag", "requestlog", "error", "notfound", "params", "upload", "route");

/**
 * Returns the packages catalog
 */
app.get("/packages.json", function(request) {
    return response.ok(Package.all().map(function(pkg) {
        return pkg.serialize();
    }));
});

app.get("/search.json", function(request) {
    var ids = index.search(request.queryParams.q);
    return response.ok(ids.map(function(id) {
        return Package.get(id).serialize();
    }));
});

/**
 * Package archive download route
 */
app.get("/package/:pkgName", function(request, pkgName) {
    var repo = getRepository(config.packageDir);
    var archive = repo.getResource(pkgName);
    if (archive && archive.exists()) {
        return response.static(archive, mimeType(pkgName));
    } else {
        return response.notfound({
            "message": "Package '" + pkgName + "' does not exist"
        });
    }
});

/**
 * Returns the metadata of the package
 */
app.get("/packages/:pkgName", function(request, pkgName, versionStr) {
    var pkg = Package.getByName(pkgName);
    if (pkg != null) {
        return response.ok(pkg.serialize());
    }
    return response.notfound({
        "message": "Package '" + pkgName + "' not found"
    });
});

/**
 * Returns the metadata of a specific version of a package
 */
app.get("/packages/:pkgName/:versionStr", function(request, pkgName, versionStr) {
    var pkg = Package.getByName(pkgName);
    if (pkg != null) {
        var version = (versionStr == "latest") ? pkg.latestVersion :
            pkg.getVersion(semver.cleanVersion(versionStr));
        if (version != null) {
            return response.ok(version.serialize());
        }
    }
    return response.notfound({
        "message": "Version " + versionStr + " of package '" + pkgName + "' not found"
    });
});

/**
 * Deletes a package
 */
app.del("/packages/:pkgName", function(request, pkgName) {
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
        return response.ok({
            "message": "Package " + pkg.name + " has been removed"
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
app.del("/packages/:pkgName/:versionStr", function(request, pkgName, versionStr) {
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
        return response.ok({
            "message": "Version " + versionStr + " of package " +
                pkg.name + " has been removed"
        });
    } catch (e) {
        log.error(e);
        return response.error({
            "message": e.message
        });
    }
    return response.notfound({
        "message": "Version " + versionStr + " of package '" + pkgName + "' not found"
    });
});

app.post("/packages/:pkgName/:versionStr", function(request, pkgName, versionStr) {
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
        return response.ok({
            "message": "The package " + descriptor.name + " (v" +
                descriptor.version + ") has been published"
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

/**
 * Returns true if a user with the given name exists
 */
app.get("/users/:username", function(request, username) {
    if (User.getByName(username) != null) {
        return response.ok(true);
    }
    return response.notfound();
});

/**
 * Returns the salt of the user
 */
app.get("/users/:username/salt", function(request, username) {
    var user = User.getByName(username);
    if (user != null) {
        return response.ok(user.salt);
    }
    return response.error({
        "message": "Unknown user " + username
    });
});

/**
 * Creates a new user account
 */
app.post("/users/", function(request) {
    var props = {};
    // basic evaluation
    for each (let propName in ["username", "password", "salt", "email"]) {
        var value = request.postParams[propName].trim();
        if (typeof(value) !== "string" || value.length < 1) {
            return response.error({
                "message": "Missing or invalid " + propName
            });
        }
        props[propName] = value;
    }
    if (User.getByName(props.username) !== null) {
        return response.error({
            "message": "Please choose a different username"
        });
    }
    User.create(props.username, props.password, props.salt, props.email).save();
    return response.ok({
        "message": "The user '" + props.username + " has been registered"
    });
});

/**
 * Changes a user's password
 */
app.post("/password", function(request) {
    var [username, password] = utils.getCredentials(request);
    var newPassword = request.postParams.password;
    try {
        var user = registry.authenticate(username, password);
        user.password = newPassword;
        user.save();
        return response.ok({
            "message": "Changed password"
        });
    } catch (e) {
        return response.error({
            "message": e.message
        });
    }
});

app.get("/_rebuildIndex", function(request) {
    index.rebuild();
    return response.ok({
        "message": "ok"
    });
});

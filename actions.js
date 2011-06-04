var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");
var fs = require("fs");
var {store, Package, Version, User, Author, RelPackageAuthor} = require("./model");
var config = require("./config");
var response = require("./response");
var semver = require("ringo-semver");
var registry = require("./registry");
var utils = require("./utils");

var app = exports.app = new Application();
app.configure("etag", "requestlog", "error", "notfound", "params", "upload", "route");

app.get("/packages.json", function(request) {
    return response.ok(Package.all().map(function(pkg) {
        return pkg.serialize();
    }));
});

app.get("/packages/:pkgName", function(request, pkgName, versionStr) {
    var pkg = Package.getByName(pkgName);
    if (pkg != null) {
        return response.ok(pkg.serialize());
    }
    return response.notfound({
        "message": "Package '" + pkgName + "' not found"
    });
});

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

//FIXME: this should be a DELETE route (digest/basicauth needed)
app.post("/packages/:pkgName/unpublish", function(request, pkgName) {
    var pkg = Package.getByName(pkgName);
    if (pkg == null) {
        return response.notfound({
            "message": "Package '" + pkgName + "' does not exist"
        });
    }
    try {
        var user = registry.authenticate(request.postParams.username,
                request.postParams.password);
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

// FIXME: this should be a DELETE route (digest/basicauth needed)
app.post("/packages/:pkgName/:versionStr/unpublish", function(request, pkgName, versionStr) {
    var pkg = Package.getByName(pkgName);
    if (pkg == null) {
        return response.notfound({
            "message": "Version " + versionStr + " of package '" + pkgName + "' does not exist"
        });
    }
    try {
        var user = registry.authenticate(request.postParams.username,
                request.postParams.password);
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
    var username = request.postParams.username;
    var password = request.postParams.password;
    var force = request.postParams.force === "true";
    var descriptor = request.postParams.descriptor;
    var pkg = request.postParams.pkg;
    var tmpFilePath = null;
    try {
        var user = registry.authenticate(username, password);
        var descriptor = utils.evalDescriptor(JSON.parse(descriptor));
        utils.normalizeDescriptor(descriptor);
        var [tmpFilePath, checksums] = registry.storeTemporaryFile(pkg.value, pkg.filename);
        var filename = registry.getFinalFileName(tmpFilePath, descriptor.name, descriptor.version);
        registry.publishPackage(descriptor, filename, checksums, user, force);
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

app.get("/users/:username", function(request, username) {
    if (User.getByName(username) != null) {
        return response.ok(true);
    }
    return response.notfound();
});

app.get("/users/:username/salt", function(request, username) {
    var user = User.getByName(username);
    if (user != null) {
        return response.ok(user.salt);
    }
    return response.error({
        "message": "Unknown user " + username
    });
});

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

app.post("/users/:username/password", function(request, username) {
    var oldPassword = request.postParams.oldPassword;
    var newPassword = request.postParams.newPassword;
    try {
        var user = registry.authenticate(username, oldPassword);
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

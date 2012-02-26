var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");
var fs = require("fs");
var {store, Package, Version, User, Author, RelPackageAuthor, LogEntry} = require("./model");
var {mimeType} = require("ringo/mime");
var config = require("./config");
var response = require("./response");
var semver = require("ringo-semver");
var registry = require("./registry");
var index = require("./index");
var utils = require("./utils");

var app = exports.app = new Application();
app.configure("gzip", "etag", "requestlog", "error", "notfound", "params", "upload", "route");

/**
 * Returns the packages catalog
 */
app.get("/packages", function(request) {
    return response.ok(Package.all().map(function(pkg) {
        return pkg.serialize();
    }));
});

/**
 * Returns the packages that have been added/updated/removed since
 * the date in the "if-modified-since" header field
 */
app.get("/updates", function(request) {
    var dateStr = request.headers["if-modified-since"];
    if (dateStr != null) {
        var sdf = new java.text.SimpleDateFormat("EEE, dd MMM yyyy HH:mm:ss zz");
        try {
            var date = sdf.parse(dateStr);
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
        } catch (e) {
            return response.bad({
                "message": "Invalid 'if-modified-since' header"
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
        return response.error({
            "message": e.message
        });
    }
});

/**
 * Download a .zip archive
 */
app.get("/download/:filename", function(request, filename) {
    var repo = getRepository(config.packageDir);
    var archive = repo.getResource(filename);
    if (archive && archive.exists()) {
        return response.static(archive, mimeType(filename));
    }
    return response.notfound({
        "message": "Package archive '" + filename + "' does not exist"
    });
});

/**
 * Download a package's .zip archive
 */
app.get("/download/:pkgName/:versionStr", function(request, pkgName, versionStr) {
    var pkg = Package.getByName(pkgName);
    if (pkg !== null) {
        var version = (versionStr === "latest") ? pkg.latestVersion :
                pkg.getVersion(semver.cleanVersion(versionStr));
        if (version != null) {
            return response.redirect("/download/" + version.filename);
        }
    }
    return response.notfound({
        "message": "Package '" + pkgName + "' does not exist"
    });
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
    } catch (e if e instanceof registry.AuthenticationError) {
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
    } catch (e if e instanceof registry.AuthenticationError) {
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
    } catch (e if e instanceof registry.AuthenticationError) {
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

/**
 * Returns true if a user with the given name exists
 */
app.get("/users/:username", function(request, username) {
    if (User.getByName(username) != null) {
        return response.ok(true);
    }
    return response.notfound({
        "message": "User '" + username + "' does not exist"
    });
});

/**
 * Returns the salt of the user
 */
app.get("/users/:username/salt", function(request, username) {
    var user = User.getByName(username);
    if (user != null) {
        return response.ok(user.salt);
    }
    return response.notfound({
        "message": "Unknown user"
    });
});

/**
 * Initiates the reset of a user's password
 */
app.post("/users/:username/reset", function(request, username) {
    var user = User.getByName(username);
    var email = request.postParams.email;
    if (user === null) {
        return response.notfound({
            "message": "Unknown user"
        });
    }
    try {
        registry.initPasswordReset(user, email);
        return response.ok({
            "message": "An email has been sent to " + email +
                    ". Please follow the instructions therein to reset your password"
        });
    } catch (e if e instanceof registry.AuthenticationError) {
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
 * Sets a user's password
 */
app.post("/users/:username/password", function(request, username) {
    var user = User.getByName(username);
    var token = request.postParams.token;
    var password = request.postParams.password;
    if (user === null) {
        return response.notfound({
            "message": "Unknown user"
        });
    }
    try {
        registry.resetPassword(user, token, password);
        return response.ok({
            "message": "Your password has been reset"
        });
    } catch (e if e instanceof registry.AuthenticationError) {
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
    } catch (e if e instanceof registry.AuthenticationError) {
        return response.forbidden({
            "message": e.message
        });
    } catch (e) {
        return response.error({
            "message": e.message
        });
    }
});

app.put("/owners/:pkgName/:ownerName", function(request, pkgName, ownerName) {
    var [username, password] = utils.getCredentials(request);
    var pkg = Package.getByName(pkgName);
    if (pkg == null) {
        return response.notfound({
            "message": "Package '" + pkgName + "' does not exist"
        });
    }
    var owner = User.getByName(ownerName);
    if (owner == null) {
        return response.bad({
            "message": "User '" + ownerName + "' does not exist"
        });
    }
    try {
        var user = registry.authenticate(username, password);
        registry.addOwner(pkg, owner, user);
        return response.ok({
            "message": "Added " + owner.name + " to list of owners of " + pkg.name
        });
    } catch (e if e instanceof registry.RegistryError) {
        return response.bad({
            "message": e.message
        });
    } catch (e if e instanceof registry.AuthenticationError) {
        return response.forbidden({
            "message": e.message
        });
    } catch (e) {
        return response.error({
            "message": e.message
        });
    }
});

app.del("/owners/:pkgName/:ownerName", function(request, pkgName, ownerName) {
    var [username, password] = utils.getCredentials(request);
    var pkg = Package.getByName(pkgName);
    if (pkg == null) {
        return response.notfound({
            "message": "Package " + pkgName + " does not exist"
        });
    }
    var owner = User.getByName(ownerName);
    if (owner == null) {
        return response.bad({
            "message": "User " + ownerName + " does not exist"
        });
    }
    try {
        var user = registry.authenticate(username, password);
        registry.removeOwner(pkg, owner, user);
        return response.ok({
            "message": "Removed " + owner.name + " from list of owners of " + pkg.name
        });
    } catch (e if e instanceof registry.RegistryError) {
        return response.bad({
            "message": e.message
        });
    } catch (e if e instanceof registry.AuthenticationError) {
        return response.forbidden({
            "message": e.message
        });
    } catch (e) {
        return response.error({
            "message": e.message
        });
    }
});

app.get("/_rebuildIndex", function() {
    index.rebuild();
    return response.ok({
        "message": "Done"
    });
});
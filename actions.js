var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");
var fs = require("fs");
var io = require("io");
var strings = require("ringo/utils/strings");
var dates = require("ringo/utils/dates");
var {store, Package, Version, User, Author, RelPackageAuthor} = require("./model");
var config = require("./config");
var response = require("./response");
var crypto = require("ringo-crypto");
var semver = require("ringo-semver");
var files = require("ringo/utils/files");
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

app.post("/packages/:pkgName/:versionStr", function(request, pkgName, versionStr) {
    var username = request.postParams.username;
    var password = request.postParams.password;
    var force = request.postParams.force === "true";
    var descriptor = request.postParams.descriptor;
    var pkg = request.postParams.pkg;
    var tmpFilePath = null;
    try {
        var user = authenticate(username, password);
        var descriptor = utils.evalDescriptor(JSON.parse(descriptor));
        utils.normalizeDescriptor(descriptor);
        var [tmpFilePath, checksums] = storeFile(pkg.value, pkg.filename);
        var filename = getFinalFileName(tmpFilePath, descriptor.name, descriptor.version);
        storePackage(descriptor, filename, checksums, user, force);
        // move file to final destination
        publishPackageFile(tmpFilePath, filename);
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

app.del("/packages/:pkgName/:versionStr", function(request, pkgName, versionStr) {
    var username = request.postParams.username;
    var password = request.postParams.password;
    try {
        var user = authenticate(username, password);
        var pkg = Package.getByName(pkgName);
        if (pkg != null) {
            var version = pkg.getVersion(semver.cleanVersion(versionStr));
            if (version != null) {
                if (version.creator._id !== user._id) {
                    throw new Error("Only the publisher of a version can unpublish it");
                }
                version.remove();
                return response.ok({
                    "message": "Version " + version.version + " of package " +
                        version.package.name + " has been removed"
                });
            }
        }
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
        var user = authenticate(username, oldPassword);
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


/**
 * Saves the file in the temporary directory defined in config.tmpDir and
 * returns the path of the file together with an object containing various
 * checksums
 * @returns An array containing the path to the temporary file and
 * an object containing various checksums
 * @type Array
 */
var storeFile = function(bytes, filename) {
    var checksums = {
        "md5": null,
        "sha1": null,
        "sha256": null
    };
    // create temporary file in config.tmpDir
    var extension = fs.extension(filename);
    var prefix = fs.base(filename, extension);
    var path = files.createTempFile(prefix, extension, config.tmpDir);
    
    // prepare checksum calculation
    var md5Digest = java.security.MessageDigest.getInstance("MD5");
    var sha1Digest = java.security.MessageDigest.getInstance("SHA-1");
    var sha256Digest = java.security.MessageDigest.getInstance("SHA-256");

    var byteStream, fileOutStream, md5Stream, sha1Stream, sha256Stream;
    try {
        byteStream = new io.MemoryStream(bytes);
        fileOutStream = fs.open(path, {
            "write": true,
            "binary": true
        });
        md5Stream = new java.security.DigestOutputStream(fileOutStream, md5Digest);
        sha1Stream = new java.security.DigestOutputStream(fileOutStream, md5Digest);
        sha256Stream = new java.security.DigestOutputStream(fileOutStream, md5Digest);
        byteStream.copy(fileOutStream);
        checksums.md5 = crypto.bytesToHex(md5Digest.digest());
        checksums.sha1 = crypto.bytesToHex(sha1Digest.digest());
        checksums.sha256 = crypto.bytesToHex(sha256Digest.digest());
    } finally {
        for each (let stream in [byteStream, fileOutStream, md5Stream, sha1Stream, sha256Stream]) {
            if (stream != null) {
                stream.close();
            }
        }
    }
    return [path, checksums];
};

var getFinalFileName = function(tmpFilePath, pkgName, version) {
    var extension = fs.extension(tmpFilePath);
    return pkgName + "-" + version + extension;
};

var storeAuthor = function(data) {
    var author = Author.getByName(data.name);
    if (author === null) {
        author = new Author(data);
        author.save();
    }
    return author;
};

var storeAuthorRelations = function(pkg, collection, authors, role) {
    log.debug("Storing", role, "relations between", pkg.name, "and authors");
    // add authors in list if they aren't already
    for each (let author in authors) {
        if (collection.indexOf(author) < 0) {
            var relation = new RelPackageAuthor({
                "package": pkg,
                "author": author,
                "role": role
            });
            relation.save();
            log.info("Added", author.name, "as", role, "to", pkg.name);
        }
    }
    // remove authors not in list anymore
    var ids = authors.map(function(author) {
        return author._id;
    });
    collection.filter(function(author) {
        return ids.indexOf(author._id) < 0;
    }).forEach(function(author) {
        var relations = RelPackageAuthor.query().equals("package", pkg).equals("author", author).select();
        relations.forEach(function(relation) {
            log.info("Removed", author.name, "as", role, "from", pkg.name);
            relation.remove();
        });
    })
    return;
};


var storePackage = function(descriptor, filename, checksums, user, force) {
    store.beginTransaction();
    try {
        // author (optional, using first contributor if not specified)
        var author = null;
        if (descriptor.author != undefined) {
            author = storeAuthor(descriptor.author);
        }
        // contributors and maintainers
        var contributors = descriptor.contributors.map(storeAuthor);
        var maintainers = descriptor.maintainers.map(storeAuthor);
        var pkg = Package.getByName(descriptor.name) ||
                    Package.create(descriptor.name, author || contributors[0], user);
        // store/update version
        var version = pkg._id && pkg.getVersion(descriptor.version);
        if (!version) {
            version = Version.create(pkg, descriptor, filename, checksums, user);
            pkg.latestVersion = version;
            pkg.save();
        } else if (force) {
            version.descriptor = JSON.stringify(descriptor);
            version.filename = filename;
            version.modifytime = new Date();
            version.save();
            // update package too, if this is the latest version
            if (version._id === pkg.latestVersion._id) {
                pkg.descriptor = version.descriptor;
                pkg.save();
            }
        } else {
            store.abortTransaction();
            throw new Error("Version " + version.version + " of package " +
                    descriptor.name + " has already been published");
        }
    
        // store relations between contributors/maintainers and the package
        storeAuthorRelations(pkg, pkg.contributors, contributors, "contributor");
        storeAuthorRelations(pkg, pkg.maintainers, maintainers, "maintainer");
    
        store.commitTransaction();
    } catch (e) {
        log.info(e);
        store.abortTransaction();
        throw e;
    }
    return filename;
};

var publishPackageFile = function(tmpFilePath, filename) {
    if (!fs.exists(config.packageDir) || !fs.isWritable(config.packageDir)) {
        throw new Error("Unable to store package archive");
    }
    var dest = fs.join(config.packageDir, filename);
    log.info("Moving package file from", tmpFilePath, "to", dest);
    if (fs.exists(dest)) {
        log.info("Removing already published file", dest);
        fs.remove(dest);
    }
    fs.move(tmpFilePath, dest);
    return;
};

var authenticate = function(username, password) {
    var user = User.getByName(username);
    if (user == undefined) {
        throw new Error("Unknown user " + username);
    }
    var digest = strings.b64decode(user.password, "raw");
    var bytes = strings.b64decode(password, "raw");
    if (!java.util.Arrays.equals(digest, bytes)) {
        throw new Error("Password incorrect");
    }
    return user;
};

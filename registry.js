var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");
var fs = require("fs");
var io = require("io");
var strings = require("ringo/utils/strings");
var {store, Package, Version, User, Author, RelPackageAuthor} = require("./model");
var config = require("./config");
var semver = require("ringo-semver");
var files = require("ringo/utils/files");
var utils = require("./utils");

export("authenticate", "publishPackage", "publishFile", "unpublish", "storeTemporaryFile", "createFileName");

function authenticate(username, password) {
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
}

/**
 * Saves the file in the temporary directory defined in config.tmpDir and
 * returns the path of the file together with an object containing various
 * checksums
 * @returns An array containing the path to the temporary file and
 * an object containing various checksums
 * @type Array
 */
function storeTemporaryFile(bytes, filename) {
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
        checksums.md5 = utils.bytesToHex(md5Digest.digest());
        checksums.sha1 = utils.bytesToHex(sha1Digest.digest());
        checksums.sha256 = utils.bytesToHex(sha256Digest.digest());
    } finally {
        for each (let stream in [byteStream, fileOutStream, md5Stream, sha1Stream, sha256Stream]) {
            if (stream != null) {
                stream.close();
            }
        }
    }
    return [path, checksums];
}

function publishPackage(descriptor, filename, checksums, user, force) {
    var pkg = Package.getByName(descriptor.name);
    if (pkg != null && !pkg.isOwner(user)) {
        throw new Error("Only the original author of a package can publish a version");
    }
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
        if (pkg == null) {
            pkg = Package.create(descriptor.name, author || contributors[0], user);
        }
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
            if (pkg.isLatestVersion(version)) {
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
    return;
}

function publishFile(tmpFilePath, filename) {
    if (!fs.exists(config.packageDir) || !fs.isWritable(config.packageDir)) {
        throw new Error("Unable to store package archive:", config.packageDir,
                "doesn't exist or isn't writable");
    }
    var dest = fs.join(config.packageDir, filename);
    log.info("Moving package file from", tmpFilePath, "to", dest);
    if (fs.exists(dest)) {
        log.info("Removing already published file", dest);
        fs.remove(dest);
    }
    fs.move(tmpFilePath, dest);
    return;
}

function createFileName(tmpFilePath, pkgName, version) {
    var extension = fs.extension(tmpFilePath);
    return pkgName + "-" + version + extension;
}

function unpublish(pkg, version, user) {
    if (!pkg.isOwner(user)) {
        throw new Error("Only the original publisher of a package can unpublish");
    }
    try {
        store.beginTransaction();
        // remove whole package if no version given
        if (version == undefined) {
            Package.remove(pkg);
        } else {
            try {
                version = semver.cleanVersion(version);
            } catch (e) {
                throw new Error("Invalid version '" + version + "'");
            }
            var pkgVersion = pkg.getVersion(version);
            if (!pkgVersion) {
                throw new Error("Version " + version + " of package " + pkg.name + " does not exist");
            }
            if (pkg.versions.length === 1) {
                Package.remove(pkg);
            } else {
                Version.remove(pkg, pkgVersion);
            }
        }
        store.commitTransaction();
        return;
    } catch (e) {
        store.abortTransaction();
        throw e;
    }
}

function storeAuthor(data) {
    var author = null;
    if (data.hasOwnProperty("email")) {
        author = Author.getByEmail(data.email);
    }
    if (author === null) {
        author = Author.create(data.name, data.email, data.web);
        author.save();
    } else {
        // update author with values received
        var modified = false;
        for each (var key in ["name", "email", "web"]) {
            if (data.hasOwnProperty(key) && data[key] != author[key]) {
                author[key] = data[key];
                modified = true;
            }
        }
        if (modified) {
            author.save();
        }
    }
    return author;
}

function storeAuthorRelations(pkg, collection, authors, role) {
    log.debug("Storing", role, "relations between", pkg.name, "and authors");
    // add authors in list if they aren't already
    for each (let author in authors) {
        if (collection.indexOf(author) < 0) {
            var relation = RelPackageAuthor.create(pkg, author, role);
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
        var relation = RelPackageAuthor.get(pkg, author, role);
        relation.remove();
        log.info("Removed", author.name, "as", role, "from", pkg.name);
    })
    return;
}

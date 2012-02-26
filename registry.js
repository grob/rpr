var log = require("ringo/logging").getLogger(module.id);
var fs = require("fs");
var io = require("io");
var strings = require("ringo/utils/strings");
var {store, Package, Version, User, Author, RelPackageAuthor, LogEntry,
    ResetToken, RelPackageOwner} = require("./model");
var config = require("./config");
var semver = require("ringo-semver");
var files = require("ringo/utils/files");
var utils = require("./utils");
var index = require("./index");
var mail = require("ringo-mail");

export("AuthenticationError", "RegistryError", "authenticate", "publishPackage",
        "publishFile", "unpublish", "storeTemporaryFile", "createFileName",
        "initPasswordReset", "resetPassword", "addOwner", "removeOwner");

var RegistryError = function(message) {
    this.name = "RegistryError";
    this.message = message || "";
};
RegistryError.prototype = new Error();

var AuthenticationError = function(message) {
    this.name = "AuthenticationError";
    this.message = message || "";
};
AuthenticationError.prototype = new Error();

function authenticate(username, password) {
    var user = User.getByName(username);
    if (user == undefined) {
        throw new AuthenticationError("Unknown user " + username);
    }
    var digest = strings.b64decode(user.password, "raw");
    var bytes = strings.b64decode(password, "raw");
    if (!java.util.Arrays.equals(digest, bytes)) {
        throw new AuthenticationError("Password incorrect");
    }
    return user;
}

/**
 * Saves the file in the temporary directory defined in config.tmpDir and
 * returns the path of the file together with an object containing various
 * checksums
 * @returns An array containing the path to the temporary file, it's size
 * in bytes and an object containing various checksums
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
        sha1Stream = new java.security.DigestOutputStream(md5Stream, sha1Digest);
        sha256Stream = new java.security.DigestOutputStream(sha1Stream, sha256Digest);
        byteStream.copy(sha256Stream);
        checksums.md5 = utils.bytesToHex(md5Digest.digest());
        checksums.sha1 = utils.bytesToHex(sha1Digest.digest());
        checksums.sha256 = utils.bytesToHex(sha256Digest.digest());
    } finally {
        for each (let stream in [byteStream, sha256Stream]) {
            if (stream != null) {
                stream.close();
            }
        }
    }
    return [path, bytes.length, checksums];
}

function publishPackage(descriptor, filename, filesize, checksums, user, force) {
    var pkg = Package.getByName(descriptor.name);
    if (pkg != null && !pkg.isOwner(user)) {
        throw new AuthenticationError("Only owners of a package are allowed to publish");
    }
    var logEntryType = LogEntry.TYPE_ADD;
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
            // add the initial publisher to the list of package owners
            RelPackageOwner.create(pkg, user, user).save();
        }
        // store/update version
        var version = pkg._id && pkg.getVersion(descriptor.version);
        if (!version) {
            version = Version.create(pkg, descriptor, filename, filesize, checksums, user);
            pkg.latestVersion = version;
        } else if (force) {
            version.descriptor = JSON.stringify(descriptor);
            version.filename = filename;
            version.filesize = filesize;
            version.md5 = checksums.md5;
            version.sha1 = checksums.sha1;
            version.sha256 = checksums.sha256;
            version.touch();
            version.save();
            // update package too, if this is the latest version
            if (pkg.isLatestVersion(version)) {
                pkg.descriptor = version.descriptor;
            }
            logEntryType = LogEntry.TYPE_UPDATE;
        } else {
            throw new Error("Version " + version.version + " of package " +
                    descriptor.name + " has already been published");
        }
        pkg.touch();
        pkg.save();

        // store relations between contributors/maintainers and the package
        storeAuthorRelations(pkg, pkg.contributors, contributors, "contributor");
        storeAuthorRelations(pkg, pkg.maintainers, maintainers, "maintainer");

        // add a log entry
        LogEntry.create(logEntryType, descriptor.name, descriptor.version, user).save();

        // (re-)add to search index
        index.manager.update("id", pkg._id, index.createDocument(pkg));

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
        throw new AuthenticationError("Only the original publisher of a package can unpublish");
    }
    store.beginTransaction();
    try {
        // remove whole package if no version given
        if (version == undefined) {
            // remove all archive files and the package itself
            // including all versions from database and search index
            removePackageArchive(pkg);
            Package.remove(pkg);
            // update search index and add a log entry
            index.manager.remove("id", pkg._id);
            LogEntry.create(LogEntry.TYPE_DELETE, pkg.name, null, user).save();
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
                removePackageArchive(pkg);
                Package.remove(pkg);
                // remove from search index and add a log entry
                index.manager.remove("id", pkg._id);
                LogEntry.create(LogEntry.TYPE_DELETE, pkg.name, null, user).save();
            } else {
                removeVersionArchive(pkgVersion);
                Version.remove(pkg, pkgVersion);
                pkg.touch();
                pkg.save();
                // update search index and add a log entry
                index.manager.update("id", pkg._id, index.createDocument(pkg));
                LogEntry.create(LogEntry.TYPE_DELETE, pkg.name, pkgVersion.version, user).save();
            }
        }
        store.commitTransaction();
        return;
    } catch (e) {
        store.abortTransaction();
        throw e;
    }
}

function removeArchive(filename) {
    var path = fs.join(config.packageDir, filename);
    if (!fs.exists(path)) {
        log.warn("Published package archive", path, "not found");
    } else {
        fs.remove(path);
        log.info("Removed published package archive", path);
    }
    return;
}

function removeVersionArchive(version) {
    removeArchive(version.filename);
}

function removePackageArchive(pkg) {
    for each (var pkgVersion in pkg.versions) {
        removeVersionArchive(pkgVersion);
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

function initPasswordReset(user, email) {
    if (user.email != email) {
        throw new AuthenticationError("Email address does not match");
    }
    store.beginTransaction();
    var token;
    try {
        token = ResetToken.create(user);
        token.save();
        mail.send({
            "host": config.smtp.host,
            "port": config.smtp.port,
            "encrypt": config.smtp.encrypt,
            "from": config.email,
            "to": user.name + " <" + user.email + ">",
            "subject": "Your password reset request in RingoJS package registry",
            "text": [
                "Hello " + user.name + "!\n",
                "You've requested to reset your password in the RingoJS package registry.\n",
                "Please type 'rp password set' on the command line, and copy/paste the following token when asked for:\n",
                token.hash,
                "\nPlease note that your token will be valid for only 24 hours.",
                "\nBest regards,",
                "the RingoJS package registry maintainers"
            ].join("\n")
        });
        store.commitTransaction();
    } catch (e) {
        store.abortTransaction();
        throw e;
    }
}

function resetPassword(user, tokenStr, password) {
    var token = ResetToken.getByUser(user);
    if (!token || !token.evaluate(user, tokenStr)) {
        throw new AuthenticationError("Password reset token is invalid");
    }
    store.beginTransaction();
    try {
        user.password = password;
        user.touch();
        user.save();
        // remove token since we're finished here
        token.remove();
        store.commitTransaction();
    } catch (e) {
        store.abortTransaction();
        log.error(e);
        throw e;
    }
}

function addOwner(pkg, owner, user) {
    if (!pkg.isOwner(user)) {
        throw new AuthenticationError("Only a package owner can add additional owners");
    } else if (pkg.isOwner(owner)) {
        throw new RegistryError(owner.name + " is already owner of " + pkg.name);
    }
    log.info(user.name, "adds", owner.name, "to list of owners of", pkg.name);
    store.beginTransaction();
    try {
        RelPackageOwner.create(pkg, owner, user).save();
        pkg.touch();
        pkg.save();
        store.commitTransaction();
    } catch (e) {
        store.abortTransaction();
        log.error(e);
        throw e;
    }
}

function removeOwner(pkg, owner, user) {
    if (!pkg.isOwner(user)) {
        throw new AuthenticationError("Only a package owner can remove other owners");
    } else if (!pkg.isOwner(owner)) {
        throw new RegistryError(owner.name + " is not among the owners of " + pkg.name);
    } else if (pkg.owners.length < 2) {
        throw new RegistryError(pkg.name + " must have at least one owner");
    }
    log.info(user.name, "removes", owner.name, "from list of owners of", pkg.name);
    store.beginTransaction();
    try {
        RelPackageOwner.get(pkg, owner).remove();
        pkg.touch();
        pkg.save();
        store.commitTransaction();
    } catch (e) {
        store.abortTransaction();
        log.error(e);
        throw e;
    }
}
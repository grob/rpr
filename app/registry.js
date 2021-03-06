var log = require("ringo/logging").getLogger(module.id);
var fs = require("fs");
var io = require("io");
var strings = require("ringo/utils/strings");
var {store} = require("./model/store");
var {Package, Version, User, Author, RelPackageAuthor, LogEntry,
    ResetToken, RelPackageOwner} = require("./model/all");
var config = require("./config/config");
var semver = require("ringo-semver");
var files = require("ringo/utils/files");
var utils = require("./utils/utils");
var index = require("./index");
var mail = require("ringo-mail");
var {AuthenticationError, RegistryError} = require("./errors");

exports.authenticate = function(username, password) {
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
};

/**
 * Saves the file in the temporary directory defined in config.tmpDir and
 * returns the path of the file together with an object containing various
 * checksums
 * @returns An array containing the path to the temporary file, it's size
 * in bytes and an object containing various checksums
 * @type Array
 */
exports.storeTemporaryFile = function(bytes, filename) {
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
};

var createPackage = exports.createPackage = function(name, author, owner) {
    var pkg = Package.create(name, author, owner);
    // add the initial publisher to the list of package owners
    RelPackageOwner.create(pkg, owner, owner).save();
    pkg.save();
    return pkg;
};

exports.publishPackage = function(descriptor, filename, filesize, checksums, user, force) {
    var pkg = Package.getByName(descriptor.name);
    if (pkg != null && !pkg.isOwner(user)) {
        throw new AuthenticationError("Only owners of a package are allowed to publish");
    }
    var logEntryType = LogEntry.TYPE_ADD;
    store.beginTransaction();
    try {
        // contributors and maintainers
        var contributors = descriptor.contributors.map(storeAuthor);
        var maintainers = descriptor.maintainers.map(storeAuthor);
        // author (optional, using first contributor if not specified)
        var author = (descriptor.author && storeAuthor(descriptor.author)) ||
                contributors[0];
        var version = null;
        if (pkg == null) {
            pkg = createPackage(descriptor.name, author, user);
        } else {
            version = pkg.getVersion(descriptor.version);
        }
        // store/update version
        if (!version) {
            version = Version.create(pkg, descriptor, filename, filesize, checksums, user);
        } else if (force) {
            version.update(descriptor, filename, filesize, checksums);
            logEntryType = LogEntry.TYPE_UPDATE;
        } else {
            throw new Error("Version " + version.version + " of package " +
                    descriptor.name + " has already been published");
        }
        version.save();
        pkg.versions.invalidate();
        pkg.latestVersion = pkg.findLatestVersion();
        pkg.touch();
        pkg.save();

        // store relations between contributors/maintainers and the package
        storeAuthorRelations(pkg, pkg.contributors, contributors,
                RelPackageAuthor.ROLE_CONTRIBUTOR);
        storeAuthorRelations(pkg, pkg.maintainers, maintainers,
                RelPackageAuthor.ROLE_MAINTAINER);

        // add a log entry
        LogEntry.create(logEntryType, descriptor.name, descriptor.version, user).save();
        // (re-)add to search index
        index.manager.update("id", pkg._id, index.createDocument(pkg));

        store.commitTransaction();
        return [pkg, version];
    } catch (e) {
        log.error(e);
        store.abortTransaction();
        throw e;
    }
};

exports.publishFile = function(tmpFilePath, filename) {
    if (!fs.exists(config.downloadDir) || !fs.isWritable(config.downloadDir)) {
        throw new Error("Unable to store package archive:", config.downloadDir,
                "doesn't exist or isn't writable");
    }
    var destPath = fs.join(config.downloadDir, filename);
    log.info("Moving package file from", tmpFilePath, "to", destPath);
    if (fs.exists(destPath)) {
        log.info("Removing already published file", destPath);
        fs.remove(destPath);
    }
    fs.move(tmpFilePath, destPath);
    return destPath;
};

exports.createFileName = function(tmpFilePath, pkgName, version) {
    var extension = fs.extension(tmpFilePath);
    return pkgName + "-" + version + extension;
};

exports.unpublish = function(pkg, version, user) {
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
    } catch (e) {
        store.abortTransaction();
        throw e;
    }
};

var removeArchive = exports.removeArchive = function(filename) {
    var path = fs.join(config.downloadDir, filename);
    if (!fs.exists(path)) {
        log.warn("Published package archive", path, "not found");
    } else {
        fs.remove(path);
        log.info("Removed published package archive", path);
    }
};

var removeVersionArchive = exports.removeVersionArchive = function(version) {
    removeArchive(version.filename);
};

var removePackageArchive = exports.removePackageArchive = function(pkg) {
    pkg.versions.forEach(removeVersionArchive)
};

var storeAuthor = exports.storeAuthor = function(data) {
    var author = Author.getByNameAndEmail(data.name, data.email);
    if (!author) {
        author = Author.create(data.name, data.email, data.web);
        author.save();
    } else if (data.web && data.web != author.web) {
        author.web = data.web;
        author.save();
    }
    return author;
};

var storeAuthorRelations = exports.storeAuthorRelations = function(pkg, collection, authors, role) {
    log.debug("Storing", role, "relations of", pkg.name);
    // add authors in list if they aren't already
    for each (let author in authors) {
        if (collection.indexOf(author) < 0) {
            var relation = RelPackageAuthor.create(pkg, author, role);
            relation.save();
            collection.invalidate();
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
        RelPackageAuthor.get(pkg, author, role).remove();
        collection.invalidate();
        log.info("Removed", author.name, "as", role, "from", pkg.name);
    });
};

exports.initPasswordReset = function(user, email) {
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
};

exports.resetPassword = function(user, tokenStr, password) {
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
};

exports.addOwner = function(pkg, owner, user) {
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
        pkg.owners.invalidate();
        store.commitTransaction();
    } catch (e) {
        store.abortTransaction();
        log.error(e);
        throw e;
    }
};

exports.removeOwner = function(pkg, owner, user) {
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
        pkg.owners.invalidate();
        store.commitTransaction();
    } catch (e) {
        store.abortTransaction();
        log.error(e);
        throw e;
    }
};

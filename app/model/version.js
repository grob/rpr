var {store} = require("./store");
var semver = require("ringo-semver");

var Version = exports.Version = store.defineEntity("Version", {
    "table": "T_VERSION",
    "id": {
        "column": "VSN_ID",
        "sequence": "VERSION_ID"
    },
    "properties": {
        "version": {
            "type": "string",
            "column": "VSN_VERSION",
            "length": 30
        },
        "descriptor": {
            "type": "text",
            "column": "VSN_DESCRIPTOR"
        },
        "filename": {
            "type": "string",
            "column": "VSN_FILENAME",
            "length": 100
        },
        "filesize": {
            "type": "double",
            "column": "VSN_FILESIZE"
        },
        "md5": {
            "type": "string",
            "column": "VSN_MD5",
            "length": 100
        },
        "sha1": {
            "type": "string",
            "column": "VSN_SHA1",
            "length": 100
        },
        "sha256": {
            "type": "string",
            "column": "VSN_SHA256",
            "length": 100
        },
        "createtime": {
            "type": "timestamp",
            "column": "VSN_CREATETIME"
        },
        "modifytime": {
            "type": "timestamp",
            "column": "VSN_MODIFYTIME"
        },
        "package": {
            "type": "object",
            "entity": "Package",
            "column": "VSN_F_PKG"
        },
        "creator": {
            "type": "object",
            "entity": "User",
            "column": "VSN_F_USR_CREATOR"
        },
        "modifier": {
            "type": "object",
            "entity": "User",
            "column": "VSN_F_USR_MODIFIER"
        }
    }
});

Version.create = function(pkg, descriptor, filename, filesize, checksums, creator) {
    return new Version({
        "package": pkg,
        "version": descriptor.version,
        "descriptor": JSON.stringify(descriptor),
        "filename": filename,
        "filesize": filesize,
        "md5": checksums.md5,
        "sha1": checksums.sha1,
        "sha256": checksums.sha256,
        "creator": creator,
        "createtime": new Date(),
        "modifier": creator,
        "modifytime": new Date()
    });
};

Version.remove = function(pkg, version) {
    if (pkg.isLatestVersion(version)) {
        // re-assign the latest version of the package
        var versionNumbers = semver.sort(pkg.versions.map(function(v) {
            return v.version;
        }), -1);
        pkg.latestVersion = pkg.getVersion(versionNumbers[1]);
        pkg.save();
    }
    pkg.versions.remove(version);
    version.remove();
    return;
};

Version.getByVersion = function(version, pkg) {
    return store.query("from Version v where v.package = :pkgId and v.version = :version", {
        "pkgId": pkg._id,
        "version": version
    })[0] || null;
};

Version.getByPackage = function(pkg) {
    return store.query("from Version v where v.package = :pkgId", {
        "pkgId": pkg._id
    }) || null;
};

Version.prototype.touch = function() {
    this.modifytime = new Date();
    return;
};

Version.prototype.serialize = function() {
    var descriptor = JSON.parse(this.descriptor);
    var pkg = this.package;
    return {
        "name": this.package.name,
        "version": this.version,
        "description": descriptor.description,
        "keywords": descriptor.keywords,
        "latest": pkg.latestVersion.version,
        "filename": this.filename,
        "filesize": this.filesize,
        "modified": this.modifytime.toISOString(),
        "homepage": descriptor.homepage,
        "implements": descriptor.implements,
        "author": (pkg.author && pkg.author.serialize()) || undefined,
        "repositories": descriptor.repositories || [],
        "licenses": descriptor.licenses || [],
        "maintainers": pkg.maintainers.map(function(author) {
            return author.serialize();
        }),
        "contributors": pkg.contributors.map(function(author) {
            return author.serialize();
        }),
        "dependencies": descriptor.dependencies || {},
        "engines": descriptor.engines || undefined,
        "checksums": {
            "md5": this.md5,
            "sha1": this.sha1,
            "sha256": this.sha256
        }
    };
};

Version.prototype.equals = function(version) {
    return this._key.equals(version._key);
};

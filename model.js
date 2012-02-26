var log = require('ringo/logging').getLogger(module.id);
var {Store} = require("ringo-sqlstore");
var config = require('./config');
var dates = require("ringo/utils/dates");
var semver = require("ringo-semver");
var {ByteArray} = require("binary");
var strings = require("ringo/utils/strings");

export("store", "Package", "Version", "User", "Author", "RelPackageAuthor",
        "RelPackageOwner", "LogEntry", "ResetToken");

/**
 * create store
 */
var store = module.singleton("store", function() {
    return new Store(config.dbProps, config.storeOptions);
});

var RelPackageAuthor = store.defineEntity("RelPackageAuthor", {
    "table": "T_REL_PACKAGE_AUTHOR",
    "id": {
        "column": "RPA_ID",
        "sequence": "REL_PACKAGE_AUTHOR_ID"
    },
    "properties": {
        "package": {
            "type": "object",
            "entity": "Package",
            "column": "RPA_F_PKG"
        },
        "author": {
            "type": "object",
            "entity": "Author",
            "column": "RPA_F_AUT"
        },
        "role": {
            "type": "string",
            "column": "RPA_ROLE",
            "length": 50
        }
    }
});

RelPackageAuthor.create = function(pkg, author, role) {
    return new RelPackageAuthor({
        "package": pkg,
        "author": author,
        "role": role
    })
};

RelPackageAuthor.get = function(pkg, author, role) {
    var query = RelPackageAuthor.query()
        .equals("package", pkg)
        .equals("author", author);
    if (role != null) {
        query.equals("role", role);
    }
    return query.select()[0];
};

var RelPackageOwner = store.defineEntity("RelPackageOwner", {
    "table": "T_REL_PACKAGE_OWNER",
    "id": {
        "column": "RPO_ID",
        "sequence": "REL_PACKAGE_OWNER_ID"
    },
    "properties": {
        "package": {
            "type": "object",
            "entity": "Package",
            "column": "RPO_F_PKG"
        },
        "owner": {
            "type": "object",
            "entity": "User",
            "column": "RPO_F_USR"
        },
        "creator": {
            "type": "object",
            "entity": "User",
            "column": "RPO_F_USR_CREATOR"
        },
        "createtime": {
            "type": "timestamp",
            "column": "RPO_CREATETIME"
        }
    }
});

RelPackageOwner.create = function(pkg, owner, creator) {
    return new RelPackageOwner({
        "package": pkg,
        "owner": owner,
        "creator": creator,
        "createtime": new Date()
    });
};

RelPackageOwner.get = function(pkg, owner) {
    return RelPackageOwner.query()
        .equals("package", pkg)
        .equals("owner", owner)
        .select()[0];
};

var Package = store.defineEntity("Package", {
    "table": "T_PACKAGE",
    "id": {
        "column": "PKG_ID",
        "sequence": "PACKAGE_ID"
    },
    "properties": {
        "name": {
            "type": "string",
            "column": "PKG_NAME",
            "length": 255
        },
        "descriptor": {
            "type": "text",
            "column": "PKG_DESCRIPTOR"
        },
        "createtime": {
            "type": "timestamp",
            "column": "PKG_CREATETIME"
        },
        "modifytime": {
            "type": "timestamp",
            "column": "PKG_MODIFYTIME"
        },
        "author": {
            "type": "object",
            "entity": "Author",
            "column": "PKG_AUTHOR"
        },
        "latestVersion": {
            "type": "object",
            "entity": "Version",
            "column": "PKG_F_VSN_LATEST"
        },
        "creator": {
            "type": "object",
            "entity": "User",
            "column": "PKG_F_USR_CREATOR"
        },
        "modifier": {
            "type": "object",
            "entity": "User",
            "column": "PKG_F_USR_MODIFIER"
        },
        "versions": {
            "type": "collection",
            "entity": "Version",
            "foreignProperty": "package"
        },
        "maintainers": {
            "type": "collection",
            "entity": "Author",
            "through": "RelPackageAuthor",
            "join": "RelPackageAuthor.author === Author.id",
            "foreignProperty": "RelPackageAuthor.package",
            "filter": "RelPackageAuthor.role === 'maintainer'"
        },
        "contributors": {
            "type": "collection",
            "entity": "Author",
            "through": "RelPackageAuthor",
            "join": "RelPackageAuthor.author === Author.id",
            "foreignProperty": "RelPackageAuthor.package",
            "filter": "RelPackageAuthor.role === 'contributor'"
        },
        "owners": {
            "type": "collection",
            "entity": "User",
            "through": "RelPackageOwner",
            "join": "RelPackageOwner.owner === User.id",
            "foreignProperty": "RelPackageOwner.package"
        }
    }
});

Package.create = function(name, author, creator) {
    return new Package({
        "name": name,
        "author": author,
        "creator": creator,
        "createtime": new Date(),
        "modifier": creator,
        "modifytime": new Date()
    });
};

Package.remove = function(pkg) {
    pkg.versions.forEach(function(version) {
        version.remove();
    });
    pkg.owners.forEach(function(owner) {
        RelPackageOwner.get(pkg, owner).remove();
    });
    for each (var key in ["contributor", "maintainer"]) {
        pkg[key + "s"].forEach(function(author) {
            RelPackageAuthor.get(pkg, author, key).remove();
        });
    }
    pkg.remove();
    return;
};

Package.getByName = function(name) {
    return Package.query().equals("name", name).select()[0] || null;
};

Package.getUpdatedSince = function(date) {
    return Package.query().greater("modifytime", date).select();
};

Package.prototype.touch = function() {
    this.modifytime = new Date();
    return;
};

Package.prototype.serialize = function() {
    var result = this.latestVersion.serialize();
    result.modified = this.modifytime.toISOString();
    // serialize versions and sort the by version number descending
    var versionSorter = semver.getSorter(-1);
    result.versions = this.versions.map(function(version) {
        return version.serialize();
    }).sort(function(v1, v2) {
        return versionSorter(v1.version, v2.version);
    });
    // serialize package owners
    result.owners = this.owners.map(function(user) {
        return user.serialize();
    });
    return result;
};

Package.prototype.getVersion = function(version) {
    return Version.query().equals("package", this).equals("version", version).select()[0] || null;
};

Package.prototype.isOwner = function(user) {
    return this.owners.indexOf(user) > -1;
};

Package.prototype.isLatestVersion = function(version) {
    return this.latestVersion.equals(version);
};

Package.prototype.equals = function(pkg) {
    return this._key.equals(pkg._key);
};

var Version = store.defineEntity("Version", {
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
    version.remove();
    return;
};

Version.getByVersion = function(version, pkg) {
    return Version.query().equals("package", pkg).equals("version", version).select()[0] || null;
};

Version.getByPackage = function(pkg) {
    return Version.query().equals("package", pkg).select() || null;
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

var User = store.defineEntity("User", {
    "table": "T_USER",
    "id": {
        "column": "USR_ID",
        "sequence": "USER_ID"
    },
    "properties": {
        "name": {
            "type": "string",
            "column": "USR_NAME",
            "length": 100
        },
        "password": {
            "type": "string",
            "column": "USR_PASSWORD",
            "length": 255
        },
        "salt": {
            "type": "string",
            "column": "USR_SALT",
            "length": 255
        },
        "email": {
            "type": "string",
            "column": "USR_EMAIL",
            "length": 100
        },
        "createtime": {
            "type": "timestamp",
            "column": "USR_CREATETIME"
        },
        "modifytime": {
            "type": "timestamp",
            "column": "USR_MODIFYTIME"
        }
    }
});

User.create = function(username, password, salt, email) {
    return new User({
        "name": username,
        "password": password,
        "salt": salt,
        "email": email,
        "createtime": new Date(),
        "modifytime": new Date()
    });
};

User.getByName = function(name) {
    return User.query().equals("name", name).select()[0] || null;
};

User.prototype.touch = function() {
    this.modifytime = new Date();
    return;
};

User.prototype.equals = function(user) {
    return this._key.equals(user._key);
};

User.prototype.serialize = function() {
    return {
        "name": this.name,
        "email": this.email
    };
};

var Author = store.defineEntity("Author", {
    "table": "T_AUTHOR",
    "id": {
        "column": "AUT_ID",
        "sequence": "AUTHOR_ID"
    },
    "properties": {
        "name": {
            "type": "string",
            "column": "AUT_NAME",
            "length": 100
        },
        "email": {
            "type": "string",
            "column": "AUT_EMAIL",
            "length": 100
        },
        "web": {
            "type": "string",
            "column": "AUT_WEB",
            "length": 255
        },
        "createtime": {
            "type": "timestamp",
            "column": "AUT_CREATETIME"
        }
    }
});

Author.create = function(name, email, web) {
    return new Author({
        "name": name,
        "email": email,
        "web": web,
        "createtime": new Date()
    });
};

Author.getByName = function(name) {
    return Author.query().equals("name", name).select()[0] || null;
};

Author.getByEmail = function(email) {
    return Author.query().equals("email", email).select()[0] || null;
};

Author.prototype.serialize = function() {
    return {
        "name": this.name,
        "email": this.email,
        "web": this.web
    };
};

Author.prototype.equals = function(author) {
    return this._key.equals(author._key);
};


var LogEntry = store.defineEntity("LogEntry", {
    "table": "T_LOG",
    "id": {
        "column": "LOG_ID",
        "sequence": "LOG_ID"
    },
    "properties": {
        "type": {
            "type": "integer",
            "column": "LOG_TYPE",
            "length": 2
        },
        "packagename": {
            "type": "string",
            "column": "LOG_PACKAGENAME",
            "length": 255
        },
        "versionstr": {
            "type": "string",
            "column": "LOG_VERSION",
            "length": 30
        },
        "user": {
            "type": "object",
            "entity": "User",
            "column": "LOG_F_USR"
        },
        "createtime": {
            "type": "timestamp",
            "column": "LOG_CREATETIME"
        }
    }
});

LogEntry.TYPE_ADD = 1;
LogEntry.TYPE_UPDATE = 2;
LogEntry.TYPE_DELETE = 3;

LogEntry.create = function(type, packagename, versionstr, user) {
    return new LogEntry({
        "type": type,
        "packagename": packagename,
        "versionstr": versionstr,
        "user": user,
        "createtime": new Date()
    });
};

LogEntry.getByPackage = function(pkg) {
    return LogEntry.query().equals("packagename", pkg.name).select();
};

LogEntry.getByTypeQuery = function(type/*, [type[, type]...] */) {
    if (arguments.length > 1) {
        var placeholders = Array.prototype.map.call(arguments, function(type, idx) {
            return "$" + idx;
        }).join(", ");
        var types = Array.prototype.slice.call(arguments, 0);
        return LogEntry.query().filter("type in (" + placeholders + ")", types);
    }
    return LogEntry.query().equals("type", type);
};

LogEntry.getByType = function(type /*, [type[, type]...] */) {
    return LogEntry.getByTypeQuery.apply(null, arguments).select();
};

LogEntry.getEntriesSince = function(date /*, [type[, type]...] */) {
    var query;
    if (arguments.length > 1) {
        query = LogEntry.getByTypeQuery.apply(null, Array.prototype.slice.call(arguments, 1));
    } else {
        query = LogEntry.query();
    }
    return query.greater("createtime", date).select();
};

LogEntry.getRemovedPackages = function(date) {
    return LogEntry.getByTypeQuery(LogEntry.TYPE_DELETE)
                .equals("versionstr", null)
                .greater("createtime", date)
                .distinct("packagename");
};


var ResetToken = store.defineEntity("ResetToken", {
    "table": "T_TOKEN",
    "id": {
        "column": "TKN_ID",
        "sequence": "TKN_ID"
    },
    "properties": {
        "hash": {
            "type": "string",
            "column": "TKN_HASH",
            "length": 255
        },
        "user": {
            "type": "object",
            "entity": "User",
            "column": "TKN_F_USR"
        },
        "createtime": {
            "type": "timestamp",
            "column": "TKN_CREATETIME"
        }
    }
});

ResetToken.create = function(user) {
    return new ResetToken({
        "user": user,
        "hash": ResetToken.createHash(),
        "createtime": new Date()
    });
};

ResetToken.createHash = function() {
    var hash = new ByteArray(8);
    var random = java.security.SecureRandom.getInstance("SHA1PRNG");
    random.nextBytes(hash);
    return strings.b64encode(hash);
};

ResetToken.getByUser = function(user) {
    return ResetToken.query()
                .equals("user", user)
                .orderBy("createtime desc")
                .select()[0] || null;
};

ResetToken.prototype.evaluate = function(user, tokenStr) {
    var age = (new Date()).getTime() - this.createtime.getTime();
    return age < 86400000 &&
            user._id === this.user._id &&
            this.hash === tokenStr;
};

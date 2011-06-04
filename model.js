var log = require('ringo/logging').getLogger(module.id);
var {Store} = require("ringo-sqlstore");
var config = require('./config');
var dates = require("ringo/utils/dates");
var semver = require("ringo-semver");

export("store", "Package", "Version", "User", "Author", "RelPackageAuthor");

var DATEFORMAT = "yyyy-MM-dd'T'HH:mm:ss.S'Z'";

/**
 * create store
 */
var store = new Store({
    /*
    "url": "jdbc:h2:file:" + config.dbPath + "/" + config.dbProps.database,
    "driver": "org.h2.Driver",
    */
    "url": "jdbc:mysql://localhost/rpr",
    "driver": "com.mysql.jdbc.Driver",
    "username": config.dbProps.username,
    "password": config.dbProps.password
}, {
   maxConnections: 100,
   cacheSize: 1000
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
            "column": "RPA_ROLE"
        }
    }
});

RelPackageAuthor.get = function(pkg, author, role) {
    return RelPackageAuthor.query()
        .equals("package", pkg)
        .equals("author", author)
        .equals("role", role)
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
            "column": "PKG_NAME"
        },
        "descriptor": {
            "type": "string",
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
            "column": "PKG_F_VSN_LATEST",
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
    pkg.versions.forEach(function(v) {
        v.remove();
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

Package.prototype.serialize = function() {
    var result = this.serializeMin();
    result.versions = {};
    result.modified = {};
    for each (let version in this.versions) {
        result.versions[version.version] = version.serializeMin();
        result.modified[version.version] = dates.format(version.modifytime, DATEFORMAT);
    }
    return result;
};

Package.prototype.serializeMin = function() {
    var descriptor = JSON.parse(this.latestVersion.descriptor);
    return {
        "name": this.name,
        "description": descriptor.description,
        "keywords": descriptor.keywords,
        "latest": descriptor.version,
        "homepage": descriptor.homepage,
        "implements": descriptor.implements,
        "author": this.author && this.author.serialize() || undefined,
        "maintainers": this.maintainers.map(function(author) {
            return author.serialize();
        }),
        "contributors": this.contributors.map(function(author) {
            return author.serialize();
        }),
        "dependencies": descriptor.dependencies || undefined
    }
};

Package.prototype.getVersion = function(version) {
    return Version.query().equals("package", this).equals("version", version).select()[0] || null;
};

Package.prototype.isOwner = function(user) {
    return this.creator._key.equals(user._key);
};

Package.prototype.isLatestVersion = function(version) {
    return version._key.equals(this.latestVersion._key);
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
            "column": "VSN_VERSION"
        },
        "descriptor": {
            "type": "string",
            "column": "VSN_DESCRIPTOR"
        },
        "filename": {
            "type": "string",
            "column": "VSN_FILENAME"
        },
        "md5": {
            "type": "string",
            "column": "VSN_MD5"
        },
        "sha1": {
            "type": "string",
            "column": "VSN_SHA1"
        },
        "sha256": {
            "type": "string",
            "column": "VSN_SHA256"
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

Version.create = function(pkg, descriptor, filename, checksums, creator) {
    return new Version({
        "package": pkg,
        "version": descriptor.version,
        "descriptor": JSON.stringify(descriptor),
        "filename": filename,
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

Version.prototype.serializeMin = function() {
    return {
        "name": this.package.name,
        "version": this.version,
        "checksums": {
            "md5": this.md5,
            "sha1": this.sha1,
            "sha256": this.sha256
        },
        "filename": this.filename
   };
};

Version.prototype.serialize = function() {
    var result = this.package.serializeMin();
    // add version specifics to result
    var descriptor = JSON.parse(this.descriptor);
    result.version = this.version;
    result.dependencies = descriptor.dependencies || {};
    result.checksums = {
        "md5": this.md5,
        "sha1": this.sha1,
        "sha256": this.sha256
    };
    result.filename = this.filename;
    return result;
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
            "column": "USR_NAME"
        },
        "password": {
            "type": "string",
            "column": "USR_PASSWORD"
        },
        "salt": {
            "type": "string",
            "column": "USR_SALT"
        },
        "email": {
            "type": "string",
            "column": "USR_EMAIL"
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

var Author = store.defineEntity("Author", {
    "table": "T_AUTHOR",
    "id": {
        "column": "AUT_ID",
        "sequence": "AUTHOR_ID"
    },
    "properties": {
        "name": {
            "type": "string",
            "column": "AUT_NAME"
        },
        "email": {
            "type": "string",
            "column": "AUT_EMAIL"
        },
        "web": {
            "type": "string",
            "column": "AUT_WEB"
        },
        "createtime": {
            "type": "timestamp",
            "column": "AUT_CREATETIME"
        }
    }
});

Author.getByName = function(name) {
    return Author.query().equals("name", name).select()[0] || null;
};

Author.prototype.serialize = function() {
    return {
        "name": this.name,
        "email": this.email,
        "web": this.web
    };
};

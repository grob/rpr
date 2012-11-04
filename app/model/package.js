var {store} = require("./store");
var semver = require("ringo-semver");
var {RelPackageOwner} = require("./relpackageowner");
var {RelPackageAuthor} = require("./relpackageauthor");

var Package = exports.Package = store.defineEntity("Package", {
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
            "query": "from Version v where v.package = :id"
        },
        "maintainers": {
            "type": "collection",
            "query": "from Author a join RelPackageAuthor as r on r.package = :id where r.author = a.id and r.role = 'maintainer'"
        },
        "contributors": {
            "type": "collection",
            "query": "from Author a join RelPackageAuthor as r on r.package = :id where r.author = a.id and r.role = 'contributor'"
        },
        "owners": {
            "type": "collection",
            "query": "from User u join RelPackageOwner as r on r.package = :id where r.owner = u.id"
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
    return store.query("from Package p where p.name = :name", {
        "name": name
    })[0] || null;
};

Package.getUpdatedSince = function(date) {
    return store.query("from Package p where p.modifytime > :date", {
        "date": date
    });
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
    return store.query("from Version v where v.package = :pkgId and v.version = :version", {
        "pkgId": this._id,
        "version": version
    })[0] || null;
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

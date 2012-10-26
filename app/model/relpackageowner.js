var {store} = require("./store");

var RelPackageAuthor = exports.RelPackageAuthor = store.defineEntity("RelPackageAuthor", {
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
    var query = "from RelPackageAuthor as r where r.package = :pkgId and r.author = :authorId";
    if (role != null) {
        query += " and r.role = :role";
    }
    return store.query(query, {
        "pkgId": pkg._id,
        "authorId": author._id,
        "role": role
    })[0];
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
    return store.query("from RelPackageOwner as r where r.package = :pkgId and r.owner = :ownerId", {
        "pkgId": pkg._id,
        "ownerId": owner._id
    })[0];
};

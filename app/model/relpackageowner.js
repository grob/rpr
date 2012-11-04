var {store} = require("./store");

var RelPackageOwner = exports.RelPackageOwner = store.defineEntity("RelPackageOwner", {
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

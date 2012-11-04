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

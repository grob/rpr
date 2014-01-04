var {store} = require("./store");

var Author = exports.Author = store.defineEntity("Author", {
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
        "email": email || null,
        "web": web || null,
        "createtime": new Date()
    });
};

Author.getByName = function(name) {
    return store.query("from Author a where a.name = :name", {
        "name": name
    })[0] || null;
};

Author.getByEmail = function(email) {
    return store.query("from Author a where a.email = :email", {
        "email": email
    })[0] || null;
};

Author.getByNameAndEmail = function(name, email) {
    if (typeof(email) === "string" && email.length > 0) {
        return store.query("from Author a where a.name = :name and a.email = :email", {
            "name": name,
            "email": email
        })[0] || null;
    }
    return store.query("from Author a where a.name = :name and a.email is null", {
        "name": name
    })[0] || null;
};

Author.prototype.serialize = function() {
    return {
        "name": this.name,
        "email": this.email,
        "web": this.web,
        "gravatar": this.getGravatarHash()
    };
};

Author.prototype.getGravatarHash = function() {
    if (this.email) {
        var md5Digest = java.security.MessageDigest.getInstance("MD5");
        var bytes = md5Digest.digest(this.email.trim().toLowerCase().toByteArray());
        var bi = new java.math.BigInteger(1, bytes);
        return java.lang.String.format("%0" + (bytes.length << 1) + "X", bi).toLowerCase();
    }
    return null;
};

Author.prototype.equals = function(author) {
    return this._key.equals(author._key);
};

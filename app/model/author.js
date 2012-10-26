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
        "email": email,
        "web": web,
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

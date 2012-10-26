var {store} = require("./store");

var User = exports.User = store.defineEntity("User", {
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
    return store.query("from User u where u.name = :name", {
        "name": name
    })[0] || null;
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

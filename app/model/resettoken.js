var {store} = require("./store");
var {ByteArray} = require("binary");
var strings = require("ringo/utils/strings");

var ResetToken = exports.ResetToken = store.defineEntity("ResetToken", {
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
    return store.query("from ResetToken t where t.user = :userId order by t.createtime desc", {
        "userId": user._id
    })[0] || null;
};

ResetToken.prototype.evaluate = function(user, tokenStr) {
    var age = (new Date()).getTime() - this.createtime.getTime();
    return age < 86400000 &&
            user._id === this.user._id &&
            this.hash === tokenStr;
};

var RegistryError = exports.RegistryError = function(message) {
    this.name = "RegistryError";
    this.message = message || "";
};
RegistryError.prototype = new Error();
RegistryError.prototype.constructor = RegistryError;

var AuthenticationError = exports.AuthenticationError = function(message) {
    this.name = "AuthenticationError";
    this.message = message || "";
};
AuthenticationError.prototype = new Error();
AuthenticationError.prototype.constructor = AuthenticationError;


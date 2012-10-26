

var RegistryError = function(message) {
    this.name = "RegistryError";
    this.message = message || "";
};
RegistryError.prototype = new Error();

var AuthenticationError = function(message) {
    this.name = "AuthenticationError";
    this.message = message || "";
};
AuthenticationError.prototype = new Error();


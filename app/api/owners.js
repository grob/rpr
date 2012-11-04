var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");

var response = require("../utils/response");
var {AuthenticationError, RegistryError} = require("../errors");
var {Package, User} = require("../model/all");
var registry = require("../registry");
var utils = require("../utils/utils");

var app = exports.app = new Application();
app.configure("route");

/**
 * Adds a new owner to a package
 */
app.put("/:pkgName/:ownerName", function(request, pkgName, ownerName) {
    var [username, password] = utils.getCredentials(request);
    var pkg = Package.getByName(pkgName);
    if (pkg == null) {
        return response.notfound({
            "message": "Package '" + pkgName + "' does not exist"
        });
    }
    var owner = User.getByName(ownerName);
    if (owner == null) {
        return response.bad({
            "message": "User '" + ownerName + "' does not exist"
        });
    }
    try {
        var user = registry.authenticate(username, password);
        registry.addOwner(pkg, owner, user);
        log.info("Added", owner, "to owners of", pkg);
        return response.ok({
            "message": "Added " + owner.name + " to list of owners of " + pkg.name
        });
    } catch (e if e instanceof RegistryError) {
        log.error("Unable to add", owner, "to owners of", pkg + ", reason:", e);
        return response.bad({
            "message": e.message
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.forbidden({
            "message": e.message
        });
    } catch (e) {
        return response.error({
            "message": e.message
        });
    }
});

/**
 * Removes a package owner
 */
app.del("/:pkgName/:ownerName", function(request, pkgName, ownerName) {
    var [username, password] = utils.getCredentials(request);
    var pkg = Package.getByName(pkgName);
    if (pkg == null) {
        return response.notfound({
            "message": "Package " + pkgName + " does not exist"
        });
    }
    var owner = User.getByName(ownerName);
    if (owner == null) {
        log.info("Owner", ownerName, "does not exist");
        return response.bad({
            "message": "User " + ownerName + " does not exist"
        });
    }
    try {
        var user = registry.authenticate(username, password);
        registry.removeOwner(pkg, owner, user);
        log.info("Removed", owner, "from list of owners of", pkg);
        return response.ok({
            "message": "Removed " + owner.name + " from list of owners of " + pkg.name
        });
    } catch (e if e instanceof RegistryError) {
        log.error("Unable to remove", owner, "from owners of", pkg + ", reason:", e);
        return response.bad({
            "message": e.message
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.forbidden({
            "message": e.message
        });
    } catch (e) {
        return response.error({
            "message": e.message
        });
    }
});

var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");

var response = require("../utils/response");
var {AuthenticationError} = require("../errors");
var {User} = require("../model/user");
var registry = require("../registry");
var utils = require("../utils/utils");

var app = exports.app = new Application();
app.configure("route");

/**
 * Returns true if a user with the given name exists
 */
app.get("/:username", function(request, username) {
    if (User.getByName(username) != null) {
        return response.ok(true);
    }
    log.info("User", username, "not found");
    return response.notfound({
        "message": "User '" + username + "' does not exist"
    });
});

/**
 * Returns the salt of the user
 */
app.get("/:username/salt", function(request, username) {
    var user = User.getByName(username);
    if (user != null) {
        return response.ok(user.salt);
    }
    log.info("Unknown user", username);
    return response.notfound({
        "message": "Unknown user"
    });
});

/**
 * Initiates the reset of a user's password
 */
app.post("/:username/reset", function(request, username) {
    var user = User.getByName(username);
    var email = request.postParams.email;
    if (user === null) {
        return response.notfound({
            "message": "Unknown user"
        });
    }
    try {
        registry.initPasswordReset(user, email);
        log.info("Sent password reset email to", email);
        return response.ok({
            "message": "An email has been sent to " + email +
                    ". Please follow the instructions therein to reset your password"
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.forbidden({
            "message": e.message
        });
    } catch (e) {
        log.error(e);
        return response.error({
            "message": e.message
        });
    }
});

/**
 * Sets a user's password
 */
app.post("/:username/password", function(request, username) {
    var user = User.getByName(username);
    var token = request.postParams.token;
    var password = request.postParams.password;
    if (user === null) {
        return response.notfound({
            "message": "Unknown user"
        });
    }
    try {
        registry.resetPassword(user, token, password);
        log.info("Reset password of", username, "using token", token);
        return response.ok({
            "message": "Your password has been reset"
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.forbidden({
            "message": e.message
        });
    } catch (e) {
        log.error(e);
        return response.error({
            "message": e.message
        });
    }
});

/**
 * Creates a new user account
 */
app.post("/", function(request) {
    var props = {};
    // basic evaluation
    for each (let propName in ["username", "password", "salt", "email"]) {
        var value = request.postParams[propName].trim();
        if (typeof(value) !== "string" || value.length < 1) {
            log.info("Unable to create user account,", propName,
                    "is missing or invalid");
            return response.error({
                "message": "Missing or invalid " + propName
            });
        }
        props[propName] = value;
    }
    if (User.getByName(props.username) !== null) {
        log.info("User", props.username, "already exists");
        return response.error({
            "message": "Please choose a different username"
        });
    }
    User.create(props.username, props.password, props.salt, props.email).save();
    log.info("Created new user account", props.username, "(" + props.email + ")");
    return response.ok({
        "message": "The user '" + props.username + " has been registered"
    });
});

/**
 * Changes a user's password
 */
app.post("/password", function(request) {
    var [username, password] = utils.getCredentials(request);
    var newPassword = request.postParams.password;
    try {
        var user = registry.authenticate(username, password);
        user.password = newPassword;
        user.save();
        log.info("Changed password of", username);
        return response.ok({
            "message": "Changed password"
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


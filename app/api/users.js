var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");

var response = require("ringo/jsgi/response");
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
        return response.json(true);
    }
    log.info("User", username, "not found");
    return response.json({
        "message": "User '" + username + "' does not exist"
    }).notfound();
});

/**
 * Returns the salt of the user
 */
app.get("/:username/salt", function(request, username) {
    var user = User.getByName(username);
    if (user != null) {
        return response.json(user.salt);
    }
    log.info("Unknown user", username);
    return response.json({
        "message": "Unknown user"
    }).notfound();
});

/**
 * Initiates the reset of a user's password
 */
app.post("/:username/reset", function(request, username) {
    var user = User.getByName(username);
    var email = request.postParams.email;
    if (user === null) {
        return response.json({
            "message": "Unknown user"
        }).notfound();
    }
    try {
        registry.initPasswordReset(user, email);
        log.info("Sent password reset email to", email);
        return response.json({
            "message": "An email has been sent to " + email +
                    ". Please follow the instructions therein to reset your password"
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.json({
            "message": e.message
        }).forbidden();
    } catch (e) {
        log.error(e);
        return response.json({
            "message": e.message
        }).error();
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
        return response.json({
            "message": "Unknown user"
        }).notfound();
    }
    try {
        registry.resetPassword(user, token, password);
        log.info("Reset password of", username, "using token", token);
        return response.json({
            "message": "Your password has been reset"
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.json({
            "message": e.message
        }).forbidden();
    } catch (e) {
        log.error(e);
        return response.json({
            "message": e.message
        }).error();
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
            return response.json({
                "message": "Missing or invalid " + propName
            }).error();
        }
        props[propName] = value;
    }
    if (User.getByName(props.username) !== null) {
        log.info("User", props.username, "already exists");
        return response.json({
            "message": "Please choose a different username"
        }).error();
    }
    User.create(props.username, props.password, props.salt, props.email).save();
    log.info("Created new user account", props.username, "(" + props.email + ")");
    return response.json({
        "message": "The user '" + props.username + "' has been registered"
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
        return response.json({
            "message": "Changed password"
        });
    } catch (e if e instanceof AuthenticationError) {
        log.info("Authentication failure of", username);
        return response.json({
            "message": e.message
        }).forbidden();
    } catch (e) {
        return response.json({
            "message": e.message
        }).error();
    }
});


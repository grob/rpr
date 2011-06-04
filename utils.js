var semver = require("ringo-semver");

export("parseAuthor", "evalDescriptor", "normalizeDescriptor");

var parseAuthor = function(str) {
    var result = {};
    var key = "name";
    var idx = 0;
    var buf = [];
    while (idx < str.length) {
        var c = str.charAt(idx);
        switch (c) {
            case "(":
            case "<":
                if (key !== null) {
                    result[key] = buf.join("").trim();
                }
                buf.length = 0;
                key = (c === "<") ? "email" : "web";
                break;
            case ")":
            case ">":
                if (key !== null) {
                    result[key] = buf.join("").trim();
                }
                buf.length = 0;
                key = null;
                break;
            default:
                if (key != null) {
                    buf.push(c);
                }
        }
        idx += 1;
    }
    if (buf.length > 0 && key !== null) {
        result[key] = buf.join("");
    }
    return result;
};

var evalDescriptor = function(descriptor) {
    if (!descriptor.name) {
        throw new Error("Missing package name");
    }
    if (!descriptor.version) {
        throw new Error("Missing version number");
    } else {
        try {
            descriptor.version = semver.cleanVersion(descriptor.version);
        } catch (e) {
            throw new Error("Invalid version number '" + descriptor.version + "'");
        }
    }
    if ((typeof(descriptor.author) !== "string" || descriptor.author.length < 1) &&
            (!descriptor.contributors || !(descriptor.contributors instanceof Array) ||
                    descriptor.contributors.length < 1)) {
        throw new Error("Missing author or initial contributor");
    }
    return descriptor;
};

var normalizeDescriptor = function(descriptor) {
    // parse author if it's a string
    if (descriptor.author != undefined && typeof descriptor.author === "string") {
        descriptor.author = parseAuthor(descriptor.author);
    }
    // parse contributors and maintainers
    for each (var key in ["contributors", "maintainers"]) {
        descriptor[key] = (descriptor[key] || []).map(function(author) {
            if (typeof author === "string") {
                return parseAuthor(author);
            }
            return author;
        });
    }
};

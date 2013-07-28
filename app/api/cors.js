var response = require("ringo/jsgi/response");

exports.json = function(obj, origin) {
    return response.json(obj).addHeaders({
        "Access-Control-Allow-Origin": origin || "*"
    });
};
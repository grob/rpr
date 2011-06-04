var log = require("ringo/logging").getLogger(module.id);
var {Application} = require("stick");
var config = require("./config");

require("ringo/logging").setConfig(getResource("./log4j.properties"));

var app = exports.app = require("./actions").app;
app.configure("static");
app.static(module.resolve("static"));
app.static(module.resolve("packages"));

//Script run from command line
if (require.main === module) {
    require('ringo/httpserver').main(module.id);
}


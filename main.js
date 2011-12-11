var strings = require("ringo/utils/strings");

require("ringo/logging").setConfig(getResource("./log4j.properties"));

var app = exports.app = require("./actions").app;
app.configure("static");
app.static(module.resolve("./static/"), "index.html");

//Script run from command line
if (require.main === module) {
    require('ringo/httpserver').main(module.id);
}

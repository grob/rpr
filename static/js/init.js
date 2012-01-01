require.config({
    "baseUrl": "js/"
});

define(function(require, exports, module) {
    var domReady = require("lib/domReady");
    var App = require("app").App;
    domReady(function() {
        window.app = (new App()).init();
    });
});


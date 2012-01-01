require.config({
   "baseUrl": "js"
});

require(["lib/domReady", "app"], function(domReady, module) {
    var app = new module.App();
    domReady(function() {
        app.init()
    });
});

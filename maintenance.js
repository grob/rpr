var {store, Package, Version, User, Author, RelPackageAuthor,
        RelPackageOwner, LogEntry} = require("./model");

var addOwners = function() {
    store.beginTransaction();
    for each (let pkg in Package.all()) {
        if (pkg.owners.length < 1) {
            var ownership = RelPackageOwner.create(pkg, pkg.creator, pkg.creator);
            ownership.save();
            console.log("Added", pkg.creator.name, "to owners of", pkg.name);
        }
    }
    store.commitTransaction();
};

if (require.main == module.id) {
    var method = system.args.pop();
    if (!method || typeof(this[method]) !== "function") {
        console.log("Please specify the method to execute");
        system.exit(1);
    }
    system.exit(this[method](system.args));
}
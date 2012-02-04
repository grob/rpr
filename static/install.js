var fs = require("fs");
var files = require("ringo/utils/files");
var {Stream} = require("io");
var {ZipFile} = require("ringo/zip");
var term = require("ringo/term");

var rpUrl = "http://rpr.nomatic.org/download/rp/latest";

var fail = function(message) {
    throw new Error(Array.prototype.join.call(arguments, " "));
};

var getUrlStream = function(url) {
    var conn = url.openConnection();
    var status = conn.getResponseCode();
    while (conn && status >= 301 && status <= 303) {
        for (var i = 1; ; i++) {
            var key = conn.getHeaderFieldKey(i);
            if (key == null || i == 50) {
                fail("Failed to follow redirect: Location header not found");
            }
            if (key.toLowerCase() == "location") {
                url = new java.net.URL(conn.getHeaderField(i));
                conn = url.openConnection();
                status = conn.getResponseCode();
                break;
            }
        }
    }
    return new Stream(conn.getInputStream());
};

var extract = function(zip, dir) {
    for each (var entry in zip.entries) {
        var entryPath = fs.join(dir, entry);
        if (zip.isDirectory(entry)) {
            fs.makeDirectory(entryPath);
        } else {
            var parent = fs.directory(entryPath);
            if (!fs.isDirectory(parent)) {
                 fs.makeTree(parent);
            }
            var dest = fs.openRaw(entryPath, {"write": true});
            zip.open(entry).copy(dest).close();
        }
        if (zip.getTime(entry) > -1) {
            fs.touch(entryPath, entry.time);
        }
    }
};

var installDir = fs.join(system.prefix, "packages.available");
var packagesDir = fs.join(system.prefix, "packages");
var url = new java.net.URL(rpUrl);
var temp = files.createTempFile("rp-install", ".zip");
var inStream = null;
var outStream = null;
try {
    term.writeln("Downloading", url, "...");
    outStream = fs.openRaw(temp, {"write": true});
    inStream = new Stream(getUrlStream(url));
    inStream.copy(outStream);
    var zip = new ZipFile(temp);
    var package = JSON.parse(zip.open("package.json").read().decodeToString("UTF-8"));
    var name = package.name || fail("package.json does not contain a package name");
    var version = package.version || fail("package.json does not contain a version number");

    var dir = fs.join(installDir, name + "-" + version);
    term.writeln("Installing", name, "in", dir, "...");
    if (fs.exists(dir)) {
        fail(name, "is already installed in", dir);
    } else {
        fs.makeTree(dir);
    }
    extract(zip, dir);
    zip.close();

    term.writeln("Activating", name, "...");
    var link = fs.join(packagesDir, name);
    if (fs.exists(link)) {
        if (!fs.isLink(link)) {
            fail(name, "has been copied into packages directory, please move it away manually");
        } else {
            fs.removeDirectory(link);
        }
    }
    var linkSrc = fs.relative(packagesDir + "/", dir);
    if (fs.symbolicLink(linkSrc, link) < 0) {
        fail("Unable to activate", name);
    }
    var bindir = fs.join(link, "bin");
    if (fs.isDirectory(bindir)) {
        var ringoBin = fs.join(system.prefix, "bin");
        for each (var bin in fs.list(bindir)) {
            var binfile = fs.join(bindir, bin);
            fs.changePermissions(binfile, 0755);
            fs.symbolicLink(binfile, fs.join(ringoBin, bin));
        }
    }
    fs.remove(temp);
    term.writeln(term.GREEN, "Successfully installed", name, term.RESET);
} catch (e) {
    term.writeln(term.RED, e.message, term.RESET);
} finally {
    if (inStream != null) {
        inStream.close();
    }
    if (outStream != null) {
        outStream.close();
    }
    if (fs.exists(temp)) {
        fs.remove(temp);
    }
}

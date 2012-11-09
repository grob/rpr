define(function() {

    var UNITS = ["bytes", "kB", "MB", "GB", "TB"];

    /**
     * Formats the file size into a human readable string
     * @param {Number} bytes The file size in bytes
     * @returns The human readable file size
     * @type String
     */
    var formatFileSize = function(bytes) {
        if (bytes > 0) {
            var e = Math.floor(Math.log(bytes) / Math.log(1024));
            return [(bytes / Math.pow(1024, e)).toFixed(1), UNITS[e]].join(" ");
        }
        return [bytes, UNITS[0]].join(" ");
    };

    return {
        "formatFileSize": formatFileSize
    };

});
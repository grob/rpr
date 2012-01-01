define(function(require, exports, module) {

    /**
     * Fills a string with another string up to a desired length
     * @param {String} string the string
     * @param {String} fill the filling string
     * @param {Number} length the desired length of the resulting string
     * @param {Number} mode the direction which the string will be padded in:
     * a negative number means left, 0 means both, a positive number means right
     * @returns String the resulting string
     */
    exports.pad = function(string, fill, length, mode) {
        if (fill == null || length == null) {
            return string;
        }
        var diff = length - string.length;
        if (diff == 0) {
            return string;
        }
        var left, right = 0;
        if (mode == null || mode > 0) {
            right = diff;
        } else if (mode < 0) {
            left = diff;
        } else if (mode == 0) {
            right = Math.round(diff / 2);
            left = diff - right;
        }
        var list = [];
        for (var i = 0; i < left; i++) {
            list[i] = fill;
        }
        list.push(string);
        for (i = 0; i < right; i++) {
            list.push(fill);
        }
        return list.join("");
    };

    exports.truncate = function(string, length, suffix) {
        if (string.length <= length) {
            return string;
        }
        return string.substring(0, length) + (suffix || "...");
    };

});

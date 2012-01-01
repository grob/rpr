define(function(require, exports, module) {

    var strings = require("./strings");

    var MONTH_NAMES = {
        "long": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        "short": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    };

    var DAY_NAMES = {
        "long": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "short": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    };

    var formatDate = function(date, fmtChar, multiplier) {
        switch (fmtChar) {
            case "G": // Era designator (eg. "AD")
                return date.getFullYear() < 0 ? "BC" : "AD"

            case "y": // Year (eg. "1996", "96")
                if (multiplier == 2) {
                    return String(date.getFullYear()).substring(2);
                } else {
                    return date.getFullYear();
                }

            case "M": // Month in year (eg. "Juli", "Jul", "07")
                if (multiplier < 3) {
                    return strings.pad(String(date.getMonth() + 1), "0", multiplier, -1);
                } else if (multiplier == 3) {
                    return MONTH_NAMES["short"][date.getMonth()];
                } else {
                    return MONTH_NAMES["long"][date.getMonth()];
                }

            case "w": // Week in year (eg. 27)
                return strings.pad(date.getWeekOfYear(), "0", multiplier, -1);

            case "W": // Week in month (eg. 2)
                var d = new Date(date.getTime());
                d.setDate(1);
                var fd = d.getDay() - 1;
                var dt = date.getDate() + fd - 1;
                return Math.floor(dt / 7) + 1;

            case "D": // Day in year (eg. 189)
                return strings.pad(String(date.getDayOfYear()), "0", multiplier, -1);

            case "d": // Day in month (eg. 10)
                return strings.pad(String(date.getDate()), "0", multiplier, -1);

            case "F": // Day of week in month (eg. 2)
                return strings.pad(String(date.getDay()), "0", multiplier, -1);

            case "E": // Day in week (eg. "Tuesday", "Tue")
                return DAY_NAMES[(multiplier >= 4) ? "long" : "short"][date.getDay()];

            case "a": // Am/pm marker (eg. "PM")
                return (date.getHours() < 12) ? "AM" : "PM";

            case "H": // Hour in day (0-23)
                return strings.pad(String(date.getHours()), "0", multiplier, -1);

            case "k": // Hour in day (1-24)
                return strings.pad(String(1 + date.getHours()), "0", multiplier, -1);

            case "K": // Hour in am/pm (0-11)
                var hours = date.getHours();
                if (hours > 12) {
                    hours -= 12;
                }
                return strings.pad(String(hours), "0", multiplier, -1);

            case "h": // Hour in am/pm (1-12)
                var hours = date.getHours();
                if (hours > 12) {
                    hours -= 12;
                }
                return strings.pad(String(hours + 1), "0", multiplier, -1);

            case "m": // Minute in hour (eg. 30)
                return strings.pad(String(date.getMinutes()), "0", multiplier, -1);

            case "s": // Second in minute (eg. 55)
                return strings.pad(String(date.getSeconds()), "0", multiplier, -1);

            case "S": // Millisecond (eg. 978)
                return strings.pad(String(date.getMilliseconds()), "0", multiplier, -1);

            case "z": // Time zone (eg. "Pacific Standard Time", "PST", "GMT-08:00")
                var offset = -(date.getTimezoneOffset());
                return "GMT" + ((offset > 0) ? "+" : "-")
                         + String(Math.abs(offset / 60)).padLeft("0", 2)
                         + ":" + strings.pad(String(offset - Math.floor(offset / 60) * 60), "0", 2, -1);

            case "Z": // Time zone (RFC 822)
                var offset = -(date.getTimezoneOffset());
                return ((offset > 0) ? "+" : "-") + offset;

            default: // unknown format character
                var buf = [];
                var cnt = 0;
                while (cnt++ < multiplier) {
                    buf.push(fmtChar);
                }
                return buf.join("");
        }
        return;
    };

    /**
     * Formats the date passed as argument into a string
     * @param {Date} date The date to format. Passing the milliseconds of a date
     * is also allowed for convenience
     * @param {String} pattern The formatting pattern
     * @returns The formatted string
     * @type String
     */
    exports.format = function(date, pattern) {
        if (date == undefined) {
            return "";
        } else if (date.constructor !== Date) {
            var millis = parseInt(date, 10);
            if (isNaN(millis) == true) {
                return "";
            }
            date = new Date(millis);
        }

        var result = [];
        // parse the formatting pattern
        var idx = 0;
        var useLiteral = false;
        var c, p, multiplier;
        while (idx < pattern.length) {
            c = pattern.charAt(idx++);
            if (/['"]/.test(c)) {
                useLiteral = !useLiteral;
                continue;
            }
            if (useLiteral == true) {
                result.push(c);
            } else {
                multiplier = 1;
                while (idx < pattern.length && pattern.charAt(idx) == c) {
                    multiplier += 1;
                    idx += 1;
                }
                result.push(formatDate(date, c, multiplier));
            }
        }
        return result.join("");
    };

});

/**
 * @license RequireJS domReady 1.0.0 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */

/**
 * @license RequireJS domReady 1.0.0 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
/*jslint strict: false, plusplus: false */
/*global require: false, define: false, requirejs: false,
  window: false, clearInterval: false, document: false,
  self: false, setInterval: false */


define('lib/domReady',[],function () {
    var isBrowser = typeof window !== "undefined" && window.document,
        isPageLoaded = !isBrowser,
        doc = isBrowser ? document : null,
        readyCalls = [],
        readyLoaderCalls = [],
        //Bind to a specific implementation, but if not there, try a
        //a generic one under the "require" name.
        req = requirejs || require || {},
        oldResourcesReady = req.resourcesReady,
        scrollIntervalId;

    function runCallbacks(callbacks) {
        for (var i = 0, callback; (callback = callbacks[i]); i++) {
            callback(doc);
        }
    }

    function callReady() {
        var callbacks = readyCalls,
            loaderCallbacks = readyLoaderCalls;

        if (isPageLoaded) {
            //Call the DOM ready callbacks
            if (callbacks.length) {
                readyCalls = [];
                runCallbacks(callbacks);
            }

            //Now handle DOM ready + loader ready callbacks.
            if (req.resourcesDone && loaderCallbacks.length) {
                readyLoaderCalls = [];
                runCallbacks(loaderCallbacks);
            }
        }
    }

    /**
     * Add a method to require to get callbacks if there are loader resources still
     * being loaded. If so, then hold off calling "withResources" callbacks.
     *
     * @param {Boolean} isReady: pass true if all resources have been loaded.
     */
    if ('resourcesReady' in req) {
        req.resourcesReady = function (isReady) {
            //Call the old function if it is around.
            if (oldResourcesReady) {
                oldResourcesReady(isReady);
            }

            if (isReady) {
                callReady();
            }
        };
    }

    /**
     * Sets the page as loaded.
     */
    function pageLoaded() {
        if (!isPageLoaded) {
            isPageLoaded = true;
            if (scrollIntervalId) {
                clearInterval(scrollIntervalId);
            }

            callReady();
        }
    }

    if (isBrowser) {
        if (document.addEventListener) {
            //Standards. Hooray! Assumption here that if standards based,
            //it knows about DOMContentLoaded.
            document.addEventListener("DOMContentLoaded", pageLoaded, false);
            window.addEventListener("load", pageLoaded, false);
        } else if (window.attachEvent) {
            window.attachEvent("onload", pageLoaded);

            //DOMContentLoaded approximation, as found by Diego Perini:
            //http://javascript.nwbox.com/IEContentLoaded/
            if (self === self.top) {
                scrollIntervalId = setInterval(function () {
                    try {
                        //From this ticket:
                        //http://bugs.dojotoolkit.org/ticket/11106,
                        //In IE HTML Application (HTA), such as in a selenium test,
                        //javascript in the iframe can't see anything outside
                        //of it, so self===self.top is true, but the iframe is
                        //not the top window and doScroll will be available
                        //before document.body is set. Test document.body
                        //before trying the doScroll trick.
                        if (document.body) {
                            document.documentElement.doScroll("left");
                            pageLoaded();
                        }
                    } catch (e) {}
                }, 30);
            }
        }

        //Check if document already complete, and if so, just trigger page load
        //listeners.
        if (document.readyState === "complete") {
            pageLoaded();
        }
    }

    /** START OF PUBLIC API **/

    /**
     * Registers a callback for DOM ready. If DOM is already ready, the
     * callback is called immediately.
     * @param {Function} callback
     */
    function domReady(callback) {
        if (isPageLoaded) {
            callback(doc);
        } else {
            readyCalls.push(callback);
        }
        return domReady;
    }

    /**
     * Callback that waits for DOM ready as well as any outstanding
     * loader resources. Useful when there are implicit dependencies.
     * This method should be avoided, and always use explicit
     * dependency resolution, with just regular DOM ready callbacks.
     * The callback passed to this method will be called immediately
     * if the DOM and loader are already ready.
     * @param {Function} callback
     */
    domReady.withResources = function (callback) {
        if (isPageLoaded && req.resourcesDone) {
            callback(doc);
        } else {
            readyLoaderCalls.push(callback);
        }
        return domReady;
    };

    domReady.version = '1.0.0';

    /**
     * Loader Plugin API method
     */
    domReady.load = function (name, req, onLoad, config) {
        if (config.isBuild) {
            onLoad(null);
        } else {
            domReady(onLoad);
        }
    };

    /** END OF PUBLIC API **/

    return domReady;
});

/*
 *  Copyright 2011 Twitter, Inc.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

define('lib/hogan',['require','exports','module'],function(require, exports, module) {

var HoganTemplate = (function () {

  function constructor(text) {
    this.text = text;
  }

  constructor.prototype = {

    // render: replaced by generated code.
    r: function (context, partials, indent) { return ''; },

    // variable escaping
    v: hoganEscape,

    render: function render(context, partials, indent) {
      return this.r(context, partials, indent);
    },

    // tries to find a partial in the curent scope and render it
    rp: function(name, context, partials, indent) {
      var partial = partials[name];

      if (!partial) {
        return '';
      }

      return partial.r(context, partials, indent);
    },

    // render a section
    rs: function(context, partials, section) {
      var buf = '',
          tail = context[context.length - 1];

      if (!isArray(tail)) {
        return buf = section(context, partials);
      }

      for (var i = 0; i < tail.length; i++) {
        context.push(tail[i]);
        buf += section(context, partials);
        context.pop();
      }

      return buf;
    },

    // maybe start a section
    s: function(val, ctx, partials, inverted, start, end, tags) {
      var pass;

      if (isArray(val) && val.length === 0) {
        return false;
      }

      if (!inverted && typeof val == 'function') {
        val = this.ls(val, ctx, partials, start, end, tags);
      }

      pass = (val === '') || !!val;

      if (!inverted && pass && ctx) {
        ctx.push((typeof val == 'object') ? val : ctx[ctx.length - 1]);
      }

      return pass;
    },

    // find values with dotted names
    d: function(key, ctx, partials, returnFound) {

      var names = key.split('.'),
          val = this.f(names[0], ctx, partials, returnFound),
          cx = null;

      if (key === '.' && isArray(ctx[ctx.length - 2])) {
        return ctx[ctx.length - 1];
      }

      for (var i = 1; i < names.length; i++) {
        if (val && typeof val == 'object' && names[i] in val) {
          cx = val;
          val = val[names[i]];
        } else {
          val = '';
        }
      }

      if (returnFound && !val) {
        return false;
      }

      if (!returnFound && typeof val == 'function') {
        ctx.push(cx);
        val = this.lv(val, ctx, partials);
        ctx.pop();
      }

      return val;
    },

    // find values with normal names
    f: function(key, ctx, partials, returnFound) {
      var val = false,
          v = null,
          found = false;

      for (var i = ctx.length - 1; i >= 0; i--) {
        v = ctx[i];
        if (v && typeof v == 'object' && key in v) {
          val = v[key];
          found = true;
          break;
        }
      }

      if (!found) {
        return (returnFound) ? false : "";
      }

      if (!returnFound && typeof val == 'function') {
        val = this.lv(val, ctx, partials);
      }

      return val;
    },

    // higher order templates
    ho: function(val, cx, partials, text, tags) {
      var t = val.call(cx, text, function(t) {
        return Hogan.compile(t, {delimiters: tags}).render(cx, partials);
      });
      var s = Hogan.compile(t.toString(), {delimiters: tags}).render(cx, partials);
      this.b = s;
      return false;
    },

    // higher order template result buffer
    b: '',

    // lambda replace section
    ls: function(val, ctx, partials, start, end, tags) {
      var cx = ctx[ctx.length - 1],
          t = val.call(cx);

      if (val.length > 0) {
        return this.ho(val, cx, partials, this.text.substring(start, end), tags);
      }

      if (typeof t == 'function') {
        return this.ho(t, cx, partials, this.text.substring(start, end), tags);
      }

      return t;
    },

    // lambda replace variable
    lv: function(val, ctx, partials) {
      var cx = ctx[ctx.length - 1];
      return Hogan.compile(val.call(cx).toString()).render(cx, partials);
    }

  };

  var rAmp = /&/g,
      rLt = /</g,
      rGt = />/g,
      rApos =/\'/g,
      rQuot = /\"/g,
      hChars =/[&<>\"\']/;

  function hoganEscape(str) {
    str = String(str === null ? '' : str);
    return hChars.test(str) ?
      str
        .replace(rAmp,'&amp;')
        .replace(rLt,'&lt;')
        .replace(rGt,'&gt;')
        .replace(rApos,'&#39;')
        .replace(rQuot, '&quot;') :
      str;
  }

  var isArray = Array.isArray || function(a) {
    return Object.prototype.toString.call(a) === '[object Array]';
  };

  return constructor;

})();

var Hogan = (function () {

  // Setup regex  assignments
  // remove whitespace according to Mustache spec
  var rIsWhitespace = /\S/,
      rQuot = /\"/g,
      rNewline =  /\n/g,
      rCr = /\r/g,
      rSlash = /\\/g,
      tagTypes = {
        '#': 1, '^': 2, '/': 3,  '!': 4, '>': 5,
        '<': 6, '=': 7, '_v': 8, '{': 9, '&': 10
      };

  function scan(text, delimiters) {
    var len = text.length,
        IN_TEXT = 0,
        IN_TAG_TYPE = 1,
        IN_TAG = 2,
        state = IN_TEXT,
        tagType = null,
        tag = null,
        buf = '',
        tokens = [],
        seenTag = false,
        i = 0,
        lineStart = 0,
        otag = '{{',
        ctag = '}}';

    function addBuf() {
      if (buf.length > 0) {
        tokens.push(new String(buf));
        buf = '';
      }
    }

    function lineIsWhitespace() {
      var isAllWhitespace = true;
      for (var j = lineStart; j < tokens.length; j++) {
        isAllWhitespace =
          (tokens[j].tag && tagTypes[tokens[j].tag] < tagTypes['_v']) ||
          (!tokens[j].tag && tokens[j].match(rIsWhitespace) === null);
        if (!isAllWhitespace) {
          return false;
        }
      }

      return isAllWhitespace;
    }

    function filterLine(haveSeenTag, noNewLine) {
      addBuf();

      if (haveSeenTag && lineIsWhitespace()) {
        for (var j = lineStart, next; j < tokens.length; j++) {
          if (!tokens[j].tag) {
            if ((next = tokens[j+1]) && next.tag == '>') {
              // set indent to token value
              next.indent = tokens[j].toString()
            }
            tokens.splice(j, 1);
          }
        }
      } else if (!noNewLine) {
        tokens.push({tag:'\n'});
      }

      seenTag = false;
      lineStart = tokens.length;
    }

    function changeDelimiters(text, index) {
      var close = '=' + ctag,
          closeIndex = text.indexOf(close, index),
          delimiters = trim(
            text.substring(text.indexOf('=', index) + 1, closeIndex)
          ).split(' ');

      otag = delimiters[0];
      ctag = delimiters[1];

      return closeIndex + close.length - 1;
    }

    if (delimiters) {
      delimiters = delimiters.split(' ');
      otag = delimiters[0];
      ctag = delimiters[1];
    }

    for (i = 0; i < len; i++) {
      if (state == IN_TEXT) {
        if (tagChange(otag, text, i)) {
          --i;
          addBuf();
          state = IN_TAG_TYPE;
        } else {
          if (text.charAt(i) == '\n') {
            filterLine(seenTag);
          } else {
            buf += text.charAt(i);
          }
        }
      } else if (state == IN_TAG_TYPE) {
        i += otag.length - 1;
        tag = tagTypes[text.charAt(i + 1)];
        tagType = tag ? text.charAt(i + 1) : '_v';
        if (tagType == '=') {
          i = changeDelimiters(text, i);
          state = IN_TEXT;
        } else {
          if (tag) {
            i++;
          }
          state = IN_TAG;
        }
        seenTag = i;
      } else {
        if (tagChange(ctag, text, i)) {
          tokens.push({tag: tagType, n: trim(buf), otag: otag, ctag: ctag,
                       i: (tagType == '/') ? seenTag - ctag.length : i + otag.length});
          buf = '';
          i += ctag.length - 1;
          state = IN_TEXT;
          if (tagType == '{') {
            i++;
          }
        } else {
          buf += text.charAt(i);
        }
      }
    }

    filterLine(seenTag, true);

    return tokens;
  }

  function trim(s) {
    if (s.trim) {
      return s.trim();
    }

    return s.replace(/^\s*|\s*$/g, '');
  }

  function tagChange(tag, text, index) {
    if (text.charAt(index) != tag.charAt(0)) {
      return false;
    }

    for (var i = 1, l = tag.length; i < l; i++) {
      if (text.charAt(index + i) != tag.charAt(i)) {
        return false;
      }
    }

    return true;
  }

  function buildTree(tokens, kind, stack, customTags) {
    var instructions = [],
        opener = null,
        token = null;

    while (tokens.length > 0) {
      token = tokens.shift();
      if (token.tag == '#' || token.tag == '^' || isOpener(token, customTags)) {
        stack.push(token);
        token.nodes = buildTree(tokens, token.tag, stack, customTags);
        instructions.push(token);
      } else if (token.tag == '/') {
        if (stack.length === 0) {
          throw new Error('Closing tag without opener: /' + token.n);
        }
        opener = stack.pop();
        if (token.n != opener.n && !isCloser(token.n, opener.n, customTags)) {
          throw new Error('Nesting error: ' + opener.n + ' vs. ' + token.n);
        }
        opener.end = token.i;
        return instructions;
      } else {
        instructions.push(token);
      }
    }

    if (stack.length > 0) {
      throw new Error('missing closing tag: ' + stack.pop().n);
    }

    return instructions;
  }

  function isOpener(token, tags) {
    for (var i = 0, l = tags.length; i < l; i++) {
      if (tags[i].o == token.n) {
        token.tag = '#';
        return true;
      }
    }
  }

  function isCloser(close, open, tags) {
    for (var i = 0, l = tags.length; i < l; i++) {
      if (tags[i].c == close && tags[i].o == open) {
        return true;
      }
    }
  }

  function generate(tree, text, options) {
    var code = 'i = i || "";var c = [cx];var b = i + "";var _ = this;'
      + walk(tree)
      + 'return b;';

    if (options.asString) {
      return 'function(cx,p,i){' + code + ';}';
    }

    var template = new HoganTemplate(text);
    template.r = new Function('cx', 'p', 'i', code);
    return template;
  }

  function esc(s) {
    return s.replace(rSlash, '\\\\')
            .replace(rQuot, '\\\"')
            .replace(rNewline, '\\n')
            .replace(rCr, '\\r');
  }

  function chooseMethod(s) {
    return (~s.indexOf('.')) ? 'd' : 'f';
  }

  function walk(tree) {
    var code = '';
    for (var i = 0, l = tree.length; i < l; i++) {
      var tag = tree[i].tag;
      if (tag == '#') {
        code += section(tree[i].nodes, tree[i].n, chooseMethod(tree[i].n),
                        tree[i].i, tree[i].end, tree[i].otag + " " + tree[i].ctag);
      } else if (tag == '^') {
        code += invertedSection(tree[i].nodes, tree[i].n,
                                chooseMethod(tree[i].n));
      } else if (tag == '<' || tag == '>') {
        code += partial(tree[i]);
      } else if (tag == '{' || tag == '&') {
        code += tripleStache(tree[i].n, chooseMethod(tree[i].n));
      } else if (tag == '\n') {
        code += text('"\\n"' + (tree.length-1 == i ? '' : ' + i'));
      } else if (tag == '_v') {
        code += variable(tree[i].n, chooseMethod(tree[i].n));
      } else if (tag === undefined) {
        code += text('"' + esc(tree[i]) + '"');
      }
    }
    return code;
  }

  function section(nodes, id, method, start, end, tags) {
    return 'if(_.s(_.' + method + '("' + esc(id) + '",c,p,1),' +
           'c,p,0,' + start + ',' + end + ', "' + tags + '")){' +
           'b += _.rs(c,p,' +
           'function(c,p){ var b = "";' +
           walk(nodes) +
           'return b;});c.pop();}' +
           'else{b += _.b; _.b = ""};';
  }

  function invertedSection(nodes, id, method) {
    return 'if (!_.s(_.' + method + '("' + esc(id) + '",c,p,1),c,p,1,0,0,"")){' +
           walk(nodes) +
           '};';
  }

  function partial(tok) {
    return 'b += _.rp("' +  esc(tok.n) + '",c[c.length - 1],p,"' + (tok.indent || '') + '");';
  }

  function tripleStache(id, method) {
    return 'b += (_.' + method + '("' + esc(id) + '",c,p,0));';
  }

  function variable(id, method) {
    return 'b += (_.v(_.' + method + '("' + esc(id) + '",c,p,0)));';
  }

  function text(id) {
    return 'b += ' + id + ';';
  }

  return ({
    scan: scan,

    parse: function(tokens, options) {
      options = options || {};
      return buildTree(tokens, '', [], options.sectionTags || []);
    },

    cache: {},

    compile: function(text, options) {
      // options
      //
      // asString: false (default)
      //
      // sectionTags: [{o: '_foo', c: 'foo'}]
      // An array of object with o and c fields that indicate names for custom
      // section tags. The example above allows parsing of {{_foo}}{{/foo}}.
      //
      // delimiters: A string that overrides the default delimiters.
      // Example: "<% %>"
      //
      options = options || {};

      var t = this.cache[text];

      if (t) {
        return t;
      }

      t = generate(this.parse(scan(text, options.delimiters), options), text, options);
      return this.cache[text] = t;
    }
  });
})();

// Export the hogan constructor for Node.js and CommonJS.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Hogan;
  module.exports.Template = HoganTemplate;
} else if (typeof define === 'function' && define.amd) {
  define(function () { return Hogan; });
} else if (typeof exports !== 'undefined') {
  exports.Hogan = Hogan;
  exports.HoganTemplate = HoganTemplate;
}

});

define('lib/utils/strings',['require','exports','module'],function(require, exports, module) {

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

define('lib/utils/dates',['require','exports','module','./strings'],function(require, exports, module) {

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

    /**
     * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
     * © 2011 Colin Snover <http://zetafleet.com>
     * Released under MIT license.
     *
     * 20120101 (robert@nomatic.org): modified to not overwrite Date.parse as the original
     *          library did.
     */
    exports.parse = function(date) {
        var numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
        var struct, minutesOffset = 0;

        // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
        // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
        // implementations could be faster
        //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
        if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
            // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
            for (var i = 0, k; (k = numericKeys[i]); ++i) {
                struct[k] = +struct[k] || 0;
            }

            // allow undefined days and months
            struct[2] = (+struct[2] || 1) - 1;
            struct[3] = +struct[3] || 1;

            if (struct[8] !== 'Z' && struct[9] !== undefined) {
                minutesOffset = struct[10] * 60 + struct[11];

                if (struct[9] === '+') {
                    minutesOffset = 0 - minutesOffset;
                }
            }

            return Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
        } else {
            return Date.parse(date);
        }
    };


});

define('lib/utils/numbers',['require','exports','module'],function(require, exports, module) {

    var UNITS = ["bytes", "kB", "MB", "GB", "TB"];

    /**
     * Formats the file size into a human readable string
     * @param {Number} bytes The file size in bytes
     * @returns The human readable file size
     * @type String
     */
    exports.formatFileSize = function(bytes) {
        if (bytes > 0) {
            var e = Math.floor(Math.log(bytes) / Math.log(1024));
            return [(bytes / Math.pow(1024, e)).toFixed(1), UNITS[e]].join(" ");
        }
        return [bytes, UNITS[0]].join(" ");
    };

});

define('views/view.package',['require','exports','module','lib/hogan','lib/utils/dates','lib/utils/numbers'],function(require, exports, module) {

    var hogan = require("lib/hogan");

    var dates = require("lib/utils/dates");
    var numbers = require("lib/utils/numbers");

    // lambdas needed for rendering the template
    var lambdas = {
        "formatDate": function() {
            return function(str, render) {
                return dates.format(dates.parse(render(str)), "dd.MM.yyyy HH:mm");
            }
        },
        "formatFileSize": function() {
            return function(bytes, render) {
                return numbers.formatFileSize(render(bytes));
            }
        }
    };

    var PackageView = exports.PackageView = Backbone.View.extend({
        "tagName": "li",
        "events": {
            "click .menu li": "toggle",
            "click .checksums": "toggleChecksums",
            "click": "toggleTabs"
        },
        "initialize": function() {
            this.model.bind("change", this.render, this);
            this.template = hogan.compile(document.getElementById("tmpl-package").innerHTML);
        }

    });

    PackageView.prototype.render = function() {
        var ctx = _.extend(this.model.toJSON(), lambdas);
        if (ctx.dependencies != null) {
            ctx.dependencies = _.map(_.keys(ctx.dependencies), function(key) {
                return {
                    "name": key,
                    "version": ctx.dependencies[key]
                };
            });
        }
        $(this.el).append(this.template.render(ctx));
        return this;
    };

    PackageView.prototype.toggleTabs = function(event) {
        if ($(event.target).is("a")) {
            return true;
        }
        var $expanded = $(".menu li.expanded", this.el);
        if ($expanded.length == 0) {
            $(".menu li:first-child", this.el).trigger("click");
        } else if ($expanded.length > 0 && $expanded.next().length < 1) {
            $expanded.trigger("click");
        } else {
            $expanded.next().trigger("click");
        }
        return false;
    };

    PackageView.prototype.toggleChecksums = function(event) {
        var $toggler = $(event.target).toggleClass("expanded");
        $toggler.next("dd.checksums").fadeToggle();
        return false;
    };

    PackageView.prototype.toggle = function(event) {
        var $item = $(event.target);
        $item.toggleClass("expanded").siblings().removeClass("expanded");
        $(this.el).toggleClass("selected", $item.hasClass("expanded"));
        var $lists = $item.parent().nextAll("dl").removeClass("expanded");
        if ($item.hasClass("expanded")) {
            $lists.filter($item.data("display")).addClass("expanded");
        }
        return false;
    };

});

define('models/model.version',['require','exports','module'],function(require, exports, module) {

    var Version = exports.Version = Backbone.Model.extend({});

});

define('collections/collection.versions',['require','exports','module','models/model.version'],function(require, exports, module) {

    var Version = require("models/model.version").Version;

    var Versions = exports.Versions = Backbone.Collection.extend({
        "model": Version
    });

});

define('models/model.package',['require','exports','module','collections/collection.versions'],function(require, exports, module) {

    var Versions = require("collections/collection.versions").Versions;

    var Package = exports.Package = Backbone.MappedModel.extend({
        "mapping": {
            "versions": Versions
        }
    });

});

define('views/view.list',['require','exports','module','views/view.package','models/model.package'],function(require, exports, module) {

    var PackageView = require("views/view.package").PackageView;
    var Package = require("models/model.package").Package;

    var ListView = exports.ListView = Backbone.View.extend({
        "el": "#list",
        "$result": $("#result", this.el),
        "$loadmore": $("#loadmore", this.el).hide(),

        "events": {
            "click #loadmore": "loadMore"
        },

        "initialize": function() {
            this.collection.bind("reset", this.clearList, this);
            this.collection.bind("fetched", this.onLoaded, this);
        }
    });

    ListView.prototype.clearList = function() {
        this.$result.empty();
    };

    ListView.prototype.onLoaded = function() {
        this.$loadmore.removeClass("active");
        var items = this.collection.rest(this.collection.offset).map(function(package) {
            var packageView = new PackageView({
                "model": package
            });
            return packageView.render().el;
        });
        this.$result.append($(items).hide().fadeIn(300));
        $(items[0]).addClass("pageborder");
        this.$loadmore.toggle(this.collection.hasMore());
    };

    ListView.prototype.loadMore = function(event) {
        event.preventDefault();
        this.$loadmore.addClass("active");
        this.collection.fetch({
            "add": true,
            "data": _.extend(this.getUrlParameters(), {
                "o": this.collection.length
            })
        });
    };

    ListView.prototype.getUrlParameters = function() {
        return {
            "q": this.query,
            "l": this.perPage
        };
    };

    ListView.prototype.search = function(q, perPage) {
        this.query = q || "";
        this.perPage = perPage;
        this.offset = 0;
        this.collection.fetch({
            "data": this.getUrlParameters()
        });
    };

    ListView.prototype.single = function(name) {
        (new Package()).fetch({
            "url": "/packages/" + name + "/",
            "success": $.proxy(function(model) {
                var packageView = new PackageView({
                    "model": model
                });
                $(packageView.render().el)
                    .appendTo(this.$result.empty())
                    .addClass("selected").triggerHandler("click");
            }, this)
        });
    };

});

define('views/view.main',['require','exports','module','views/view.list'],function(require, exports, module) {

    var ListView = require("views/view.list").ListView;
    var timeoutId = null;

    var MainView = exports.MainView = Backbone.View.extend({
        "el": "#main",
        "$searchInput": $("#search", this.el),

        "events": {
            "keyup #search": "handleInput"
        },

        "initialize": function() {
            this.listView = new ListView({
                "collection": this.collection
            });
            this.collection.bind("fetching", this.onLoading, this);
            this.collection.bind("fetched", this.onLoaded, this);
            this.query = this.$searchInput.val();
            return this;
        }

    });

    MainView.prototype.onLoading = function() {
        this.$searchInput.addClass("active");
    };

    MainView.prototype.onLoaded = function() {
        this.$searchInput.removeClass("active");
    };

    MainView.prototype.handleInput = function(event) {
        var q = this.$searchInput.val();
        if (event.keyCode === 13) {
            // immediate search when pressing enter key
            window.clearTimeout(timeoutId);
            window.location.hash = "#!/search/" + q;
        }
    };

    MainView.prototype.setDocTitle = function() {
        var docTitle = window.document.title;
        docTitle = docTitle.split(":").slice(0, 1);
        if (this.query.length > 0) {
            docTitle.push("'" + this.query + "'");
        }
        window.document.title = docTitle.join(": ");
    };

    MainView.prototype.search = function(q, limit) {
        this.query = q || "";
        this.$searchInput.val(this.query).focus();
        this.setDocTitle();
        this.listView.search(this.query, 20);
    };

    MainView.prototype.single = function(name) {
        this.query = name || "";
        this.$searchInput.val("").blur();
        this.setDocTitle();
        this.listView.single(name);
    };

});

define('collections/collection.packages',['require','exports','module','models/model.package'],function(require, exports, module) {

    var Package = require("models/model.package").Package;

    var Packages = exports.Packages = Backbone.Collection.extend({
        "url": "/search",
        "model": Package,
        "initialize": function() {
            this.total = 0;
            this.offset = 0;
        }
    });

    /**
     * Overwriting fetch to fire custom events "fetching" and "fetched"
     * @param options
     */
    Packages.prototype.fetch = function (options) {
        typeof(options) != 'undefined' || (options = {});
        this.trigger("fetching");
        options = options || {};
        var success = options.success;
        options.success = function(collection, response) {
            collection.trigger("fetched");
            if (success) {
                success(collection, response);
            }
        };
        return Backbone.Collection.prototype.fetch.call(this, options);
    };

    Packages.prototype.hasMore = function() {
        return this.total > this.length;
    };

    Packages.prototype.reset = function(models, options) {
        this.total = models.length;
        this.offset = 0;
        return Backbone.Collection.prototype.reset.apply(this, arguments);
    };

    Packages.prototype.parse = function(response) {
        this.total = response.total;
        this.offset = response.offset;
        this.perPage = response.length;
        return _.map(response.hits, function(pkgData) {
            return Package.prototype.parse.call(null, pkgData);
        });
    };

});

define('app',['require','exports','module','views/view.main','collections/collection.packages'],function(require, exports, module) {

    var MainView = require("views/view.main").MainView;
    var Packages = require("collections/collection.packages").Packages;

    var App = exports.App = Backbone.Router.extend({

        "routes": {
           "!/packages/:name": "single",
           "!/search/*q": "search",
            "": "index"
        },

        "init": function(settings) {
            this.mainView = new MainView({
                "collection": new Packages()
            }).render();
            Backbone.history.start();
            return this;
        }

    });

    App.prototype.index = function() {
        this.mainView.search();
    };

    App.prototype.search = function(q) {
        this.mainView.search(q);
    };

    App.prototype.single = function(name) {
        this.mainView.single(name);
    };

});

require.config({
    "baseUrl": "js/"
});

define('init',['require','exports','module','lib/domReady','app'],function(require, exports, module) {
    var domReady = require("lib/domReady");
    var App = require("app").App;
    domReady(function() {
        window.app = (new App()).init();
    });
});


/**
 * @fileoverview JSGI Response Helpers
 */

exports.redirect = function(path) {
   return {
      status: 302,
      headers: {
          "Location": path
      },
      body: []
   };
};

exports.ok = function(body) {
   return {
      status: 200,
      headers: {
          "Content-Type": "application/json"
      },
      body: [JSON.stringify(body)]
   };
};

exports.error = function(body) {
   return {
      status: 500,
      headers: {
          "Content-Type": "application/json"
      },
      body: [JSON.stringify(body)]
   };
};

exports.notfound = function(body) {
   return {
      status: 404,
      headers: {
          "Content-Type": "application/json"
      },
      body: [JSON.stringify(body)]
   };
};

exports.static = require("ringo/jsgi/response").static;
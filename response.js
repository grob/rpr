/**
 * @fileoverview JSGI Response Helpers
 */

export("redirect", "ok", "error", "notfound");

function redirect(path) {
   return {
      status: 302,
      headers: {
          "Location": path
      },
      body: []
   };
};

function ok(body) {
   return {
      status: 200,
      headers: {
          "Content-Type": "application/json"
      },
      body: [JSON.stringify(body)]
   };
};

function error(body) {
   return {
      status: 500,
      headers: {
          "Content-Type": "application/json"
      },
      body: [JSON.stringify(body)]
   };
};

function notfound(body) {
   return {
      status: 404,
      headers: {
          "Content-Type": "application/json"
      },
      body: [JSON.stringify(body)]
   };
};

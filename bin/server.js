#!/usr/bin/env node

/**
 * @type {any}
 */
const WebSocket = require("ws");
const http = require("http");
const wss = new WebSocket.Server({ noServer: true });
const utils = require("./utils.js");
const setupWSConnection = require("./utils.js").setupWSConnection;
const ccAuth = require("./cc-auth");
const host = process.env.HOST || "localhost";
const port = process.env.PORT || 1234;

const allowList = [
  "https://teddavis.org",
  "http://localhost:8080",
  "https://cocodingclassroom.cc",
];

const server = http.createServer((request, response) => {
  switch (request.url) {
    // for /stats

    default:
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("okay");
  }
});

wss.on("connection", setupWSConnection);

const classrooms = new Map();

server.on("upgrade", (request, socket, head) => {
  /**
   * @param {any} ws
   */
  const handleAuth = (ws) => {
    const baseURL = "https://" + request.headers.host + "/";
    const url = new URL(request.url, baseURL);
    const query = new URLSearchParams(url.search);

    // console.log(request.connection.localAddress)

    // set auth if first time access
    if (query.has("authID") && query.has("authSet")) {
      let authID = query.get("authID");
      let authSet = query.get("authSet");

      let authHash = authSet; // ccAuth.hash(authID.toString(), authSet) // authSet//
      if (!classrooms.has(authID)) {
        classrooms.set(authID, authHash);
        // console.log(['setup', authID, authSet, classrooms.get(authID), authHash])
        wss.emit("connection", ws, request);
      }
    } else if (query.has("authID") && query.has("auth")) {
      let authID = query.get("authID");
      let auth = query.get("auth");
      let authHash = auth; // ccAuth.hash(authID.toString(), auth)  //
      // console.log(['auth', authID, auth, classrooms.get(authID), authHash])
      if (classrooms.has(authID) && !utils.docs.has(authID)) {
        classrooms.delete(authID);
        return;
      }
      if (classrooms.has(authID) && classrooms.get(authID) === authHash) {
        wss.emit("connection", ws, request);
      }
    }
    // console.log(classrooms)
  };
  wss.handleUpgrade(request, socket, head, handleAuth);
});

server.listen({ host, port });

console.log(`running at '${host}' on port ${port}`);

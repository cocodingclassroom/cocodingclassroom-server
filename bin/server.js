#!/usr/bin/env node

/**
 * @type {any}
 */
const WebSocket = require('ws')
const http = require('http')
const wss = new WebSocket.Server({ noServer: true })
const utils = require('./utils.js')
const setupWSConnection = require('./utils.js').setupWSConnection
const ccAuth = require('./cc-auth')
const host = process.env.HOST || 'localhost'
const port = process.env.PORT || 1234

let earlyAccessMode = false
const allowList = ['https://teddavis.org', 'http://localhost:8080', 'https://cocodingclassroom.cc']
const fs = require('fs')

const server = http.createServer((request, response) => {
  switch (request.url) {
    // for /stats

    default:
      response.writeHead(200, { 'Content-Type': 'text/plain' })
      response.end('okay')
  }
})

wss.on('connection', setupWSConnection)

const classrooms = new Map()

server.on('upgrade', (request, socket, head) => {
  // You may check auth of request here..

  // console.log(provider)
  // wss.emit('connection', ws, request)

  // limit original
  if (earlyAccessMode && !allowList.includes(request.headers.origin)) {
    console.log('blocked: ' + request.headers.origin)
    return
  }
  /**
   * @param {any} ws
   */
  const handleAuth = ws => {
    const baseURL = 'https://' + request.headers.host + '/'
    const url = new URL(request.url, baseURL)
    const query = new URLSearchParams(url.search)

    // console.log(request.connection.localAddress)

    // set auth if first time access
    if (query.has('authID') && query.has('authSet') && query.has('authToken')) {
      let authID = query.get('authID')
      let authSet = query.get('authSet')
      let authToken = query.get('authToken')

      // early access limit
      let earlyAccess = false
      try {
        const allowTokens = fs.readFileSync('cc-auth-list.txt', 'utf8').split('\n')
        for (let a of allowTokens) {
          if (a.includes(authToken)) {
            earlyAccess = true
          }
        }
      } catch (e) {
        console.error('Missing configuration file \'cc-auth-list.txt\': ' + e)
      }

      // if(!allowToken.includes(authToken)){
      if (earlyAccessMode && !earlyAccess) {
        return
      }

      let authHash = authSet // ccAuth.hash(authID.toString(), authSet) // authSet//
      if (!classrooms.has(authID)) {
        classrooms.set(authID, authHash)
        // console.log(['setup', authID, authSet, classrooms.get(authID), authHash])
        wss.emit('connection', ws, request)
      }
    } else if (query.has('authID') && query.has('auth')) {
      let authID = query.get('authID')
      let auth = query.get('auth')
      let authHash = auth // ccAuth.hash(authID.toString(), auth)  //
      // console.log(['auth', authID, auth, classrooms.get(authID), authHash])
      if (classrooms.has(authID) && !utils.docs.has(authID)) {
        classrooms.delete(authID)
        return
      }
      if (classrooms.has(authID) && classrooms.get(authID) === authHash) {
        wss.emit('connection', ws, request)
      }
    }
    // console.log(classrooms)
  }
  wss.handleUpgrade(request, socket, head, handleAuth)
})

// async function loadAuthList() {
//     const data = await fs.readFile("cc-auth-list.txt", "binary");
//     console.log(Buffer.from(data))
//     return new Buffer.from(data);
// }

server.listen({ host, port })

console.log(`running at '${host}' on port ${port}`)

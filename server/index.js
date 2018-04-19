/*
* Starting point for the server application
*/

// node http server package
const http = require('http');
const path = require('path');

const gameServer = require('./gameServer');


// http server framework
const app = require('connect')();
// static content delivery middleware for connect
const serveStatic = require('serve-static');

const SERVER_PORT = process.env.PORT || 3000;
const STATIC_PATH = path.join(__dirname,'../static');

// ========================= HTTP SERVER MIDDLEWARES

// serve game as static files
app.use(serveStatic(STATIC_PATH));

//boot up the server
var httpServer = http.createServer(app).listen(SERVER_PORT, () => {
    console.log('Server listening on port', SERVER_PORT);
});

var gs = new gameServer(httpServer);

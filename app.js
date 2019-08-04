const config = require('./config');
const connect = require('connect');
const http = require('http');

const bodyParser = require('body-parser');
const routes = require('./routes/routes');
const app = connect();
const serveStatic = require('serve-static')

// use json parser
app.use(bodyParser.json({ type: 'application/json' }));

// use logger
//app.use(require('connect-logger')({}));
app.use(require('morgan')('common'));

// use response
app.use(require('./middleware/response'));

// /api
app.use(routes);

// static files

app.use(serveStatic('./public', { index: "index.html" }));
        
// respond to all requests
app.use(function(req, res){
  res.end('Hello from Connect!\n');
});
 
//create node.js http server and listen on port
console.log("listen on :3000");
http.createServer(app).listen(3000);

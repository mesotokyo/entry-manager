const config = require('./config');
const connect = require('connect');
const http = require('http');

const bodyParser = require('body-parser');
const routes = require('./routes/routes');
const app = connect();

// use json parser
app.use(bodyParser.json({ type: 'application/json' }));

// use logger
//app.use(require('connect-logger')({}));
app.use(require('morgan')('common'));

// use response
app.use(require('./middleware/response'));

// /api/create_song
app.use(routes);

// respond to all requests
app.use(function(req, res){
  res.end('Hello from Connect!\n');
});
 
//create node.js http server and listen on port
console.log("listen on :3000");
http.createServer(app).listen(3000);

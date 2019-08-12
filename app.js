const config = require('./config');
const connect = require('connect');
const http = require('http');

const bodyParser = require('body-parser');
const router = require('./router');
const app = connect();
const serveStatic = require('serve-static');

const serverSideRenderer = require('./serverSideRenderer');

// use json parser
app.use(bodyParser.json({ type: 'application/json' }));

// use logger
//app.use(require('connect-logger')({}));
app.use(require('morgan')('common'));

// use response
app.use(require('./middleware/response'));

// use token auth
app.use(require('./middleware/token-auth')(config));

// /api
app.use(router);

// static files
const accessToken = config.gamebattle.token;
app.use(`/gamebattle/${accessToken}/edit/`, serveStatic('./public', { index: "index.html" }));

// server side rendering
/*
app.use('/gamebattle/', serverSideRenderer({ templateDir: "./template",
                                             index: "index.html"
                                           }));
*/
app.use(`/gamebattle/`, serveStatic('./template', { index: "index.html" }));


// root
app.use('/', serveStatic('./doc_root'));

// respond to all requests
app.use(function(req, res){
  res.statusCode = 404;
  res.end('Not Found\n');
});
 
//create node.js http server and listen on port
console.log("listen on :3000");
http.createServer(app).listen(3000);

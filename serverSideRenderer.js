const Vue = require('vue');
const path = require('path');
const fs = require('fs');

const renderer = require('vue-server-renderer');

const model = require('./model/model');
const config = require('./config');
model.setConfig(config.gamebattle);

function serverSideRenderer(params) {

  return function(req, res, next) {
    if (req.url != '/') {
      next();
      return;
    }
    const pathname = params.index;
    const templatePathname = path.join(params.templateDir, pathname);
    fs.readFile(templatePathname, {encoding: 'utf-8'}, (err, data) => {
      if (err) { next(); }

      let _songs;
      let _logs;
      model.getSongs()
        .then(songs => {
          _songs = songs;
          return model.getLogs();
        })
        .then(logs => {
          _logs = logs;
          return _render(data, { songs: _songs,
                                 logs: _logs,
                               });
        })
        .then(html => {
          res.html(html);
        })
        .catch(err => {
          console.error(err);
          next();
        });
    });
  };
}


function _render(template, vars) {
  const vsr = renderer.createRenderer();
  const app = new Vue({ template: template });

  const context = vars;
  return vsr.renderToString(app, context);
}

module.exports = exports = serverSideRenderer;

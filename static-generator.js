const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, "public");
const privateDir = path.join(__dirname, "private");
const templateDir = path.join(__dirname, "template");

const templateRegExp = '\.html$';

exports.generate = function generate(config) {
  for (const eventId in config) {
    generatePage(eventId, config[eventId]);
  }
};

function generatePage(eventId, eventConfig) {
  const vars = { eventId: eventId };
  Object.assign(vars, eventConfig);
  delete vars.database;

  // create output directories
  const publicTargetDir = path.join(publicDir, eventId);
  let err;
  try {
    err = fs.mkdirSync(publicTargetDir);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw new Error(`cannot create static file directory: ${publicTargetDir}`);
    }
  }
  const privateTargetDir = path.join(privateDir, eventId);
  try {
    err = fs.mkdirSync(privateTargetDir);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw new Error(`cannot create static file directory: ${privateTargetDir}`);
    }
  }

  // read templates and render
  const filenames = fs.readdirSync(templateDir);
  if (filenames === undefined) {
    throw new Error(`cannot open template directory: ${templateDir}`);
  }

  const checkTemplateRex = new RegExp(templateRegExp);
  const ejsOptions = { strict: true };
  for (const filename of filenames) {
    if (!checkTemplateRex.test(filename)) {
      continue;
    }
    const templateStr = fs.readFileSync(path.join(templateDir, filename),
                                     { encoding: "utf8" });
    if (templateStr === undefined) {
      throw new Error(`cannot loadn template file: ${path.join(templateDir, filename)}`);
    }

    const template = ejs.compile(templateStr, ejsOptions);
    
    // render public page
    vars.target = "public";
    vars.readOnly = "true";
    _renderPage(vars, template, path.join(publicTargetDir, filename));

    // render private page
    vars.target = "private";
    vars.readOnly = "false";
    _renderPage(vars, template, path.join(privateTargetDir, filename));
  }
  
}

function _renderPage(vars, template, outputPathname) {
  const result = template(vars);
  fs.writeFileSync(outputPathname, result);
}

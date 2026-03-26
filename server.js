const path = require('path');
const http = require('http');
const { createRequire } = require('module');

// next is installed inside client/, load it from there
const appDir = path.join(__dirname, 'client');
const requireFromClient = createRequire(path.join(appDir, 'package.json'));
const next = requireFromClient('next');

const port = Number(process.env.PORT || 3000);
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, dir: appDir });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    http.createServer((req, res) => {
      handle(req, res);
    }).listen(port, '0.0.0.0', () => {
      console.log('Next frontend running on port ' + port);
    });
  })
  .catch((err) => {
    console.error('Failed to start Next server:', err);
    process.exit(1);
  });

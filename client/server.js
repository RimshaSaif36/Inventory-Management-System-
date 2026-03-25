const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const port = Number(process.env.PORT || 3000);
const hostname = '0.0.0.0';

const app = next({
    dev,
    dir: __dirname,
    hostname,
    port,
});

const handle = app.getRequestHandler();

app
    .prepare()
    .then(() => {
        createServer((req, res) => {
            const parsedUrl = parse(req.url, true);
            handle(req, res, parsedUrl);
        }).listen(port, hostname, () => {
            console.log(`Next frontend running on ${hostname}:${port}`);
        });
    })
    .catch((error) => {
        console.error('Failed to start Next frontend server:', error);
        process.exit(1);
    });
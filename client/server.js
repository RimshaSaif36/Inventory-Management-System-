#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');

// Check if .next build exists
const nextBuildPath = path.join(__dirname, '.next');
if (!fs.existsSync(nextBuildPath)) {
    console.error('ERROR: .next build directory not found!');
    console.error('You must build first: npm run build');
    process.exit(1);
}

// Use Next.js standalone server
const NextServer = require('next/dist/server/next-server').default;
const { IncomingMessage, ServerResponse } = require('http');

const nextServer = new NextServer({
    dir: __dirname,
    isDebug: process.env.NODE_ENV !== 'production',
    isDev: process.env.NODE_ENV !== 'production',
});

const handle = nextServer.getRequestHandler();
const port = Number(process.env.PORT || 3000);
const hostname = '0.0.0.0';

nextServer.prepare()
    .then(() => {
        http.createServer((req, res) => {
            handle(req, res);
        }).listen(port, hostname, () => {
            console.log(`Next frontend running on http://${hostname}:${port}`);
        });
    })
    .catch((err) => {
        console.error('Failed to start Next server:', err);
        process.exit(1);
    });
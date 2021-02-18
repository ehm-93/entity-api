import * as utils from './utils';

utils.setDefaultFilter(utils.LogLevel.TRACE);

const LOG = utils.logger('/index');

import dotenv from 'dotenv';

dotenv.config();

import fs from 'fs';
import http from 'http';
import https from 'https';
import express from 'express';

import * as v1 from './v1';

const databaseUrl = process.env.DATABASE_URL && new URL(process.env.DATABASE_URL);

if (!databaseUrl) {
    throw Error('The DATABASE_URL environment variable must be set.');
}

const host = process.env.HOST || 'localhost';

const httpEnabled = process.env.HTTP_ENABLED == 'true' || true;
const httpPort = +(process.env.HTTP_PORT || 8080);

const httpsEnabled = process.env.HTTPS_ENABLED == 'true' || false;
const httpsPort = +(process.env.HTTPS_PORT || 8443);
const privateKeyFile = process.env.PRIVATE_KEY_FILE;
const certificateFile = process.env.CERTIFICATE_FILE;

if (httpsEnabled && (!privateKeyFile || !certificateFile)) {
    LOG.error("PRIVATE_KEY_FILE and CERTIFICATE_FILE environment variables are required for HTTPS.");
    process.exit(-1);
}

LOG.info('App is starting up...');

(async () => {
    const v1Api = await v1.init(databaseUrl);

    const app = express().use('/v1', v1Api);

    if (httpEnabled) {
        LOG.info("Initializing HTTP server at http://{0}:{1}.", host, httpPort);
        http.createServer(app).listen(httpPort, host);
    }

    if (httpsEnabled) {
        LOG.info("Initializing HTTPS server https://{0}:{1}.", host, httpsPort);
        https.createServer(
            {
                key: fs.readFileSync(privateKeyFile),
                cert: fs.readFileSync(certificateFile)
            },
            app
        ).listen(httpsPort, host);
    }
})();

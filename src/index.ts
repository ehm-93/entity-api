import * as utils from './utils';

utils.setDefaultFilter(utils.LogLevel.TRACE);

const LOG = utils.logger('/index');

import dotenv from 'dotenv';

dotenv.config();

import express from 'express';

import * as v1 from './v1';

const databaseUrl = process.env.DATABASE_URL && new URL(process.env.DATABASE_URL);

if (!databaseUrl) {
    throw Error('The DATABASE_URL environment variable must be set.');
}

const port = +(process.env.PORT || 8080);
const host = process.env.HOST || 'localhost';

LOG.info('App is starting up...');

(async () => {
    const v1Api = await v1.init(databaseUrl);

    express().use('v1', v1Api).listen(port, host);

    LOG.info('App is listening at {0}:{1}.', host, port);
})();

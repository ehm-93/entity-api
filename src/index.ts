import * as utils from './utils';

utils.setDefaultFilter(utils.LogLevel.TRACE);

const LOG = utils.logger('/index');

import dotenv from 'dotenv';

dotenv.config();

import * as api from './v1/api';
import * as repo from './v1/repository';
import * as services from './v1/services';
import express from 'express';

const databaseUrl = process.env.DATABASE_URL;

LOG.info('App is starting up...');
repo.init(new URL(databaseUrl))
    .then(factory => {
        LOG.trace('Repositories are loaded, starting API configuration.');
        return api.init(factory, services.init());
    })
    .then(api => {
        express().use('/v1', api).listen(8080, "localhost");
        LOG.info('App is started and listening on port {0}.', 8080);
    });

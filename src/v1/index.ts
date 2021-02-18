import { Application } from 'express';

import './mongo';

import * as utils from '../utils';
import * as api from './api';
import * as repo from './repository';
import * as services from './services';

const LOG = utils.logger('/v1/index');

export async function init(databaseUrl: URL): Promise<Application> {
    const factory = await repo.init(databaseUrl);

    LOG.trace('Repositories are loaded, starting API configuration.');

    return api.init(factory, services.init());
}
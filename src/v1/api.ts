import {AttributeType, Entity, Schema} from './models';
import { RepositoryFactory } from './repository';
import express from 'express';
import * as utils from '../utils';
import { ServiceFactory } from './services';

const LOG = utils.logger('/v1/api');

export function init(repositories: RepositoryFactory, services: ServiceFactory): express.Application {
    const app = express();

    app.use(express.json());

    app.use((req, res, next) => {
        LOG.trace('Request: {0}', req.path);
        res.on('close', () => LOG.trace('Response: {0} {1}', req.path, res.statusCode));
        next();
    });

    app.route('/schemas')
        .get(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();

            const value = await schemas.findAll();

            res.json({value});
        }))
        .post(wrap(async (req, res) => {
            const schema = req.body as Schema;
            schema.id = undefined;

            const schemas = repositories.schemaRepository();

            const value = await schemas.create(schema);

            res.json({value});
        }));

    app.route('/schemas/:id')
        .get(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();

            const value = await schemas.findById(req.params.id);

            if (!value) {
                throw {status: 404, message: 'Schema not found.'};
            }

            res.json({value});
        }))
        .put(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();

            const value = await schemas.update(req.body as Schema);

            res.json({value});
        }))
        .delete(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();

            await schemas.deleteById(req.params.id);

            res.sendStatus(204);
        }));

    app.route('/schemas/:schemaId/validate')
        .put(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();

            const schema = await schemas.findById(req.params.schemaId);

            if (!schema) {
                throw {status: 404, message: 'Schema not found.'};
            }

            const value = services.entityValidation().validate(schema, req.body as Entity);

            res.status(200).json({value});
        }));

    app.route('/schemas/:schemaId/entities')
        .get(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();

            const schema = await schemas.findById(req.params.schemaId);

            if (!schema) {
                throw {status: 404, message: 'Schema not found.'};
            }

            const entities = repositories.entityRepository(schema);

            const value = await entities.findAll();

            res.json({value});
        }))
        .post(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();

            const schema = await schemas.findById(req.params.schemaId);

            if (!schema) {
                throw {status: 404, message: 'Schema not found.'};
            }

            const entity = req.body as Entity;
            entity.id = undefined;
            entity.schemaId = schema.id;

            const validation = services.entityValidation()
                .validate(schema, entity);

            if (!validation.valid) {
                throw {status: 400, message: validation.message || 'Validation has failed', details: validation.messages};
            }

            const entities = repositories.entityRepository(schema);

            const value = await entities.create(entity);

            res.json({value});
        }));

    app.route('/schemas/:schemaId/entities/:entityId')
        .get(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();

            const schema = await schemas.findById(req.params.schemaId);

            if (!schema) {
                throw {status: 404, message: 'Schema not found.'};
            }

            const entities = repositories.entityRepository(schema);

            const value = await entities.findById(req.params.entityId);

            res.json({value});
        }))
        .put(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();

            const schema = await schemas.findById(req.params.schemaId);

            if (!schema) {
                throw {status: 404, message: 'Schema not found.'};
            }

            const entity = req.body as Entity;

            if (entity.schemaId != schema.id) {
                throw {status: 400, message: 'This entity is not a part of this schema.'};
            }

            const validation = services.entityValidation()
                .validate(schema, entity);

            if (!validation.valid) {
                throw {status: 400, message: validation.message || 'Validation has failed', details: validation.messages};
            }

            const entities = repositories.entityRepository(schema);

            const value = await entities.update(entity);

            res.json({value});
        }))
        .delete(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();
            const schema = await schemas.findById(req.params.schemaId);

            if (!schema) {
                throw {status: 404, message: 'Schema not found.'};
            }

            const entities = repositories.entityRepository(schema);

            await entities.deleteById(req.params.entityId);

            res.status(204).send();
        }));

    app.route('/schemas/:schemaId/entities/:entityId/:attribute')
        .get(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();

            const schema = await schemas.findById(req.params.schemaId);

            if (!schema) {
                throw {status: 404, message: 'Schema not found.'};
            }

            const attribute = schema.attributes.find(a => a.name === req.params.attribute);

            if (!attribute) {
                throw {status: 404, message: 'Attribute not found.'};
            }

            if (attribute.type !== AttributeType.RELATIONSHIP) {
                throw {status: 400, message: 'Target attribute is not a relationship.'};
            }

            const entities = repositories.entityRepository(schema);

            const entity = await entities.findById(req.params.entityId);

            if (!entity) {
                throw {status: 404, message: 'Entity not found.'};
            }

            res.json({value: entity[req.params.attribute]});
        }))
        .put(wrap(async (req, res) => {
            const schemas = repositories.schemaRepository();

            const schema = await schemas.findById(req.params.schemaId);

            if (!schema) {
                throw {status: 404, message: 'Schema not found.'};
            }

            const attribute = schema.attributes.find(a => a.name === req.params.attribute);

            if (!attribute) {
                throw {status: 404, message: 'Attribute not found.'};
            }

            if (attribute.type !== AttributeType.RELATIONSHIP) {
                throw {status: 400, message: 'Target attribute is not a relationship.'};
            }

            const entities = repositories.entityRepository(schema);

            const entity = await entities.findById(req.params.entityId);

            if (!entity) {
                throw {status: 404, message: 'Entity not found.'};
            }

            entity[req.params.attribute] = req.body;

            const validation = services.entityValidation().validate(schema, entity);

            if (!validation.valid) {
                throw {status: 400, message: "Validation has failed."};
            }

            const value = await entities.update(entity);

            res.json({value});
        }));

    return app;
}

/**
 * Adds the default error handler to the passed request handler
 * @param handler
 */
function wrap(handler: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
) => Promise<void>): express.RequestHandler {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch (e) {
            handleError(req, res, e);
        }
    };
}

function handleError(req: express.Request, res: express.Response, error: any) {
    if (!error.status || 500 <= error.status) {
        if (typeof error === 'string') {
            LOG.error(error);
        } else {
            LOG.error('{0}\n{1}', error.message, error.stack);
        }
    }

    const errorResult: any = {};
    if (typeof error === 'object') {
        errorResult.message = error.message;
        errorResult.details = error.details;
    } else {
        errorResult.message = error;
    }

    res.status(error.status || 500).json({error: errorResult});
}
import {AttributeType, Cardinality, Entity, Schema} from './models';
import { RepositoryFactory } from './repository';
import express from 'express';
import * as utils from '../utils';
import { EntityValidationService, ServiceFactory } from './services';

const LOG = utils.logger('/v1/api');

export function init(repositories: RepositoryFactory, services: ServiceFactory): express.Express {
    const app = express();

    app.use(express.json());

    app.use((req, res, next) => {
        LOG.trace('Request: {0}', req.path);
        res.on('close', () => LOG.trace('Response: {0} {1}', req.path, res.statusCode));
        next();
    });

    app.route('/schemas')
        .get((req, res) => {
            repositories.schemaRepository()
                .findAll()
                .then(value => res.json({value}))
                .catch(e => handleError(req, res, e));
        })
        .post((req, res) => {
            const schema = req.body as Schema;
            schema.id = undefined;

            repositories.schemaRepository()
                .create(schema)
                .then(value => res.json({value}))
                .catch(e => handleError(req, res, e));
        });

    app.route('/schemas/:id')
        .get((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.id)
                .then(value => {
                    if (!value) {
                        throw {status: 404, message: 'Schema not found.'};
                    }

                    res.json({value});
                })
                .catch(e => handleError(req, res, e));
        })
        .put((req, res) => {
            repositories.schemaRepository()
                .update(req.body as Schema)
                .then(value => res.json({value}))
                .catch(e => handleError(req, res, e));
        })
        .delete((req, res) => {
            repositories.schemaRepository()
                .deleteById(req.params.id)
                .then(() => res.sendStatus(204))
                .catch(e => handleError(req, res, e));
        });

    app.route('/schemas/:schemaId/validate')
        .put((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    if (!schema) {
                        throw {status: 404, message: 'Schema not found.'};
                    }

                    const value = services.entityValidation().validate(schema, req.body as Entity);

                    res.status(200).json({value});
                })
                .catch(e => handleError(req, res, e));
        });

    app.route('/schemas/:schemaId/entities')
        .get((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    if (!schema) {
                        throw {status: 404, message: 'Schema not found.'};
                    }

                    repositories.entityRepository()
                        .findAllBySchema(schema)
                        .then(value => res.json({value}));
                })
                .catch(e => handleError(req, res, e));
        })
        .post((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
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

                    repositories.entityRepository()
                        .create(entity)
                        .then(value => res.json({value}));
                })
                .catch(e => handleError(req, res, e));
        });

    app.route('/schemas/:schemaId/entities/:entityId')
        .get((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    if (!schema) {
                        throw {status: 404, message: 'Schema not found.'};
                    }

                    repositories.entityRepository()
                        .findById(req.params.entityId)
                        .then(value => res.json({value}));
                })
                .catch(e => handleError(req, res, e));
        })
        .put((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
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

                    repositories.entityRepository()
                        .update(entity)
                        .then(value => res.json({value}));
                })
                .catch(e => handleError(req, res, e));
        })
        .delete((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    if (!schema) {
                        throw {status: 404, message: 'Schema not found.'};
                    }

                    repositories.entityRepository()
                        .deleteById(req.params.entityId)
                        .then(value => res.json({value}));
                })
                .catch(e => handleError(req, res, e));
        });

    app.route('/schemas/:schemaId/entities/:entityId/:attribute')
        .get(async (req, res) => {
            try {
                const schemas = repositories.schemaRepository();
                const entities = repositories.entityRepository();

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

                const entity = await entities.findById(req.params.entityId);

                if (!entity) {
                    throw {status: 404, message: 'Entity not found.'};
                }

                const value = await entities.getRelationship(entity, req.params.attribute);

                if (attribute.cardinality === Cardinality.MANY_TO_ONE || attribute.cardinality === Cardinality.ONE_TO_ONE) {
                    res.json({value: value.length ? value[0] : []});
                } else {
                    res.json({value});
                }
            } catch (e) {
                handleError(req, res, e);
            }
        })
        .put(async (req, res) => {
            try {
                const schemas = repositories.schemaRepository();
                const entities = repositories.entityRepository();

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

                if (attribute.cardinality === Cardinality.MANY_TO_MANY || attribute.cardinality === Cardinality.ONE_TO_MANY) {
                    if (!Array.isArray(req.body)) {
                        throw {status: 400, message: `${attribute.name} has cardinality ${attribute.cardinality} which can only be updated with an array.`};
                    }
                } else {
                    if (Array.isArray(req.body)) {
                        throw {status: 400, message: `${attribute.name} has cardinality ${attribute.cardinality} which can only be updated with an entity.`};
                    }
                }

                const entity = await entities.findById(req.params.entityId);

                if (!entity) {
                    throw {status: 404, message: 'Entity not found.'};
                }

                const value = await entities.setRelationship(entity, attribute.name, req.body);

                res.json({value});
            } catch (e) {
                handleError(req, res, e);
            }
        });

    return app;
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
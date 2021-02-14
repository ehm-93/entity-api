import {Entity, Schema} from './models';
import { RepositoryFactory } from './repository';
import express from 'express';
import * as utils from '../utils';
import { ServiceFactory } from './services';

const LOG = utils.logger('/v1/api');

export function init(repositories: RepositoryFactory, services: ServiceFactory): express.Express {
    const app = express();

    app.use(express.json());

    app.use((req, res, next) => {
        LOG.trace("Request: {0}", req.path);
        next();
    });

    app.route('/schemas')
        .get((req, res) => {
            repositories.schemaRepository()
                .findAll()
                .then(value => res.json({value}))
                .catch(e => res.status(500).json({error: {message: typeof e === 'string' ? e : e.message}}));
        })
        .post((req, res) => {
            repositories.schemaRepository()
                .create(req.body as Schema)
                .then(value => res.json({value}))
                .catch(e => res.status(500).json({error: {message: typeof e === 'string' ? e : e.message}}));
        });

    app.route('/schemas/:id')
        .get((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.id)
                .then(value => {
                    if (!value) {
                        res.status(404).json({error: {message: 'Schema not found.'}});
                        return;
                    }

                    res.json({value});
                })
                .catch(e => res.status(500).json({error: {message: typeof e === 'string' ? e : e.message}}));
        })
        .put((req, res) => {
            repositories.schemaRepository()
                .update(req.body as Schema)
                .then(value => res.json({value}))
                .catch(e => res.status(500).json({error: {message: typeof e === 'string' ? e : e.message}}));
        })
        .delete((req, res) => {
            repositories.schemaRepository()
                .deleteById(req.params.id)
                .then(() => res.sendStatus(204))
                .catch(e => res.status(500).json({error: {message: typeof e === 'string' ? e : e.message}}));
        });

    app.route('/schemas/:schemaId/validate')
        .put((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    if (!schema) {
                        res.status(404).json({error: {message: 'Schema not found.'}});
                        return;
                    }

                    const value = services.entityValidation().validate(schema, req.body as Entity);

                    res.status(200).json({value});
                });
        });

    app.route('/schemas/:schemaId/entities')
        .get((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    if (!schema) {
                        res.status(404).json({error: {message: 'Schema not found.'}});
                        return;
                    }

                    repositories.entityRepository()
                        .findAllBySchemaId(schema.id)
                        .then(value => res.json({value}));
                })
                .catch(e => res.status(500).json({message: typeof e === 'string' ? e : e.message}));
        })
        .post((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    const entity = req.body as Entity;
                    const validation = services.entityValidation()
                        .validate(schema, entity);

                    if (!schema) {
                        res.status(404).json({error: {message: 'Schema not found.'}});
                        return;
                    }

                    if (!validation.valid) {
                        res.status(400).json({error: {message: validation.message || 'Validation has failed', details: validation.messages}});
                        return;
                    }

                    repositories.entityRepository()
                        .create(entity)
                        .then(value => res.json({value}));
                })
                .catch(e => res.status(500).json({error: {message: typeof e === 'string' ? e : e.message}}));
        });

    app.route('/schemas/:schemaId/entities/:entityId')
        .get((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    if (!schema) {
                        res.status(404).json({error: {message: 'Schema not found.'}});
                        return;
                    }

                    repositories.entityRepository()
                        .findById(req.params.entityId)
                        .then(value => res.json({value}));
                })
                .catch(e => res.status(500).json({error: {message: typeof e === 'string' ? e : e.message}}));
        })
        .put((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    if (!schema) {
                        res.status(404).json({error: {message: 'Schema not found.'}});
                        return;
                    }

                    repositories.entityRepository()
                        .update(req.body as Entity)
                        .then(value => res.json({value}));
                })
                .catch(e => res.status(500).json({error: {message: typeof e === 'string' ? e : e.message}}));
        })
        .delete((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    if (!schema) {
                        res.status(404).json({error: {message: 'Schema not found.'}});
                        return;
                    }

                    repositories.entityRepository()
                        .deleteById(req.params.entityId)
                        .then(value => res.json({value}));
                })
                .catch(e => res.status(500).json({message: typeof e === 'string' ? e : e.message}));
        });

    app.route('/schema/:schemId/entities/:entityId/:attribute')
        .get((req, res) => {
            res.status(500).json({message: "Not yet implemented."});
        })
        .put((req, res) => {
            res.status(500).json({message: "Not yet implemented."});
        });

    return app;
}
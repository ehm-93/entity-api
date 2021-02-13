import {Entity, Schema} from './models';
import { RepositoryFactory } from './repository';
import express from 'express';
import * as utils from '../utils';

const LOG = utils.logger('/v1/api');

export function init(repositories: RepositoryFactory): express.Express {
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
                .catch(e => res.status(400).json({message: typeof e === 'string' ? e : e.message}));
        })
        .post((req, res) => {
            repositories.schemaRepository()
                .create(req.body as Schema)
                .then(value => res.json({value}))
                .catch(e => res.status(400).json({message: typeof e === 'string' ? e : e.message}));
        });

    app.route('/schemas/:id')
        .get((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.id)
                .then(value => res.json({value}))
                .catch(e => res.status(400).json({message: typeof e === 'string' ? e : e.message}));
        })
        .put((req, res) => {
            repositories.schemaRepository()
                .update(req.body as Schema)
                .then(value => res.json({value}))
                .catch(e => res.status(400).json({message: typeof e === 'string' ? e : e.message}));
        })
        .delete((req, res) => {
            repositories.schemaRepository()
                .deleteById(req.params.id)
                .then(value => res.json({value}))
                .catch(e => res.status(400).json({message: typeof e === 'string' ? e : e.message}));
        });

    app.route('/schemas/:schemaId/entities')
        .get((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    repositories.entityRepository()
                        .findAllBySchemaId(schema._id)
                        .then(value => res.json({value}));
                })
                .catch(e => res.status(400).json({message: typeof e === 'string' ? e : e.message}));
        })
        .post((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    repositories.entityRepository()
                        .create(req.body as Entity)
                        .then(value => res.json({value}));
                })
                .catch(e => res.status(400).json({message: typeof e === 'string' ? e : e.message}));
        });

    app.route('/schemas/:schemaId/entities/:entityId')
        .get((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    repositories.entityRepository()
                        .findById(req.params.entityId)
                        .then(value => res.json({value}));
                })
                .catch(e => res.status(400).json({message: typeof e === 'string' ? e : e.message}));
        })
        .put((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    repositories.entityRepository()
                        .update(req.body as Entity)
                        .then(value => res.json({value}));
                })
                .catch(e => res.status(400).json({message: typeof e === 'string' ? e : e.message}));
        })
        .delete((req, res) => {
            repositories.schemaRepository()
                .findById(req.params.schemaId)
                .then(schema => {
                    repositories.entityRepository()
                        .deleteById(req.params.entityId)
                        .then(value => res.json({value}));
                })
                .catch(e => res.status(400).json({message: typeof e === 'string' ? e : e.message}));
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
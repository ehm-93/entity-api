import * as utils from "../utils";
import { EntityRepository, RepositoryFactory, SchemaRepository } from "./repository";
import * as models from "./models";

import { v4 as uuid } from "uuid";

import mongo = require("mongoose");

const LOG = utils.logger("/v1/mongo");
export class MongoSchemaRepository implements SchemaRepository {
  constructor(private models: Models) {}

  async create(schema: models.Schema): Promise<models.Schema> {
    LOG.trace('Creating schema: {0}', schema);
    const result = await this.models.SchemaModel.create(this.toMongoSchema(schema));
    return this.fromMongoSchema(result);
  }

  async findAll(): Promise<models.Schema[]> {
    LOG.trace('Retrieving all schemas');
    const result = await this.models.SchemaModel.find();
    return result.map(this.fromMongoSchema);
  }

  async findById(id: string): Promise<models.Schema> {
    LOG.trace('Searching for Schema with ID: "{0}"', id);
    const result = await this.models.SchemaModel.findById(id);
    return this.fromMongoSchema(result);
  }

  async update(schema: models.Schema): Promise<models.Schema> {
    LOG.trace('Updating Schema: "{0}"', schema);
    const result = await this.models.SchemaModel.findById(schema.id);

    if (!result) {
      throw {status: 404, message: "Schema not found."};
    }

    result.display = schema.display;
    result.description = schema.description;
    result.attributes = schema.attributes;

    result.save();

    return this.fromMongoSchema(result);
  }

  async deleteById(id: string): Promise<void> {
    LOG.trace('Deleting Schema with ID: "{0}"', id);
    return await this.models.SchemaModel.findById(id).deleteOne();
  }

  // Since objects returned from Mongo are Documents, we need to strip all the
  // Mongo specific junk out of the response to only expose the attributes on our model
  private fromMongoSchema(s: models.Schema & mongo.Document): models.Schema {
    if (s == null) {
      return null;
    }

    return {
      id: s._id as string,
      display: s.display,
      description: s.description,
      attributes: s.attributes ? s.attributes.map(a => { return {
        type: a.type,
        name: a.name,
        display: a.display,
        description: a.description,
        required: a.required,
        maxLength: a.maxLength,
        min: a.min,
        max: a.max,
        integer: a.integer,
        cardinality: a.cardinality,
        targetId: a.targetId
      };}): []
  };
  }

  private toMongoSchema(s: models.Schema): models.Schema {
    if (s == null) {
      return null;
    }

    return {
      _id: s.id as string,
      display: s.display,
      description: s.description,
      attributes: s.attributes ? s.attributes.map(a => { return {
        type: a.type,
        name: a.name,
        display: a.display,
        description: a.description,
        required: a.required,
        maxLength: a.maxLength,
        min: a.min,
        max: a.max,
        integer: a.integer,
        cardinality: a.cardinality,
        targetId: a.targetId
      };}): []
  } as any;
  }
}

export class MongoEntityRepository implements EntityRepository {
  constructor(private models: Models) {}

  async findAllBySchema(schema: models.Schema): Promise<models.Entity[]> {
    LOG.trace('Seaching for entities for schema {0}', schema);
    const result = await this.models.EntityModel.find({schemaId: schema.id});
    return result.map(this.fromMongoEntity);
  }

  async create(obj: models.Entity): Promise<models.Entity> {
    LOG.trace('Creating entity {0}', obj);
    const result = await this.models.EntityModel.create(this.toMongoEntity(obj));
    return this.fromMongoEntity(result);
  }

  async findAll(): Promise<models.Entity[]> {
    LOG.trace('Fetching all entities');
    const result = await this.models.EntityModel.find();
    return result.map(this.fromMongoEntity);
  }

  async findById(id: string): Promise<models.Entity> {
    LOG.trace('Finding entity for ID "{0}"', id);
    const result = await this.models.EntityModel.findById(id);
    return this.fromMongoEntity(result);
  }

  async update(obj: models.Entity): Promise<models.Entity> {
    LOG.trace('Updating entity {0}', obj);
    const result = await this.models.EntityModel.findById(obj.id);

    if (!result) {
      throw {status: 404, message: 'Entity not found.'};
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key === 'id' || key === 'schemaId') {
        continue;
      }

      result.attributes[key] = value;
    }

    result.save();

    return this.fromMongoEntity(result);
  }

  async deleteById(id: string): Promise<void> {
    LOG.trace('Deleting entity with ID "{0}"', id);
    return this.models.EntityModel.findById(id).deleteOne();
  }

  async getRelationship(entity: models.Entity, relationship: string): Promise<models.Entity[]> {
    LOG.trace('Fetching value of relationship {0} on entity {1}.', relationship, entity);
    const result = await this.models.RelationshipModel.find({'tail.id': entity.id, name: relationship});
    return result.map(x => x.head).map(this.fromMongoEntity);
  }

  async setRelationship(entity: models.Entity, relationship: string, value: models.Entity | models.Entity[]): Promise<models.Entity[]> {
    LOG.trace('Setting value of relationship {0} on entity {1} to {2}', relationship, entity, value);

    if (!Array.isArray(value)) {
      value = [value];
    }

    const session = await this.models.RelationshipModel.startSession();
    try {
        await session.startTransaction();

        const edges = await this.models.RelationshipModel.find({
          name: relationship,
          tail: entity.id
        }, {
          session: session
        })
          .populate('head');

        edges.forEach(e => e.delete({session: session}));

        await Promise.all(value.map(x => this.models.RelationshipModel.create({
          head: x.id,
          tail: entity.id,
          name: relationship
        }, {session: session})));

        await session.commitTransaction();
    } catch (e) {
      await session.abortTransaction();
    } finally {
      await session.endSession();
    }

    return value;
  }

  private fromMongoEntity(src: MongoEntity): models.Entity {
    if (src == null) {
      return null;
    }

    const dst = {
      id: src._id,
      schemaId: src.schemaId
    };

    if (!src.attributes) {
      return dst;
    }

    for (const [key, value] of Object.entries(src.attributes)) {
      if (key === 'id' || key === 'schemaId') {
        continue;
      }

      dst[key] = value;
    }

    return dst;
  }

  private toMongoEntity(src: models.Entity): MongoEntity {
    if (src == null) {
      return null;
    }

    const dst = {
      _id: src.id,
      schemaId: src.schemaId,
      attributes: {}
    };

    for (const [key, value] of Object.entries(src)) {
      if (key === 'id' || key === 'schemaId') {
        continue;
      }

      dst.attributes[key] = value;
    }

    return dst;
  }
}

interface Relationship {
  name: string;
  head: MongoEntity | string;
  tail: MongoEntity | string;
}

interface MongoEntity {
  _id: string,
  schemaId: string,
  attributes: {[index: string]: string | number | boolean}
}

interface Models {
  readonly AttributeModel: mongo.Model<models.Attribute & mongo.Document>,
  readonly SchemaModel: mongo.Model<models.Schema & mongo.Document>,
  readonly EntityModel: mongo.Model<MongoEntity & mongo.Document>,
  readonly RelationshipModel: mongo.Model<Relationship & mongo.Document>
}

export class MongoRepositoryFactory implements RepositoryFactory, Models {
  readonly AttributeModel: mongo.Model<models.Attribute & mongo.Document>;
  readonly attributeSchema: mongo.Schema = new mongo.Schema({
    type: { type: String },
    name: { type: String },
    display: { type: String },
    description: { type: String },
    required: { type: Boolean },
    maxLength: { type: String },
    min: { type: Number },
    max: { type: Number },
    integer: { type: Boolean },
    cardinality: {type: String},
    targetId: {type: String}
  });

  readonly SchemaModel: mongo.Model<models.Schema & mongo.Document>;
  readonly schemaSchema: mongo.Schema = new mongo.Schema({
    _id: { type: String, default: uuid },
    display: { type: String },
    decription: { type: String },
    attributes: [this.attributeSchema],
  });

  readonly EntityModel: mongo.Model<MongoEntity & mongo.Document>;
  readonly entitySchema: mongo.Schema = new mongo.Schema({
    _id: {type: String, default: uuid},
    schemaId: {type: String},
    attributes: {}
  });

  readonly RelationshipModel: mongo.Model<Relationship & mongo.Document>
  readonly relationshipSchema: mongo.Schema = new mongo.Schema({
    name: {type: String},
    head: {type: this.entitySchema, ref: 'Entity'},
    tail: {type: this.entitySchema, ref: 'Entity'}
  });

  constructor(private mongoose: mongo.Mongoose) {
    LOG.trace('Initializing models.');

    this.AttributeModel = this.mongoose.model('Attribute', this.attributeSchema);
    this.SchemaModel = this.mongoose.model('Schema', this.schemaSchema);
    this.EntityModel = this.mongoose.model('Entity', this.entitySchema);
    this.RelationshipModel = this.mongoose.model('Relationship', this.relationshipSchema);

    this.AttributeModel.createCollection();
    this.SchemaModel.createCollection();
    this.EntityModel.createCollection();
    this.RelationshipModel.createCollection();
  }

  schemaRepository(): SchemaRepository {
    return new MongoSchemaRepository(this);
  }

  entityRepository(): EntityRepository {
    return new MongoEntityRepository(this);
  }
}

export async function init(url: URL): Promise<RepositoryFactory> {
  LOG.trace("Initializing Mongo with URL: '{0}'.", url);

  return await mongo.connect(url.toString(), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
    sslValidate: true
  }).then(mongoose => new MongoRepositoryFactory(mongoose));
}

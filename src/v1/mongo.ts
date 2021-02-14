import * as utils from "../utils";
import { EntityRepository, RepositoryFactory, SchemaRepository } from "./repository";
import * as models from "./models";

import { v4 as uuid } from "uuid";

import mongo = require("mongoose");

const LOG = utils.logger("/v1/mongo");


// TODO this all needs to be refactred, as is, this leaks Mongo specific information into the API
//   add some separate, Mongo specific data models which get mapped manually to the API models
export class MongoSchemaRepository implements SchemaRepository {
  constructor(private models: Models) {}

  async create(schema: models.Schema): Promise<models.Schema> {
    LOG.trace('Creating schema: {0}.', schema);
    return await this.models.SchemaModel.create(schema);
  }

  async findAll(): Promise<models.Schema[]> {
    LOG.trace('Retrieving all schemas.');
    return await this.models.SchemaModel.find().then();
  }

  async findById(id: string): Promise<models.Schema> {
    LOG.trace('Searching for Schema with ID: "{0}".', id);
    return await this.models.SchemaModel.findById(id);
  }

  async update(schema: models.Schema): Promise<models.Schema> {
    LOG.trace('Updating Schema: "{0}".', schema);
    return await this.models.SchemaModel.updateOne(schema);
  }

  async deleteById(id: string): Promise<void> {
    LOG.trace('Deleting Schema with ID: "{0}".', id);
    return await this.models.SchemaModel.findById(id).deleteOne();
  }
}

export class MongoEntityRepository implements EntityRepository {
  constructor(private models: Models) { }

  async create(entity: models.Entity): Promise<models.Entity> {
    LOG.trace('Creating Entity: "{0}".', entity);
    return await this.models.EntityModel.create(entity);
  }

  async findAll(): Promise<models.Entity[]> {
    LOG.trace('Retrieving all entities.');
    return await this.models.EntityModel.find().then();
  }

  async findById(id: string): Promise<models.Entity> {
    LOG.trace('Searching for Entity with ID: "{0}"', id);
    return await this.models.EntityModel.findById(id);
  }

  async update(entity: models.Entity): Promise<models.Entity> {
    LOG.trace('Updating entity: "{0}".', entity);
    return await this.models.EntityModel.updateOne(entity);
  }

  async deleteById(id: string): Promise<void> {
    LOG.trace('Deleting Entity with ID: "{0}".', id);
    return await this.models.EntityModel.findById(id).deleteOne();
  }

  async findAllBySchemaId(schemaId: string): Promise<models.Entity[]> {
    LOG.trace('Searching for Entities for schema ID: "{0}".', schemaId);
    return await this.models.EntityModel.find({ schemaId }).then();
  }

  async getTargets(entity: models.Entity, relationship: models.RelationshipAttribute): Promise<models.Entity[]> {
    LOG.trace('Searching for targets of relationship "{0}" on entity "{1}".', relationship, entity);
    return await this.models.RelationshipModel.find({tail: entity, name: relationship.name}).then(relationships => relationships.map(r => r.head));
  }

  async setTargets(entity: models.Entity, relationship: models.RelationshipAttribute, targets: models.Entity[]): Promise<void> {
    LOG.trace('Setting targets for entity "{0}" and relatioship "{1}".', entity, relationship);

    const relationships = {} as {[index: string]: Relationship & mongo.Document};
    for (const i of await this.models.RelationshipModel.find({tail: entity, name: relationship.name})) {
      relationships[i.head.id] = i;
    }

    const existingIds = Object.keys(relationships);

    const targetsMap = {};
    for (const i of targets) {
      targetsMap[i.id] = i;
    }
    const targetIds = Object.keys(targetsMap);

    for (const id of targetIds) {
      if (!existingIds.includes(id)) {
        await this.models.RelationshipModel.create({name: relationship.name, head: MongoEntityRepository, tail: targetsMap[id]});
      }
    }

    for (const id of existingIds) {
      if (!targetIds.includes(id)) {
        relationships[id].remove();
      }
    }
  }
}

interface Relationship {
  name: string;
  head: models.Entity;
  tail: models.Entity;
}

interface Models {
  readonly AttributeModel: mongo.Model<models.Attribute & mongo.Document>,
  readonly StringAttributeModel: mongo.Model<models.StringAttribute & mongo.Document>,
  readonly NumericAttributeModel: mongo.Model<models.NumericAttribute & mongo.Document>,
  readonly RelationshipAttributeModel: mongo.Model<models.RelationshipAttribute & mongo.Document>,
  readonly SchemaModel: mongo.Model<models.Schema & mongo.Document>,
  readonly EntityModel: mongo.Model<models.Entity & mongo.Document>,
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
  }, { discriminatorKey: "type" });

  readonly StringAttributeModel: mongo.Model<models.StringAttribute & mongo.Document>;
  readonly stringAttributeSchema: mongo.Schema = new mongo.Schema({
    maxLength: { type: String },
  });

  readonly NumericAttributeModel: mongo.Model<models.NumericAttribute & mongo.Document>;
  readonly numericAttributeSchema: mongo.Schema = new mongo.Schema({
    min: { type: Number },
    max: { type: Number },
    integer: { type: Boolean },
  });

  readonly RelationshipAttributeModel: mongo.Model<models.RelationshipAttribute & mongo.Document>;
  readonly relationshipAttributeSchema: mongo.Schema = new mongo.Schema({
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

  readonly EntityModel: mongo.Model<models.Entity & mongo.Document>;
  readonly entitySchema: mongo.Schema = new mongo.Schema({
    _id: {type: String, default: uuid},
    schemaId: {type: String}
  });

  readonly RelationshipModel: mongo.Model<Relationship & mongo.Document>
  readonly relationshipSchema: mongo.Schema = new mongo.Schema({
    name: {type: String},
    head: this.entitySchema,
    tail: this.entitySchema
  });

  constructor(private mongoose: mongo.Mongoose) {
    LOG.trace('Initializing models.');

    this.AttributeModel = this.mongoose.model('Attribute', this.attributeSchema);
    this.StringAttributeModel = this.AttributeModel.discriminator(models.AttributeType.STRING, this.stringAttributeSchema);
    this.NumericAttributeModel = this.AttributeModel.discriminator(models.AttributeType.NUMERIC, this.numericAttributeSchema);
    this.RelationshipAttributeModel = this.AttributeModel.discriminator(models.AttributeType.RELATIONSHIP, this.relationshipAttributeSchema);
    this.SchemaModel = this.mongoose.model('Schema', this.schemaSchema);
    this.EntityModel = this.mongoose.model('Entity', this.entitySchema);
    this.RelationshipModel = this.mongoose.model('Relationship', this.relationshipSchema);

    this.AttributeModel.createCollection();
    this.StringAttributeModel.createCollection();
    this.NumericAttributeModel.createCollection();
    this.RelationshipAttributeModel.createCollection();
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

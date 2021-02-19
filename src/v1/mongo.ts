import * as utils from "../utils";
import { EntityRepository, RepositoryFactory, SchemaRepository, registerInitializer } from "./repository";
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
  constructor(private schema: models.Schema, private models: Models, private factory: RepositoryFactory) {}

  async findAll(): Promise<models.Entity[]> {
    LOG.trace('Seaching for entities for schema {0}', this.schema);

    const result = await this.models.EntityModel.find({schemaId: this.schema.id});

    return Promise.all(result.map(e => this.fromMongoEntity(e, [])));
  }

  async create(obj: models.Entity): Promise<models.Entity> {
    LOG.trace('Creating entity {0}', obj);

    const [tmpEntity, tmpRel] = await this.toMongoEntity(obj);

    const result = await this.models.EntityModel.create(tmpEntity);
    const resultRel = await this.models.RelationshipModel.create(tmpRel);

    return this.fromMongoEntity(result, resultRel || []);
  }

  async findById(id: string): Promise<models.Entity> {
    LOG.trace('Finding entity for ID "{0}"', id);

    const result = await this.models.EntityModel.findOne({_id: id, schemaId: this.schema.id}).exec();

    if (!result) {
      throw {status: 404, message: "Entity with id '" + id + "' could not be found."};
    }

    const rel = await this.models.RelationshipModel.find({head: result});

    return this.fromMongoEntity(result, rel);
  }

  async update(obj: models.Entity): Promise<models.Entity> {
    LOG.trace('Updating entity {0}', obj);

    const [toCommit, rel] = await this.toMongoEntity(obj);

    const result = await this.models.EntityModel.findByIdAndUpdate(toCommit);

    await this.models.RelationshipModel.deleteMany({tail: result});

    const resultRel = await this.models.RelationshipModel.create(rel);

    return this.fromMongoEntity(result, resultRel || []);
  }

  async deleteById(id: string): Promise<void> {
    LOG.trace('Deleting entity with ID "{0}"', id);
    return this.models.EntityModel.findById(id).deleteOne();
  }

  private async fromMongoEntity(src: MongoEntity, relationships: Relationship[]): Promise<models.Entity> {
    if (src == null) {
      return null;
    }

    const dst: models.Entity = {
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

    for (const relationship of relationships) {
      if (relationship.name === 'id' || relationship.name === 'schemaId') {
        LOG.warn("Relationship has reserved name '{0}', it will not be included on the entity.", relationship.name);
        continue;
      }

      const attr = this.schema.attributes.find(a => a.name === relationship.name);

      if (!attr || !attr.targetId) {
        LOG.warn("No relationship found for '{0}', this will not be included on the entity.", relationship.name);
        continue;
      }

      const targetSchema = await this.resolveSchemaRef(attr.targetId);

      if (!targetSchema) {
        LOG.warn("Could not find target schema with ID '{0}'. The property '{1}' will not be populated.", attr.targetId, relationship.name);
        continue;
      }

      const value = await this.resolveEntityRef(targetSchema, relationship.head);

      if (attr.cardinality === models.Cardinality.MANY_TO_MANY || attr.cardinality === models.Cardinality.ONE_TO_MANY) {
        const oldValue = dst[relationship.name];

        if (Array.isArray(oldValue)) {
          oldValue.push(value);
        } else {
          dst[relationship.name] = [value];
        }
      } else if (attr.cardinality === models.Cardinality.MANY_TO_ONE || attr.cardinality === models.Cardinality.ONE_TO_ONE) {
        dst[relationship.name] = value;
      }
    }

    return dst;
  }

  private async resolveSchemaRef(ref: string | models.Schema): Promise<models.Schema> {
    return await this.models.SchemaModel.findById(typeof ref === 'string' ? ref : ref.id);
  }

  private async resolveEntityRef(schema: models.Schema, ref: string | MongoEntity): Promise<models.Entity> {
    return await this.factory.entityRepository(schema).findById(typeof ref === 'string' ? ref : ref._id);
  }

  private async toMongoEntity(src: models.Entity): Promise<[MongoEntity, Relationship[]]> {
    if (src == null) {
      return null;
    }

    const dst: MongoEntity = {
      _id: src.id,
      schemaId: src.schemaId,
      attributes: {},
    };
    const dstRel: Relationship[] = [];

    for (const [key, value] of Object.entries(src)) {
      if (key === 'id' || key === 'schemaId') {
        continue;
      }

      const attr = this.schema.attributes.find(a => a.name === key);

      if (!attr) {
        LOG.error("No attribute was found for '{0}', this will not be included on the entity.", key);
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          dstRel.push({
            name: key,
            tail: dst,
            head: {_id: item.id} as any
          });
        }
      } else if (typeof value === 'object') {
        dstRel.push({
          name: key,
          tail: dst,
          head: {_id: value.id} as any
        });
      } else {
        dst.attributes[key] = value;
      }
    }
    return [dst, dstRel];
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
    targetId: {type: String, ref: 'Schema'}
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
    schemaId: {type: String, ref: 'Schema'},
    attributes: {}
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

  entityRepository(schema: models.Schema): EntityRepository {
    return new MongoEntityRepository(schema, this, this);
  }
}

registerInitializer('mongodb', url => mongo.connect(url.toString(), {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
    sslValidate: true
  }).then(mongoose => new MongoRepositoryFactory(mongoose))
);

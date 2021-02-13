import { Schema, Entity, RelationshipAttribute } from "./models";
import { logger } from "../utils";
import * as mongo from "./mongo";

const LOG = logger('/v1/repository');

export interface RepositoryFactory {
  schemaRepository(): SchemaRepository;

  entityRepository(): EntityRepository;
}

export interface Repository<T> {
  create(obj: T): Promise<T>;

  findAll(): Promise<T[]>;

  findById(id: string): Promise<T>;

  update(obj: T): Promise<T>;

  deleteById(id: string): Promise<void>;
}

export type SchemaRepository = Repository<Schema>;

export interface EntityRepository extends Repository<Entity> {
  findAllBySchemaId(schemaId: string): Promise<Entity[]>;

  getTargets(entity: Entity, relationship: RelationshipAttribute): Promise<Entity[]>

  setTargets(entity: Entity, relationship: RelationshipAttribute, targets: Entity[]): Promise<void>;
}

let factory: RepositoryFactory;

export async function init(url: URL): Promise<RepositoryFactory> {
  LOG.info("Initilizing repositories with protocol: {0}", url.protocol);

  if (url.protocol.startsWith("mongodb")) {
    return factory = await mongo.init(url);
  } else {
    throw Error(`Unsupported repository protocol: ${url.protocol}`);
  }
}

export function schemas(): SchemaRepository {
  if (!factory) {
    throw Error("Repositories have not been initialized.");
  }

  return factory.schemaRepository();
}

export function entities(): EntityRepository {
  if (!factory) {
    throw Error("Repositories have not been initialized.");
  }

  return factory.entityRepository();
}

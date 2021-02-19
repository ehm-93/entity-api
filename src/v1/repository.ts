import { Schema, Entity, Identified } from "./models";
import { logger } from "../utils";

const LOG = logger('/v1/repository');

export interface RepositoryFactory {
  schemaRepository(): SchemaRepository;

  entityRepository(schema: Schema): EntityRepository;
}

export interface Repository<T extends Identified> {
  create(obj: T): Promise<T>;

  findAll(): Promise<T[]>;

  findById(id: string): Promise<T>;

  update(obj: T): Promise<T>;

  deleteById(id: string): Promise<void>;
}

export type SchemaRepository = Repository<Schema>;

export type EntityRepository = Repository<Entity>;

const factoryInitializers = {} as {[index: string]: (url: URL) => Promise<RepositoryFactory>};

export async function init(url: URL): Promise<RepositoryFactory> {
  // url protocols may be formatted like 'mongodb+srv:', we just want to match on the 'mongodb' bit.
  const protocol = url.protocol.slice(0, url.protocol.length - 1).split('+')[0];

  const initializer = factoryInitializers[protocol];

  if (!initializer) {
    throw Error(`Unsupported repository protocol: ${url.protocol}.`);
  }

  LOG.info("Initializing repository for protocol '{0}'.", url.protocol);

  return await initializer(url);
}

export function registerInitializer(protocol: string, initializer:(url: URL) => Promise<RepositoryFactory>): void {
  factoryInitializers[protocol] = initializer;
}

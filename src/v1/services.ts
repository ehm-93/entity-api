import {
    AttributeType,
    Entity,
    NumericAttribute,
    Schema,
    StringAttribute,
    ValidationResult
} from './models';
import {logger} from '../utils';

const LOG = logger('/v1/services');

export interface ServiceFactory {
    entityValidation(): EntityValidationService
}

export class EntityValidationService {
    validate(schema: Schema, entity: Entity): ValidationResult {
        LOG.trace("Validating entity '{0}' against schema '{1}'.", entity.id, schema.id);

        if (entity.schemaId !== schema.id) {
            return {
                valid: false,
                message: 'This entity is not part of this schema'
            };
        }

        const presentKeys = Object.keys(entity);
        const expectedKeys = schema.attributes.filter(a => a.type !== AttributeType.RELATIONSHIP).map(a => a.name);
        const missingKeys = expectedKeys.filter(x => presentKeys.indexOf(x) < 0);

        const result = {
            valid: true,
            messages: {}
        };

        for (const key in entity) {
            if (key === 'id' || key === 'schemaId') {
                continue;
            }

            const value = entity[key];
            const attr = schema.attributes.find(a => a.name === key);

            if (!attr) {
                result.valid = false;
                result.messages[key] = `This attribute is not defined for this schema.`;
                continue;
            }

            if (value == null && attr.required) {
                result.valid = false;
                result.messages[attr.name] = 'This attribute is required.';
                continue;
            }

            switch (attr.type) {
                case AttributeType.STRING: {
                    if (typeof value !== 'string') {
                        result.valid = false;
                        result.messages[attr.name] = `This attribute must be a string but got '${typeof value}'.`;
                        break;
                    }

                    const strAttr = attr as StringAttribute;

                    if (strAttr.maxLength != null && strAttr.maxLength < value.length) {
                        result.valid = false;
                        result.messages[attr.name] = `Max length is ${strAttr.maxLength}.`;
                    }

                    break;
                }
                case AttributeType.NUMERIC: {
                    if (typeof value !== 'number') {
                        result.valid = false;
                        result.messages[attr.name] = `This attribute must be numeric but got '${typeof value}'.`;
                    }

                    const numValue = value as number;
                    const numAttr = attr as NumericAttribute;

                    if (numAttr.max != null && numAttr.max < numValue) {
                        result.valid = false;
                        result.messages[attr.name] = `Max value is ${numAttr.max}.`;
                        break;
                    }

                    if (numAttr.min != null && numValue < numAttr.min) {
                        result.valid = false;
                        result.messages[attr.name] = `Min value is ${numAttr.max}.`;
                        break;
                    }

                    if (numAttr.integer && numValue % 1 !== 0) {
                        result.valid = false;
                        result.messages[attr.name] = `Value must be an integer.`;
                        break;
                    }

                    break;
                }
                case AttributeType.BOOLEAN: {
                    if (typeof value !== 'boolean') {
                        result.valid = false;
                        result.messages[attr.name] = `This attribute must be boolean but got '${typeof value}'.`;
                    }
                    break;
                }
            }
        }

        for (const key of missingKeys) {
            const attr = schema.attributes.find(a => a.name === key);

            if (attr.required) {
                result.valid = false;
                result.messages[attr.name] = "This attribute is required.";
            }
        }

        return result;
    }
}

export function init(): ServiceFactory {
    return {
        entityValidation: () => new EntityValidationService()
    };
}
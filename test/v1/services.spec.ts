import {AttributeType, NumericAttribute, StringAttribute} from '../../src/v1/models';
import * as services from '../../src/v1/services';

import {describe, test} from 'mocha';
import { assert } from 'chai';

describe('Entity validation', () => {
    test('validation must pass', () => {
        const entities = new services.EntityValidationService();

        const result = entities.validate({
            id: "87654321-1234-1234-1234-123456789012",
            display: 'Schema',
            description: 'The schema',
            attributes: [{
                name: 'bool',
                display: "bool",
                description: "The bool",
                required: false,
                type: AttributeType.BOOLEAN
            }, {
                name: 'number',
                display: "number",
                description: "The number",
                required: false,
                type: AttributeType.NUMERIC
            }, {
                name: 'string',
                display: "string",
                description: "The string",
                required: false,
                type: AttributeType.STRING
            }]
        }, {
            id: "12345678-1234-1234-1234-123456789012",
            schemaId: "87654321-1234-1234-1234-123456789012",
            bool: false,
            number: 1.2,
            string: "string"
        });

        assert(result.valid, 'Result should be valid');
    });

    test('Required fields must be required', () => {
        const entities = new services.EntityValidationService();

        const result = entities.validate({
            id: "87654321-1234-1234-1234-123456789012",
            display: 'Schema',
            description: 'The schema',
            attributes: [{
                name: 'bool',
                display: "bool",
                description: "The bool",
                required: true,
                type: AttributeType.BOOLEAN
            }, {
                name: 'number',
                display: "number",
                description: "The number",
                required: true,
                type: AttributeType.NUMERIC
            }, {
                name: 'string',
                display: "string",
                description: "The string",
                required: true,
                type: AttributeType.STRING
            }]
        }, {
            id: "12345678-1234-1234-1234-123456789012",
            schemaId: "87654321-1234-1234-1234-123456789012",
        });

        assert(!result.valid, 'Result should be invalid');
    });

    test('String length must be validated', () => {
        const entities = new services.EntityValidationService();

        const result = entities.validate({
            id: "87654321-1234-1234-1234-123456789012",
            display: 'Schema',
            description: 'The schema',
            attributes: [{
                name: 'bool',
                display: "bool",
                description: "The bool",
                required: false,
                type: AttributeType.BOOLEAN
            }, {
                name: 'number',
                display: "number",
                description: "The number",
                required: false,
                type: AttributeType.NUMERIC,
                min: 0,
                max: 10,
                integer: true
            } as NumericAttribute, {
                name: 'string',
                display: "string",
                description: "The string",
                required: true,
                type: AttributeType.STRING,
                maxLength: 1
            } as StringAttribute]
        }, {
            id: "12345678-1234-1234-1234-123456789012",
            schemaId: "87654321-1234-1234-1234-123456789012",
            string: '123456'
        });

        assert(!result.valid, 'Result should be invalid');
    });

    test('String length must be validated', () => {
        const entities = new services.EntityValidationService();

        const result = entities.validate({
            id: "87654321-1234-1234-1234-123456789012",
            display: 'Schema',
            description: 'The schema',
            attributes: [{
                name: 'bool',
                display: "bool",
                description: "The bool",
                required: false,
                type: AttributeType.BOOLEAN
            }, {
                name: 'number',
                display: "number",
                description: "The number",
                required: false,
                type: AttributeType.NUMERIC,
                min: 0,
                max: 10,
                integer: false
            } as NumericAttribute, {
                name: 'string',
                display: "string",
                description: "The string",
                required: true,
                type: AttributeType.STRING,
                maxLength: 5
            } as StringAttribute]
        }, {
            id: "12345678-1234-1234-1234-123456789012",
            schemaId: "87654321-1234-1234-1234-123456789012",
            string: '12345'
        });

        assert(result.valid, 'Result should be valid');
    });

    test('Number magnitude must be validated', () => {
        const entities = new services.EntityValidationService();

        const result = entities.validate({
            id: "87654321-1234-1234-1234-123456789012",
            display: 'Schema',
            description: 'The schema',
            attributes: [{
                name: 'bool',
                display: "bool",
                description: "The bool",
                required: false,
                type: AttributeType.BOOLEAN
            }, {
                name: 'number',
                display: "number",
                description: "The number",
                required: true,
                type: AttributeType.NUMERIC,
                min: 0,
                max: 10,
                integer: true
            } as NumericAttribute, {
                name: 'string',
                display: "string",
                description: "The string",
                required: false,
                type: AttributeType.STRING,
                maxLength: 1
            } as StringAttribute]
        }, {
            id: "12345678-1234-1234-1234-123456789012",
            schemaId: "87654321-1234-1234-1234-123456789012",
            number: 0
        });

        assert(result.valid, 'Result should be valid');
    });

    test('Number magnitude must be validated', () => {
        const entities = new services.EntityValidationService();

        const result = entities.validate({
            id: "87654321-1234-1234-1234-123456789012",
            display: 'Schema',
            description: 'The schema',
            attributes: [{
                name: 'bool',
                display: "bool",
                description: "The bool",
                required: false,
                type: AttributeType.BOOLEAN
            }, {
                name: 'number',
                display: "number",
                description: "The number",
                required: true,
                type: AttributeType.NUMERIC,
                min: 0,
                max: 10,
                integer: true
            } as NumericAttribute, {
                name: 'string',
                display: "string",
                description: "The string",
                required: false,
                type: AttributeType.STRING,
                maxLength: 1
            } as StringAttribute]
        }, {
            id: "12345678-1234-1234-1234-123456789012",
            schemaId: "87654321-1234-1234-1234-123456789012",
            number: -1
        });

        assert(!result.valid, 'Result should be valid');
    });

    test('Number magnitude must be validated', () => {
        const entities = new services.EntityValidationService();

        const result = entities.validate({
            id: "87654321-1234-1234-1234-123456789012",
            display: 'Schema',
            description: 'The schema',
            attributes: [{
                name: 'bool',
                display: "bool",
                description: "The bool",
                required: false,
                type: AttributeType.BOOLEAN
            }, {
                name: 'number',
                display: "number",
                description: "The number",
                required: true,
                type: AttributeType.NUMERIC,
                min: 0,
                max: 10,
                integer: true
            } as NumericAttribute, {
                name: 'string',
                display: "string",
                description: "The string",
                required: false,
                type: AttributeType.STRING,
                maxLength: 1
            } as StringAttribute]
        }, {
            id: "12345678-1234-1234-1234-123456789012",
            schemaId: "87654321-1234-1234-1234-123456789012",
            number: 10
        });

        assert(result.valid, 'Result should be valid');
    });

    test('Number magnitude must be validated', () => {
        const entities = new services.EntityValidationService();

        const result = entities.validate({
            id: "87654321-1234-1234-1234-123456789012",
            display: 'Schema',
            description: 'The schema',
            attributes: [{
                name: 'bool',
                display: "bool",
                description: "The bool",
                required: false,
                type: AttributeType.BOOLEAN
            }, {
                name: 'number',
                display: "number",
                description: "The number",
                required: true,
                type: AttributeType.NUMERIC,
                min: 0,
                max: 10,
                integer: true
            } as NumericAttribute, {
                name: 'string',
                display: "string",
                description: "The string",
                required: false,
                type: AttributeType.STRING,
                maxLength: 1
            } as StringAttribute]
        }, {
            id: "12345678-1234-1234-1234-123456789012",
            schemaId: "87654321-1234-1234-1234-123456789012",
            number: 11
        });

        assert(!result.valid, 'Result should be valid');
    });
});
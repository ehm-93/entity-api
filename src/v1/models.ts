export interface Entity {
    id: string,
    schemaId: string
    [index: string]: string | number | boolean;
}

export interface Schema {
    id: string,
    display: string,
    description: string
    attributes: Attribute[]
}

export interface Attribute {
    type: AttributeType,
    name: string,
    display: string,
    description: string,
    required: boolean
}

export interface StringAttribute extends Attribute {
    maxLength: number
}

export interface NumericAttribute extends Attribute {
    min: number,
    max: number,
    integer: boolean
}

export type BooleanAttribute = Attribute

export interface RelationshipAttribute extends Attribute {
    cardinality: Cardinality,
    targetId: string
}

export enum AttributeType {
    STRING = "StringAttribute",
    NUMERIC = "NumericAttribute",
    BOOLEAN = "BooleanAttribute",
    RELATIONSHIP = "RelationshipAttribute"
}

export enum Cardinality {
    ONE_TO_ONE,
    ONE_TO_MANY,
    MANY_TO_ONE,
    MANY_TO_MANY
}

export interface ValidationResult {
    valid: boolean,
    message?: string
    messages?: {[index: string]: string}
}

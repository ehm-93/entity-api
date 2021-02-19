export interface Identified {
    id: string
}

export interface Entity extends Identified {
    schemaId: string
    [index: string]: string | number | boolean | Entity | Entity[];
}

export interface Schema extends Identified {
    display: string,
    description: string
    attributes: Attribute[]
}

export interface Attribute {
    type: AttributeType,
    name: string,
    display: string,
    description: string,
    required: boolean,

    maxLength?: number,

    min?: number,
    max?: number,
    integer?: boolean

    cardinality?: Cardinality,
    targetId?: string
}

export enum AttributeType {
    STRING = "StringAttribute",
    NUMERIC = "NumericAttribute",
    BOOLEAN = "BooleanAttribute",
    RELATIONSHIP = "RelationshipAttribute"
}

export enum Cardinality {
    ONE_TO_ONE = "OneToEne",
    ONE_TO_MANY = "OneToMany",
    MANY_TO_ONE = "ManyToOne",
    MANY_TO_MANY = "ManyToMany"
}

export interface ValidationResult {
    valid: boolean,
    message?: string
    messages?: {[index: string]: string}
}

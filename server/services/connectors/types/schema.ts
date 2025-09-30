import { z } from 'zod';

/**
 * Database primitive types that can be mapped across different database systems
 */
export enum DatabaseType {
  // Numeric types
  INTEGER = 'integer',
  BIGINT = 'bigint',
  DECIMAL = 'decimal',
  NUMERIC = 'numeric',
  REAL = 'real',
  DOUBLE = 'double',
  FLOAT = 'float',
  SERIAL = 'serial',
  BIGSERIAL = 'bigserial',
  
  // String types
  TEXT = 'text',
  VARCHAR = 'varchar',
  CHAR = 'char',
  UUID = 'uuid',
  URL = 'url',
  
  // Date/Time types
  DATE = 'date',
  TIME = 'time',
  TIMESTAMP = 'timestamp',
  TIMESTAMPTZ = 'timestamptz',
  INTERVAL = 'interval',
  
  // Boolean
  BOOLEAN = 'boolean',
  
  // JSON types
  JSON = 'json',
  JSONB = 'jsonb',
  JSON_SCHEMA = 'json_schema',
  
  // Binary types
  BYTEA = 'bytea',
  BLOB = 'blob',
  ATTACHMENT = 'attachment',
  
  // Array types
  ARRAY = 'array',
  
  // NoSQL/Document types
  DOCUMENT = 'document',
  MAP = 'map',
  NESTED_OBJECT = 'nested_object',
  
  // Firebase-specific types
  REFERENCE = 'reference',
  GEOPOINT = 'geopoint',
  
  // Airtable/API field types
  SINGLE_SELECT = 'single_select',
  MULTIPLE_SELECT = 'multiple_select',
  MULTISELECT = 'multiselect',
  RATING = 'rating',
  CHECKBOX = 'checkbox',
  CURRENCY = 'currency',
  
  // Enum
  ENUM = 'enum',
  
  // Unknown/Other
  UNKNOWN = 'unknown'
}

/**
 * Column constraint types
 */
export enum ConstraintType {
  PRIMARY_KEY = 'primary_key',
  FOREIGN_KEY = 'foreign_key',
  UNIQUE = 'unique',
  NOT_NULL = 'not_null',
  CHECK = 'check',
  DEFAULT = 'default',
  INDEX = 'index'
}

/**
 * Foreign key reference actions
 */
export enum ReferenceAction {
  CASCADE = 'CASCADE',
  RESTRICT = 'RESTRICT',
  SET_NULL = 'SET_NULL',
  SET_DEFAULT = 'SET_DEFAULT',
  NO_ACTION = 'NO_ACTION'
}

/**
 * Index types
 */
export enum IndexType {
  BTREE = 'btree',
  HASH = 'hash',
  GIN = 'gin',
  GIST = 'gist',
  BRIN = 'brin',
  SPGIST = 'spgist'
}

/**
 * Column definition interface
 */
export interface ColumnDefinition {
  name: string;
  type: DatabaseType;
  nullable: boolean;
  defaultValue?: any;
  maxLength?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
  arrayDimensions?: number;
  comment?: string;
  
  // Constraints
  isPrimaryKey: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
  
  // Foreign key info
  foreignKey?: {
    referencedTable: string;
    referencedColumn: string;
    onUpdate?: ReferenceAction;
    onDelete?: ReferenceAction;
  };
  
  // Additional metadata
  originalType: string; // Original database-specific type
  metadata?: Record<string, any>;
}

/**
 * Index definition interface
 */
export interface IndexDefinition {
  name: string;
  tableName: string;
  columns: string[];
  type: IndexType;
  isUnique: boolean;
  isPrimaryKey: boolean;
  condition?: string; // For partial indexes
  metadata?: Record<string, any>;
}

/**
 * Constraint definition interface
 */
export interface ConstraintDefinition {
  name: string;
  type: ConstraintType;
  tableName: string;
  columns: string[];
  
  // For foreign keys
  referencedTable?: string;
  referencedColumns?: string[];
  onUpdate?: ReferenceAction;
  onDelete?: ReferenceAction;
  
  // For check constraints
  checkExpression?: string;
  
  // For default constraints
  defaultValue?: any;
  
  metadata?: Record<string, any>;
}

/**
 * Table definition interface
 */
export interface TableDefinition {
  name: string;
  schema: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
  primaryKey: string[];
  comment?: string;
  
  // Relationships
  foreignKeys: {
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
    constraintName: string;
    onUpdate?: ReferenceAction;
    onDelete?: ReferenceAction;
  }[];
  
  // Additional metadata
  rowCount?: number;
  estimatedSize?: number;
  lastModified?: Date;
  metadata?: Record<string, any>;
}

/**
 * Database schema definition interface
 */
export interface DatabaseSchema {
  name: string;
  tables: TableDefinition[];
  views: ViewDefinition[];
  functions: FunctionDefinition[];
  procedures: ProcedureDefinition[];
  triggers: TriggerDefinition[];
  sequences: SequenceDefinition[];
  
  // Schema metadata
  version?: string;
  charset?: string;
  collation?: string;
  metadata?: Record<string, any>;
}

/**
 * Document field definition for NoSQL databases
 */
export interface DocumentFieldDefinition {
  name: string;
  type: DatabaseType;
  nullable: boolean;
  nested?: boolean;
  arrayElement?: boolean;
  nestedDepth?: number;
  
  // Field properties
  maxLength?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
  
  // NoSQL-specific properties
  isOptional?: boolean;
  defaultValue?: any;
  fieldPath?: string; // Full path for nested fields (e.g., "user.profile.name")
  
  // For nested objects and arrays
  nestedFields?: DocumentFieldDefinition[];
  arrayElementType?: DatabaseType;
  
  // Sampling metadata
  prevalence?: number; // Percentage of documents containing this field
  sampleValues?: any[];
  
  // Additional metadata
  originalType?: string;
  comment?: string;
  metadata?: Record<string, any>;
}

/**
 * Collection definition for document databases
 */
export interface CollectionDefinition {
  name: string;
  database: string;
  fields: DocumentFieldDefinition[];
  
  // Collection metadata
  documentCount?: number;
  avgDocumentSize?: number;
  estimatedSize?: number;
  lastModified?: Date;
  
  // Schema sampling information
  sampleSize?: number;
  samplingDate?: Date;
  schemaVersion?: string;
  
  // Indexes for document databases
  indexes: {
    name: string;
    fields: string[];
    type: 'single' | 'compound' | 'text' | 'geospatial' | 'sparse';
    unique?: boolean;
    sparse?: boolean;
    partialFilter?: any;
    metadata?: Record<string, any>;
  }[];
  
  // Sub-collections (for databases like Firestore)
  subCollections?: {
    name: string;
    path: string;
    collection: CollectionDefinition;
  }[];
  
  comment?: string;
  metadata?: Record<string, any>;
}

/**
 * Document database schema interface
 */
export interface DocumentSchema {
  name: string;
  type: 'document' | 'nosql';
  collections: CollectionDefinition[];
  
  // Schema materialization info
  materializationStrategy: 'sample' | 'infer' | 'manual';
  lastMaterialized?: Date;
  sampleDocumentCount?: number;
  
  // Database metadata
  version?: string;
  capabilities?: string[];
  features?: {
    transactions?: boolean;
    realTimeSync?: boolean;
    fullTextSearch?: boolean;
    geospatialQueries?: boolean;
    aggregation?: boolean;
  };
  
  metadata?: Record<string, any>;
}

/**
 * REST API field definition
 */
export interface RESTFieldDefinition {
  name: string;
  type: DatabaseType;
  nullable: boolean;
  
  // Field properties
  maxLength?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
  
  // REST/API-specific properties
  required?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  format?: string; // e.g., 'email', 'uri', 'date-time'
  
  // Validation rules
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  
  // API field metadata
  description?: string;
  example?: any;
  defaultValue?: any;
  
  // For reference fields
  referenceTo?: string; // Referenced resource/table
  displayField?: string; // Field to display for references
  
  // Additional metadata
  originalType?: string;
  apiFieldName?: string; // Original API field name if different
  metadata?: Record<string, any>;
}

/**
 * REST resource definition (equivalent to table for APIs)
 */
export interface RESTResourceDefinition {
  name: string;
  endpoint: string;
  fields: RESTFieldDefinition[];
  
  // HTTP methods supported
  supportedMethods: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[];
  
  // Pagination support
  pagination?: {
    type: 'offset' | 'cursor' | 'page' | 'token';
    paramNames?: {
      limit?: string;
      offset?: string;
      cursor?: string;
      page?: string;
      pageSize?: string;
    };
    maxLimit?: number;
    defaultLimit?: number;
  };
  
  // Filtering and sorting
  filtering?: {
    supportedOperators: string[];
    supportedFields: string[];
    queryParamStyle: 'simple' | 'nested' | 'custom';
  };
  
  sorting?: {
    supportedFields: string[];
    defaultSort?: string;
    sortParamName?: string;
  };
  
  // Resource metadata
  primaryKey?: string;
  displayField?: string;
  recordCount?: number;
  
  // Rate limiting info
  rateLimits?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  
  comment?: string;
  metadata?: Record<string, any>;
}

/**
 * REST API schema interface
 */
export interface RESTSchema {
  name: string;
  type: 'rest' | 'api';
  baseUrl: string;
  resources: RESTResourceDefinition[];
  
  // API metadata
  version?: string;
  title?: string;
  description?: string;
  
  // Authentication info
  authentication?: {
    type: 'none' | 'api_key' | 'oauth2' | 'bearer' | 'basic';
    location?: 'header' | 'query' | 'cookie';
    paramName?: string;
    scopes?: string[];
    authUrl?: string;
    tokenUrl?: string;
  };
  
  // Global rate limiting
  globalRateLimits?: {
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
    burstLimit?: number;
  };
  
  // Request/response format
  requestFormat?: 'json' | 'xml' | 'form-data' | 'form-urlencoded';
  responseFormat?: 'json' | 'xml' | 'csv' | 'binary';
  
  // Error handling
  errorFormat?: {
    structure: 'simple' | 'detailed' | 'custom';
    errorCodeField?: string;
    errorMessageField?: string;
    errorDetailsField?: string;
  };
  
  // Capabilities
  capabilities?: string[];
  features?: {
    realTimeWebhooks?: boolean;
    bulkOperations?: boolean;
    transactions?: boolean;
    fieldLevelPermissions?: boolean;
    auditLog?: boolean;
  };
  
  metadata?: Record<string, any>;
}

/**
 * View definition interface
 */
export interface ViewDefinition {
  name: string;
  schema: string;
  definition: string;
  columns: ColumnDefinition[];
  comment?: string;
  metadata?: Record<string, any>;
}

/**
 * Function/Procedure definition interface
 */
export interface FunctionDefinition {
  name: string;
  schema: string;
  returnType?: string;
  parameters: {
    name: string;
    type: string;
    direction: 'IN' | 'OUT' | 'INOUT';
    defaultValue?: any;
  }[];
  definition: string;
  language: string;
  comment?: string;
  metadata?: Record<string, any>;
}

/**
 * Procedure definition interface
 */
export interface ProcedureDefinition {
  name: string;
  schema: string;
  parameters: {
    name: string;
    type: string;
    direction: 'IN' | 'OUT' | 'INOUT';
    defaultValue?: any;
  }[];
  definition: string;
  language: string;
  comment?: string;
  metadata?: Record<string, any>;
}

/**
 * Trigger definition interface
 */
export interface TriggerDefinition {
  name: string;
  tableName: string;
  schema: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  definition: string;
  enabled: boolean;
  metadata?: Record<string, any>;
}

/**
 * Sequence definition interface
 */
export interface SequenceDefinition {
  name: string;
  schema: string;
  startValue: number;
  increment: number;
  minValue?: number;
  maxValue?: number;
  cycle: boolean;
  cache?: number;
  metadata?: Record<string, any>;
}

/**
 * Schema comparison result
 */
export interface SchemaComparison {
  hasChanges: boolean;
  addedTables: TableDefinition[];
  removedTables: TableDefinition[];
  modifiedTables: {
    table: TableDefinition;
    changes: {
      addedColumns: ColumnDefinition[];
      removedColumns: ColumnDefinition[];
      modifiedColumns: {
        old: ColumnDefinition;
        new: ColumnDefinition;
        changes: string[];
      }[];
      addedIndexes: IndexDefinition[];
      removedIndexes: IndexDefinition[];
      addedConstraints: ConstraintDefinition[];
      removedConstraints: ConstraintDefinition[];
    };
  }[];
  addedViews: ViewDefinition[];
  removedViews: ViewDefinition[];
  modifiedViews: {
    old: ViewDefinition;
    new: ViewDefinition;
  }[];
}

/**
 * Validation schemas for runtime type checking
 */
export const DatabaseTypeSchema = z.nativeEnum(DatabaseType);
export const ConstraintTypeSchema = z.nativeEnum(ConstraintType);
export const ReferenceActionSchema = z.nativeEnum(ReferenceAction);
export const IndexTypeSchema = z.nativeEnum(IndexType);

export const ColumnDefinitionSchema = z.object({
  name: z.string(),
  type: DatabaseTypeSchema,
  nullable: z.boolean(),
  defaultValue: z.any().optional(),
  maxLength: z.number().optional(),
  precision: z.number().optional(),
  scale: z.number().optional(),
  enumValues: z.array(z.string()).optional(),
  arrayDimensions: z.number().optional(),
  comment: z.string().optional(),
  isPrimaryKey: z.boolean(),
  isUnique: z.boolean(),
  isAutoIncrement: z.boolean(),
  foreignKey: z.object({
    referencedTable: z.string(),
    referencedColumn: z.string(),
    onUpdate: ReferenceActionSchema.optional(),
    onDelete: ReferenceActionSchema.optional(),
  }).optional(),
  originalType: z.string(),
  metadata: z.record(z.any()).optional(),
});

export const TableDefinitionSchema = z.object({
  name: z.string(),
  schema: z.string(),
  columns: z.array(ColumnDefinitionSchema),
  indexes: z.array(z.object({
    name: z.string(),
    tableName: z.string(),
    columns: z.array(z.string()),
    type: IndexTypeSchema,
    isUnique: z.boolean(),
    isPrimaryKey: z.boolean(),
    condition: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })),
  constraints: z.array(z.object({
    name: z.string(),
    type: ConstraintTypeSchema,
    tableName: z.string(),
    columns: z.array(z.string()),
    referencedTable: z.string().optional(),
    referencedColumns: z.array(z.string()).optional(),
    onUpdate: ReferenceActionSchema.optional(),
    onDelete: ReferenceActionSchema.optional(),
    checkExpression: z.string().optional(),
    defaultValue: z.any().optional(),
    metadata: z.record(z.any()).optional(),
  })),
  primaryKey: z.array(z.string()),
  comment: z.string().optional(),
  foreignKeys: z.array(z.object({
    columnName: z.string(),
    referencedTable: z.string(),
    referencedColumn: z.string(),
    constraintName: z.string(),
    onUpdate: ReferenceActionSchema.optional(),
    onDelete: ReferenceActionSchema.optional(),
  })),
  rowCount: z.number().optional(),
  estimatedSize: z.number().optional(),
  lastModified: z.date().optional(),
  metadata: z.record(z.any()).optional(),
});

export const DatabaseSchemaSchema = z.object({
  name: z.string(),
  tables: z.array(TableDefinitionSchema),
  views: z.array(z.object({
    name: z.string(),
    schema: z.string(),
    definition: z.string(),
    columns: z.array(ColumnDefinitionSchema),
    comment: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })),
  functions: z.array(z.object({
    name: z.string(),
    schema: z.string(),
    returnType: z.string().optional(),
    parameters: z.array(z.object({
      name: z.string(),
      type: z.string(),
      direction: z.enum(['IN', 'OUT', 'INOUT']),
      defaultValue: z.any().optional(),
    })),
    definition: z.string(),
    language: z.string(),
    comment: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })),
  procedures: z.array(z.object({
    name: z.string(),
    schema: z.string(),
    parameters: z.array(z.object({
      name: z.string(),
      type: z.string(),
      direction: z.enum(['IN', 'OUT', 'INOUT']),
      defaultValue: z.any().optional(),
    })),
    definition: z.string(),
    language: z.string(),
    comment: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })),
  triggers: z.array(z.object({
    name: z.string(),
    tableName: z.string(),
    schema: z.string(),
    event: z.enum(['INSERT', 'UPDATE', 'DELETE']),
    timing: z.enum(['BEFORE', 'AFTER', 'INSTEAD OF']),
    definition: z.string(),
    enabled: z.boolean(),
    metadata: z.record(z.any()).optional(),
  })),
  sequences: z.array(z.object({
    name: z.string(),
    schema: z.string(),
    startValue: z.number(),
    increment: z.number(),
    minValue: z.number().optional(),
    maxValue: z.number().optional(),
    cycle: z.boolean(),
    cache: z.number().optional(),
    metadata: z.record(z.any()).optional(),
  })),
  version: z.string().optional(),
  charset: z.string().optional(),
  collation: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Type inference helpers
 */
export type DatabaseSchemaType = z.infer<typeof DatabaseSchemaSchema>;
export type TableDefinitionType = z.infer<typeof TableDefinitionSchema>;
export type ColumnDefinitionType = z.infer<typeof ColumnDefinitionSchema>;
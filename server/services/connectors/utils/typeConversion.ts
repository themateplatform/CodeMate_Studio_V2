import { z } from 'zod';
import {
  DatabaseType,
  ColumnDefinition,
  TableDefinition,
  DatabaseSchema,
  DocumentFieldDefinition,
  RESTFieldDefinition,
  CollectionDefinition,
  RESTResourceDefinition
} from '../types/schema';

/**
 * Configuration options for type conversion
 */
export interface TypeConversionConfig {
  // Numeric handling options
  bigIntHandling: 'number' | 'bigint' | 'string';
  decimalHandling: 'number' | 'string';
  precisionLoss: 'allow' | 'warn' | 'error';
  
  // Date/time handling options
  dateTimeFormat: 'iso' | 'timestamp' | 'native';
  timezoneHandling: 'preserve' | 'utc' | 'local';
  
  // NoSQL/Document options
  nestedObjectMaxDepth: number;
  arrayTypeInference: 'strict' | 'loose' | 'any';
  optionalFieldHandling: 'nullable' | 'optional' | 'both';
  
  // REST/API options
  enumValidation: 'strict' | 'loose';
  urlValidation: boolean;
  attachmentHandling: 'url' | 'buffer' | 'base64';
  
  // General options
  unknownTypeHandling: 'any' | 'string' | 'error';
  nullableByDefault: boolean;
  
  // Connector-specific overrides
  connectorType?: string;
  customTypeMapping?: Record<string, (field: any, config: TypeConversionConfig) => z.ZodType<any>>;
}

/**
 * Default type conversion configuration
 */
export const DEFAULT_TYPE_CONVERSION_CONFIG: TypeConversionConfig = {
  bigIntHandling: 'number',
  decimalHandling: 'number',
  precisionLoss: 'warn',
  dateTimeFormat: 'iso',
  timezoneHandling: 'preserve',
  nestedObjectMaxDepth: 10,
  arrayTypeInference: 'loose',
  optionalFieldHandling: 'both',
  enumValidation: 'strict',
  urlValidation: true,
  attachmentHandling: 'url',
  unknownTypeHandling: 'any',
  nullableByDefault: false
};

/**
 * Enhanced type conversion utilities for database types to Zod schemas and vice versa
 */
export class TypeConversionUtils {
  
  /**
   * Convert database type to Zod schema with configurable options
   */
  static databaseTypeToZod(
    column: ColumnDefinition | DocumentFieldDefinition | RESTFieldDefinition, 
    config: TypeConversionConfig = DEFAULT_TYPE_CONVERSION_CONFIG
  ): z.ZodType<any> {
    let schema: z.ZodType<any>;
    
    // Check for custom type mapping first
    if (config.customTypeMapping && config.customTypeMapping[column.type]) {
      return config.customTypeMapping[column.type](column, config);
    }
    
    switch (column.type) {
      case DatabaseType.INTEGER:
      case DatabaseType.SERIAL:
        schema = z.number().int();
        break;
        
      case DatabaseType.BIGINT:
      case DatabaseType.BIGSERIAL:
        switch (config.bigIntHandling) {
          case 'bigint':
            schema = z.bigint();
            break;
          case 'string':
            schema = z.string().regex(/^-?\d+$/);
            break;
          default:
            schema = z.number().int();
            break;
        }
        break;
        
      case DatabaseType.DECIMAL:
      case DatabaseType.NUMERIC:
        switch (config.decimalHandling) {
          case 'string':
            schema = z.string().regex(/^-?\d+(\.\d+)?$/);
            break;
          default:
            schema = z.number();
            break;
        }
        break;
        
      case DatabaseType.REAL:
      case DatabaseType.DOUBLE:
      case DatabaseType.FLOAT:
        schema = z.number();
        break;
        
      case DatabaseType.TEXT:
      case DatabaseType.VARCHAR:
      case DatabaseType.CHAR:
        schema = z.string();
        if (column.maxLength) {
          schema = (schema as z.ZodString).max(column.maxLength);
        }
        break;
        
      case DatabaseType.UUID:
        schema = z.string().uuid();
        break;
        
      case DatabaseType.URL:
        schema = config.urlValidation ? z.string().url() : z.string();
        break;
        
      case DatabaseType.DATE:
        schema = this.createDateTimeSchema(config, 'date');
        break;
        
      case DatabaseType.TIME:
        schema = z.string().regex(/^\d{2}:\d{2}:\d{2}(\.\d{3})?$/);
        break;
        
      case DatabaseType.TIMESTAMP:
      case DatabaseType.TIMESTAMPTZ:
        schema = this.createDateTimeSchema(config, 'timestamp');
        break;
        
      case DatabaseType.INTERVAL:
        schema = z.string();
        break;
        
      case DatabaseType.BOOLEAN:
      case DatabaseType.CHECKBOX:
        schema = z.boolean();
        break;
        
      case DatabaseType.JSON:
      case DatabaseType.JSONB:
      case DatabaseType.JSON_SCHEMA:
        schema = z.any(); // Could be more specific based on use case
        break;
        
      case DatabaseType.BYTEA:
      case DatabaseType.BLOB:
        schema = z.instanceof(Buffer).or(z.string());
        break;
        
      case DatabaseType.ATTACHMENT:
        switch (config.attachmentHandling) {
          case 'buffer':
            schema = z.instanceof(Buffer);
            break;
          case 'base64':
            schema = z.string().regex(/^[A-Za-z0-9+/]+=*$/);
            break;
          default:
            schema = z.string().url();
            break;
        }
        break;
        
      case DatabaseType.ARRAY:
        // Enhanced array handling based on configuration
        const elementType = this.inferArrayElementType(column, config);
        schema = z.array(elementType);
        break;
        
      case DatabaseType.DOCUMENT:
      case DatabaseType.MAP:
      case DatabaseType.NESTED_OBJECT:
        schema = this.createNestedObjectSchema(column, config);
        break;
        
      case DatabaseType.REFERENCE:
        // References are typically string IDs or structured objects
        schema = z.string().or(z.object({}));
        break;
        
      case DatabaseType.GEOPOINT:
        schema = z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180)
        }).or(z.array(z.number()).length(2));
        break;
        
      case DatabaseType.SINGLE_SELECT:
      case DatabaseType.ENUM:
        if (column.enumValues && column.enumValues.length > 0) {
          if (config.enumValidation === 'strict') {
            schema = z.enum(column.enumValues as [string, ...string[]]);
          } else {
            schema = z.string();
          }
        } else {
          schema = z.string();
        }
        break;
        
      case DatabaseType.MULTIPLE_SELECT:
      case DatabaseType.MULTISELECT:
        if (column.enumValues && column.enumValues.length > 0) {
          const enumSchema = z.enum(column.enumValues as [string, ...string[]]);
          schema = z.array(enumSchema);
        } else {
          schema = z.array(z.string());
        }
        break;
        
      case DatabaseType.RATING:
        schema = z.number().min(0).max(5); // Assuming 0-5 rating scale
        break;
        
      case DatabaseType.CURRENCY:
        // Currency can be stored as number or string depending on precision needs
        schema = config.decimalHandling === 'string' 
          ? z.string().regex(/^\d+(\.\d{2})?$/) 
          : z.number();
        break;
        
      default:
        switch (config.unknownTypeHandling) {
          case 'string':
            schema = z.string();
            break;
          case 'error':
            throw new Error(`Unknown database type: ${column.type}`);
          default:
            schema = z.any();
            break;
        }
        break;
    }
    
    // Handle nullable/optional fields based on configuration
    schema = this.applyNullableHandling(schema, column, config);
    
    // Handle default values
    if (column.defaultValue !== undefined && column.defaultValue !== null) {
      schema = schema.default(column.defaultValue);
    }
    
    return schema;
  }
  
  /**
   * Create date/time schema based on configuration
   */
  private static createDateTimeSchema(config: TypeConversionConfig, type: 'date' | 'timestamp'): z.ZodType<any> {
    switch (config.dateTimeFormat) {
      case 'timestamp':
        return z.number().int().positive();
      case 'native':
        return z.date();
      default:
        return z.string().datetime().or(z.date());
    }
  }
  
  /**
   * Infer array element type based on column metadata
   */
  private static inferArrayElementType(
    column: ColumnDefinition | DocumentFieldDefinition | RESTFieldDefinition, 
    config: TypeConversionConfig
  ): z.ZodType<any> {
    // Check if array element type is specified
    if ('arrayElementType' in column && column.arrayElementType) {
      const elementColumn = { ...column, type: column.arrayElementType };
      return this.databaseTypeToZod(elementColumn, config);
    }
    
    // Check nested fields for document types
    if ('nestedFields' in column && column.nestedFields && column.nestedFields.length > 0) {
      return this.createDocumentFieldSchema(column.nestedFields, config);
    }
    
    switch (config.arrayTypeInference) {
      case 'strict':
        return z.unknown();
      case 'any':
        return z.any();
      default:
        return z.any();
    }
  }
  
  /**
   * Create nested object schema for document/NoSQL types
   */
  private static createNestedObjectSchema(
    column: ColumnDefinition | DocumentFieldDefinition | RESTFieldDefinition,
    config: TypeConversionConfig,
    depth: number = 0
  ): z.ZodType<any> {
    if (depth >= config.nestedObjectMaxDepth) {
      return z.any(); // Prevent infinite recursion
    }
    
    if ('nestedFields' in column && column.nestedFields && column.nestedFields.length > 0) {
      return this.createDocumentFieldSchema(column.nestedFields, config, depth + 1);
    }
    
    return z.record(z.any()); // Generic object
  }
  
  /**
   * Apply nullable/optional handling based on configuration
   */
  private static applyNullableHandling(
    schema: z.ZodType<any>,
    column: ColumnDefinition | DocumentFieldDefinition | RESTFieldDefinition,
    config: TypeConversionConfig
  ): z.ZodType<any> {
    const isNullable = column.nullable || config.nullableByDefault;
    const isOptional = 'isOptional' in column ? column.isOptional : false;
    const isRequired = 'required' in column ? column.required : !isOptional;
    
    switch (config.optionalFieldHandling) {
      case 'nullable':
        return isNullable ? schema.nullable() : schema;
      case 'optional':
        return (!isRequired || isOptional) ? schema.optional() : schema;
      case 'both':
        let result = schema;
        if (isNullable) result = result.nullable();
        if (!isRequired || isOptional) result = result.optional();
        return result;
      default:
        return schema;
    }
  }
  
  /**
   * Create schema for document fields (NoSQL)
   */
  private static createDocumentFieldSchema(
    fields: DocumentFieldDefinition[], 
    config: TypeConversionConfig = DEFAULT_TYPE_CONVERSION_CONFIG,
    depth: number = 0
  ): z.ZodObject<any> {
    if (depth >= config.nestedObjectMaxDepth) {
      return z.object({}).passthrough(); // Allow additional properties
    }
    
    const shape: Record<string, z.ZodType<any>> = {};
    
    for (const field of fields) {
      shape[field.name] = this.databaseTypeToZod(field, config);
    }
    
    return z.object(shape);
  }
  
  /**
   * Convert collection definition to Zod object schema
   */
  static collectionToZodSchema(
    collection: CollectionDefinition, 
    config: TypeConversionConfig = DEFAULT_TYPE_CONVERSION_CONFIG
  ): z.ZodObject<any> {
    return this.createDocumentFieldSchema(collection.fields, config);
  }
  
  /**
   * Generate insert schema for document collection (excludes auto-generated fields)
   */
  static collectionToInsertSchema(
    collection: CollectionDefinition, 
    config: TypeConversionConfig = DEFAULT_TYPE_CONVERSION_CONFIG
  ): z.ZodObject<any> {
    const shape: Record<string, z.ZodType<any>> = {};
    
    for (const field of collection.fields) {
      // Skip auto-generated fields like _id
      if (field.name === '_id' || field.name === 'id') {
        continue;
      }
      
      let schema = this.databaseTypeToZod(field, config);
      
      // For insert operations, make optional fields truly optional
      if (field.isOptional || field.defaultValue !== undefined) {
        schema = schema.optional();
      }
      
      shape[field.name] = schema;
    }
    
    return z.object(shape);
  }
  
  /**
   * Convert REST resource definition to Zod object schema
   */
  static restResourceToZodSchema(
    resource: RESTResourceDefinition, 
    config: TypeConversionConfig = DEFAULT_TYPE_CONVERSION_CONFIG
  ): z.ZodObject<any> {
    const shape: Record<string, z.ZodType<any>> = {};
    
    for (const field of resource.fields) {
      shape[field.name] = this.databaseTypeToZod(field, config);
    }
    
    return z.object(shape);
  }
  
  /**
   * Generate insert schema for REST resource (excludes read-only fields)
   */
  static restResourceToInsertSchema(
    resource: RESTResourceDefinition, 
    config: TypeConversionConfig = DEFAULT_TYPE_CONVERSION_CONFIG
  ): z.ZodObject<any> {
    const shape: Record<string, z.ZodType<any>> = {};
    
    for (const field of resource.fields) {
      // Skip read-only fields for insert operations
      if (field.readOnly) {
        continue;
      }
      
      let schema = this.databaseTypeToZod(field, config);
      
      // For insert operations, handle required vs optional fields
      if (!field.required) {
        schema = schema.optional();
      }
      
      shape[field.name] = schema;
    }
    
    return z.object(shape);
  }
  
  /**
   * Generate update schema for REST resource (excludes read-only, makes all optional)
   */
  static restResourceToUpdateSchema(
    resource: RESTResourceDefinition, 
    config: TypeConversionConfig = DEFAULT_TYPE_CONVERSION_CONFIG
  ): z.ZodObject<any> {
    const shape: Record<string, z.ZodType<any>> = {};
    
    for (const field of resource.fields) {
      // Skip read-only fields for update operations
      if (field.readOnly) {
        continue;
      }
      
      let schema = this.databaseTypeToZod(field, config);
      
      // For update operations, make all fields optional for partial updates
      schema = schema.optional();
      
      shape[field.name] = schema;
    }
    
    return z.object(shape).partial(); // Make entire object partial
  }
  
  /**
   * Enhanced validation for document data with sampling support
   */
  static validateDocumentData(
    collection: CollectionDefinition, 
    data: Record<string, any>, 
    operation: 'insert' | 'update' = 'insert',
    config: TypeConversionConfig = DEFAULT_TYPE_CONVERSION_CONFIG
  ): { valid: boolean; errors: z.ZodError['errors'] | null; validatedData?: any } {
    try {
      const schema = operation === 'insert' 
        ? this.collectionToInsertSchema(collection, config)
        : this.collectionToZodSchema(collection, config).partial();
      
      const validatedData = schema.parse(data);
      
      return {
        valid: true,
        errors: null,
        validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors
        };
      }
      
      return {
        valid: false,
        errors: [{ 
          code: 'custom',
          path: [],
          message: 'Validation failed with unknown error'
        }] as z.ZodError['errors']
      };
    }
  }
  
  /**
   * Enhanced validation for REST API data
   */
  static validateRestData(
    resource: RESTResourceDefinition, 
    data: Record<string, any>, 
    operation: 'insert' | 'update' = 'insert',
    config: TypeConversionConfig = DEFAULT_TYPE_CONVERSION_CONFIG
  ): { valid: boolean; errors: z.ZodError['errors'] | null; validatedData?: any } {
    try {
      let schema: z.ZodObject<any>;
      
      switch (operation) {
        case 'insert':
          schema = this.restResourceToInsertSchema(resource, config);
          break;
        case 'update':
          schema = this.restResourceToUpdateSchema(resource, config);
          break;
        default:
          schema = this.restResourceToZodSchema(resource, config);
          break;
      }
      
      const validatedData = schema.parse(data);
      
      return {
        valid: true,
        errors: null,
        validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors
        };
      }
      
      return {
        valid: false,
        errors: [{ 
          code: 'custom',
          path: [],
          message: 'Validation failed with unknown error'
        }] as z.ZodError['errors']
      };
    }
  }

  /**
   * Convert table definition to Zod object schema
   */
  static tableToZodSchema(table: TableDefinition, config: TypeConversionConfig = DEFAULT_TYPE_CONVERSION_CONFIG): z.ZodObject<any> {
    const shape: Record<string, z.ZodType<any>> = {};
    
    for (const column of table.columns) {
      shape[column.name] = this.databaseTypeToZod(column);
    }
    
    return z.object(shape);
  }
  
  /**
   * Generate insert schema from table definition (excludes auto-generated fields)
   */
  static tableToInsertSchema(table: TableDefinition): z.ZodObject<any> {
    const shape: Record<string, z.ZodType<any>> = {};
    
    for (const column of table.columns) {
      // Skip auto-increment primary keys and columns with defaults unless explicitly needed
      if (column.isAutoIncrement && column.isPrimaryKey) {
        continue;
      }
      
      let schema = this.databaseTypeToZod(column);
      
      // For insert operations, make columns with defaults optional
      if (column.defaultValue !== undefined || column.defaultValue !== null) {
        schema = schema.optional();
      }
      
      shape[column.name] = schema;
    }
    
    return z.object(shape);
  }
  
  /**
   * Generate update schema from table definition (all fields optional except constraints)
   */
  static tableToUpdateSchema(table: TableDefinition): z.ZodObject<any> {
    const shape: Record<string, z.ZodType<any>> = {};
    
    for (const column of table.columns) {
      // Skip auto-increment primary keys for updates
      if (column.isAutoIncrement && column.isPrimaryKey) {
        continue;
      }
      
      let schema = this.databaseTypeToZod(column);
      
      // For update operations, make all fields optional
      if (!column.nullable) {
        // Convert required fields to optional for partial updates
        schema = schema.optional();
      }
      
      shape[column.name] = schema;
    }
    
    return z.object(shape).partial(); // Make entire object partial
  }
  
  /**
   * Convert Zod type to database type (reverse conversion)
   */
  static zodTypeToDatabaseType(zodType: z.ZodType<any>): DatabaseType {
    // This is a simplified reverse mapping
    // In practice, this would need more sophisticated type analysis
    
    if (zodType instanceof z.ZodString) {
      return DatabaseType.TEXT;
    }
    
    if (zodType instanceof z.ZodNumber) {
      return DatabaseType.INTEGER; // Could be more specific
    }
    
    if (zodType instanceof z.ZodBoolean) {
      return DatabaseType.BOOLEAN;
    }
    
    if (zodType instanceof z.ZodDate) {
      return DatabaseType.TIMESTAMP;
    }
    
    if (zodType instanceof z.ZodArray) {
      return DatabaseType.ARRAY;
    }
    
    if (zodType instanceof z.ZodEnum) {
      return DatabaseType.ENUM;
    }
    
    return DatabaseType.UNKNOWN;
  }
  
  /**
   * Validate data against table schema
   */
  static validateTableData(
    table: TableDefinition, 
    data: Record<string, any>, 
    operation: 'insert' | 'update' = 'insert'
  ): { valid: boolean; errors: z.ZodError['errors'] | null; validatedData?: any } {
    try {
      const schema = operation === 'insert' 
        ? this.tableToInsertSchema(table)
        : this.tableToUpdateSchema(table);
      
      const validatedData = schema.parse(data);
      
      return {
        valid: true,
        errors: null,
        validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors
        };
      }
      
      return {
        valid: false,
        errors: [{ 
          code: 'custom',
          path: [],
          message: 'Validation failed with unknown error'
        }] as z.ZodError['errors']
      };
    }
  }
  
  /**
   * Convert database value to JavaScript value based on column type
   */
  static deserializeValue(value: any, column: ColumnDefinition): any {
    if (value === null || value === undefined) {
      return value;
    }
    
    switch (column.type) {
      case DatabaseType.INTEGER:
      case DatabaseType.BIGINT:
      case DatabaseType.SERIAL:
      case DatabaseType.BIGSERIAL:
        return parseInt(value, 10);
        
      case DatabaseType.DECIMAL:
      case DatabaseType.NUMERIC:
      case DatabaseType.REAL:
      case DatabaseType.DOUBLE:
      case DatabaseType.FLOAT:
        return parseFloat(value);
        
      case DatabaseType.BOOLEAN:
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1' || value === 't';
        }
        return Boolean(value);
        
      case DatabaseType.DATE:
      case DatabaseType.TIMESTAMP:
      case DatabaseType.TIMESTAMPTZ:
        return value instanceof Date ? value : new Date(value);
        
      case DatabaseType.JSON:
      case DatabaseType.JSONB:
        return typeof value === 'string' ? JSON.parse(value) : value;
        
      case DatabaseType.ARRAY:
        return Array.isArray(value) ? value : [value];
        
      case DatabaseType.UUID:
      case DatabaseType.TEXT:
      case DatabaseType.VARCHAR:
      case DatabaseType.CHAR:
      case DatabaseType.TIME:
      case DatabaseType.INTERVAL:
      case DatabaseType.ENUM:
      default:
        return String(value);
    }
  }
  
  /**
   * Convert JavaScript value to database value based on column type
   */
  static serializeValue(value: any, column: ColumnDefinition): any {
    if (value === null || value === undefined) {
      return value;
    }
    
    switch (column.type) {
      case DatabaseType.JSON:
      case DatabaseType.JSONB:
        return typeof value === 'string' ? value : JSON.stringify(value);
        
      case DatabaseType.DATE:
      case DatabaseType.TIMESTAMP:
      case DatabaseType.TIMESTAMPTZ:
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
        
      case DatabaseType.BOOLEAN:
        return Boolean(value);
        
      case DatabaseType.ARRAY:
        return Array.isArray(value) ? value : [value];
        
      default:
        return value;
    }
  }
  
  /**
   * Get TypeScript type definition for a column
   */
  static columnToTypeScriptType(column: ColumnDefinition): string {
    let baseType: string;
    
    switch (column.type) {
      case DatabaseType.INTEGER:
      case DatabaseType.BIGINT:
      case DatabaseType.DECIMAL:
      case DatabaseType.NUMERIC:
      case DatabaseType.REAL:
      case DatabaseType.DOUBLE:
      case DatabaseType.FLOAT:
      case DatabaseType.SERIAL:
      case DatabaseType.BIGSERIAL:
        baseType = 'number';
        break;
        
      case DatabaseType.TEXT:
      case DatabaseType.VARCHAR:
      case DatabaseType.CHAR:
      case DatabaseType.UUID:
      case DatabaseType.TIME:
      case DatabaseType.INTERVAL:
        baseType = 'string';
        break;
        
      case DatabaseType.DATE:
      case DatabaseType.TIMESTAMP:
      case DatabaseType.TIMESTAMPTZ:
        baseType = 'Date';
        break;
        
      case DatabaseType.BOOLEAN:
        baseType = 'boolean';
        break;
        
      case DatabaseType.JSON:
      case DatabaseType.JSONB:
        baseType = 'any'; // Could be more specific
        break;
        
      case DatabaseType.BYTEA:
      case DatabaseType.BLOB:
        baseType = 'Buffer';
        break;
        
      case DatabaseType.ARRAY:
        baseType = 'any[]'; // Could be more specific based on element type
        break;
        
      case DatabaseType.ENUM:
        if (column.enumValues && column.enumValues.length > 0) {
          baseType = column.enumValues.map(v => `'${v}'`).join(' | ');
        } else {
          baseType = 'string';
        }
        break;
        
      default:
        baseType = 'any';
        break;
    }
    
    return column.nullable ? `${baseType} | null` : baseType;
  }
  
  /**
   * Generate TypeScript interface from table definition
   */
  static tableToTypeScriptInterface(table: TableDefinition): string {
    const interfaceName = this.pascalCase(table.name);
    const properties = table.columns.map(column => {
      const type = this.columnToTypeScriptType(column);
      const optional = column.nullable || column.defaultValue !== undefined ? '?' : '';
      return `  ${column.name}${optional}: ${type};`;
    }).join('\n');
    
    return `export interface ${interfaceName} {\n${properties}\n}`;
  }
  
  /**
   * Convert string to PascalCase
   */
  private static pascalCase(str: string): string {
    return str
      .replace(/(_|-|\s)+(.)?/g, (_, __, char) => char ? char.toUpperCase() : '')
      .replace(/^(.)/, char => char.toUpperCase());
  }
  
  /**
   * Get SQL DDL type from database type
   */
  static databaseTypeToSQL(column: ColumnDefinition): string {
    let sqlType: string;
    
    switch (column.type) {
      case DatabaseType.INTEGER:
        sqlType = 'INTEGER';
        break;
      case DatabaseType.BIGINT:
        sqlType = 'BIGINT';
        break;
      case DatabaseType.DECIMAL:
      case DatabaseType.NUMERIC:
        if (column.precision && column.scale) {
          sqlType = `DECIMAL(${column.precision}, ${column.scale})`;
        } else if (column.precision) {
          sqlType = `DECIMAL(${column.precision})`;
        } else {
          sqlType = 'DECIMAL';
        }
        break;
      case DatabaseType.REAL:
        sqlType = 'REAL';
        break;
      case DatabaseType.DOUBLE:
        sqlType = 'DOUBLE PRECISION';
        break;
      case DatabaseType.FLOAT:
        sqlType = 'FLOAT';
        break;
      case DatabaseType.SERIAL:
        sqlType = 'SERIAL';
        break;
      case DatabaseType.BIGSERIAL:
        sqlType = 'BIGSERIAL';
        break;
      case DatabaseType.TEXT:
        sqlType = 'TEXT';
        break;
      case DatabaseType.VARCHAR:
        sqlType = column.maxLength ? `VARCHAR(${column.maxLength})` : 'VARCHAR';
        break;
      case DatabaseType.CHAR:
        sqlType = column.maxLength ? `CHAR(${column.maxLength})` : 'CHAR';
        break;
      case DatabaseType.UUID:
        sqlType = 'UUID';
        break;
      case DatabaseType.DATE:
        sqlType = 'DATE';
        break;
      case DatabaseType.TIME:
        sqlType = 'TIME';
        break;
      case DatabaseType.TIMESTAMP:
        sqlType = 'TIMESTAMP';
        break;
      case DatabaseType.TIMESTAMPTZ:
        sqlType = 'TIMESTAMPTZ';
        break;
      case DatabaseType.INTERVAL:
        sqlType = 'INTERVAL';
        break;
      case DatabaseType.BOOLEAN:
        sqlType = 'BOOLEAN';
        break;
      case DatabaseType.JSON:
        sqlType = 'JSON';
        break;
      case DatabaseType.JSONB:
        sqlType = 'JSONB';
        break;
      case DatabaseType.BYTEA:
        sqlType = 'BYTEA';
        break;
      case DatabaseType.BLOB:
        sqlType = 'BLOB';
        break;
      case DatabaseType.ARRAY:
        sqlType = 'TEXT[]'; // Simplified - should be based on element type
        break;
      case DatabaseType.ENUM:
        if (column.enumValues && column.enumValues.length > 0) {
          const values = column.enumValues.map(v => `'${v}'`).join(', ');
          sqlType = `ENUM(${values})`;
        } else {
          sqlType = 'TEXT';
        }
        break;
      default:
        sqlType = 'TEXT';
        break;
    }
    
    return sqlType;
  }
}
import 'reflect-metadata';

/**
 * Basing Helper interface for serialization needs
 */
export interface Helper {
  field: string;
}

/**
 * Annotates entities column fields with this decorator in order to
 * exclude their serialization (override of toJSON).
 *
 */
export const jsonIgnored =
  () =>
  (target: unknown | any, field: string): any => {
    const _constructor = target.constructor;
    const helper: Helper = {
      field
    };
    _defineMetadata(JSON_IGNORED_METADATA_KEY, _constructor, field, helper);
  };

/**
 * Annotates entities column fields with this decorator in order to
 * automatically manage translation on CRU(D) operations.
 *
 */
export const translatable =
  () =>
  (target: unknown | any, field: string): any => {
    const _constructor = target.constructor;
    const helper: Helper = {
      field
    };
    _defineMetadata(TRANSLATABLE_METADATA_KEY, _constructor, field, helper);
  };

export const translations =
  () =>
  (target: unknown | any, field: string): any => {
    const _constructor = target.constructor;
    const helper: Helper = {
      field
    };
    _defineMetadata(TRANSLATIONS_METADATA_KEY, _constructor, field, helper);
  };

/**
 * Get a list of fields that should be ignored on JSON serialization
 * @param target the class/instance on which we're looking for metadata
 * @returns the metadata information for this whole class inheritance (current and parents)
 */
export const getJsonIgnoredFields = (target: unknown | any): string[] => {
  return Object.keys(_getMetadata(JSON_IGNORED_METADATA_KEY, target));
};

/**
 * Get a list of fields that can be translated.
 *
 * @param target the class/instance on which we're looking for metadata
 * @returns the metadata information for this whole class inheritance (current and parents)
 */
export const getTranslatableFields = (target: unknown | any): string[] => {
  return Object.keys(_getMetadata(TRANSLATABLE_METADATA_KEY, target));
};

/**
 * Get the field annotated with @translations in class hierarchy
 * @param target the class/instance on which we're looking for metadata
 * @returns null if no fields annotated @translations
 */
export const getTranslationsField = (target: unknown | any): string | null => {
  const translations = Object.keys(
    _getMetadata(TRANSLATIONS_METADATA_KEY, target)
  );
  if (!translations || translations.length === 0) {
    return null;
  }
  return translations.slice(-1)[0];
};

type Fields = Record<string, any>;

type FieldsRelation = { fields?: Fields; relations?: string[] };

/**
 * Parse request query fields instruction into typeorm where compatible object
 * @param {string[]} stringFields the fields select operations
 * @return {FieldsRelation} an object that can be used with Typeorm where
 */
export const parseFields = (
  stringFields: string[] | string
): FieldsRelation => {
  const defaultResult = { fields: undefined, relations: undefined };
  if (!stringFields.length) {
    // No need to go further
    return defaultResult;
  }
  if (!Array.isArray(stringFields)) {
    stringFields = [stringFields];
  }
  const { fields, relations } = (stringFields as string[]).reduce(
    ({ fields = {}, relations = [] }: FieldsRelation, stringField: any) => {
      const { fields: newFields, relation } = parseField(stringField);
      return {
        fields: deepMerge(fields, newFields),
        relations: [...relations, relation]
      };
    },
    defaultResult
  );
  return {
    fields,
    relations: Array.from(new Set(relations!.filter((r) => !!r)))
  };
};

const parseField = (fieldOperations: string) => {
  if (!fieldOperations.trim().length) {
    return { fields: {}, relation: '' };
  }
  const parts = fieldOperations.split('.');
  // Here we will suppose that last field of a dotted field is a leaf: (parentObject.nestedObject.field)
  // So we'll only take first 2: parentObject and nestedObject as relationships
  const relation =
    parts.length <= 1 ? '' : parts.slice(0, parts.length - 1).join('.');
  const fields = [...parts]
    .reverse()
    .reduce((result: Record<string, any>, field: string) => {
      const value = Object.keys(result).length ? result : true;
      return { [field]: value };
    }, {});
  return { fields, relation };
};

const deepMerge = (
  target: Record<string, any>,
  source: Record<string, any>
): any => {
  const sourceKeys = Object.keys(source);
  return sourceKeys.reduce((fields: Record<string, any>, field: string) => {
    const sourceValue = source[field];
    const targetValue = target[field];
    if (
      (targetValue === true && sourceValue === true) ||
      (!targetValue && !sourceValue)
    ) {
      // Both are booleans
      return { ...fields, [field]: true };
    }
    if (!targetValue || targetValue === true) {
      // Source value is object
      return { ...fields, [field]: sourceValue };
    }
    // Both are objects
    return { ...fields, [field]: { ...targetValue, ...sourceValue } };
  }, target);
};

const _getMetadata = (symbol: Symbol, target: unknown | any): any => {
  return Reflect.getMetadata(symbol, target.constructor) || {};
};

const _defineMetadata = (
  symbol: Symbol,
  _constructor: any,
  field: string,
  helper: Helper
): void => {
  const currentHelper = Reflect.getMetadata(symbol, _constructor) || {};
  // 2- Defensive copy in order to avoid setting value on all inheritance tree
  const newHelper = { ...currentHelper };
  newHelper[field] = helper;

  // 2- Define metadata for given class with new value
  Reflect.defineMetadata(symbol, newHelper, _constructor);
};

const JSON_IGNORED_METADATA_KEY = Symbol('jsonIgnored');
const TRANSLATABLE_METADATA_KEY = Symbol('translatable');
const TRANSLATIONS_METADATA_KEY = Symbol('translations');

import 'reflect-metadata';

/**
 * Basing Helper interface for serialization needs
 */
export interface Helper {
  field: string;
}

/**
 * Annotates entities date fields with this decorator in order to
 * automatically manage formatting on serialize operations.
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

/**
 * Get a Record of field as key and DateDeserializerHelper as values.
 * This record contains the metadata (date format) to use when parsing JSON inputs
 * for a given set of fields.
 *
 * @param target the class/instance on which we're looking for metadata
 * @returns the metadata information for this whole class inheritance (current and parents)
 */
export const getTranslatable = (target: unknown | any): string[] => {
  return Object.keys(_getMetadata(TRANSLATABLE_METADATA_KEY, target));
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

const TRANSLATABLE_METADATA_KEY = Symbol('translatable');

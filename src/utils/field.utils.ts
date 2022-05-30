import 'reflect-metadata';

/**
 * Basing Helper interface for serialization needs
 */
export interface Helper {
  field: string;
}

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
const TRANSLATIONS_METADATA_KEY = Symbol('translations');

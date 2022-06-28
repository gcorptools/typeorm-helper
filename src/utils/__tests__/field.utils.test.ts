import {
  NoMetadata,
  WithMetadata,
  WithParentMetadata
} from '../../tests/test.models';
import {
  getJsonIgnoredFields,
  getTranslatableFields,
  getTranslationsField
} from '../field.utils';

describe('Field Utils', () => {
  it('should get empty metadata when none exists', () => {
    const instance = new NoMetadata();
    expect(getTranslatableFields(instance)).toEqual([]);
    expect(getTranslationsField(instance)).toBeNull();
    expect(getJsonIgnoredFields(instance)).toEqual([]);
  });

  it('should get valid metadata with instance and not type', () => {
    const instance = new WithMetadata();
    expect(getTranslatableFields(WithMetadata)).toEqual([]);
    expect(getTranslationsField(WithMetadata)).toBeNull();
    expect(getJsonIgnoredFields(WithMetadata)).toEqual([]);

    expect(getTranslatableFields(instance)).not.toEqual([]);
    expect(getTranslationsField(instance)).not.toBeNull();
    expect(getJsonIgnoredFields(instance)).not.toEqual([]);
  });

  it('should get metadata existing on current class', () => {
    const instance = new WithMetadata();
    const translatable = getTranslatableFields(instance);
    expect(translatable.sort()).toEqual(['description', 'name']);
    expect(getTranslationsField(instance)).toEqual('translations');
    expect(getJsonIgnoredFields(instance).sort()).toEqual(['translations']);
  });

  it('should get metadata existing on inherited class', () => {
    const instance = new WithParentMetadata();
    const translatable = getTranslatableFields(instance);
    expect(translatable.sort()).toEqual(['comment', 'description', 'name']);
    expect(getTranslationsField(instance)).toEqual('anotherTranslations');
    expect(getJsonIgnoredFields(instance).sort()).toEqual([
      'secret',
      'translations'
    ]);
  });
});

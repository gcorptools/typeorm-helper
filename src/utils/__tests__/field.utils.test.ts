import {
  NoMetadata,
  WithMetadata,
  WithParentMetadata
} from '../../tests/test.models';
import {
  getJsonIgnoredFields,
  getTranslatableFields,
  getTranslationsField,
  parseFields
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
    expect(getTranslationsField(instance)).toBeNull();
    expect(getJsonIgnoredFields(instance)).not.toEqual([]);
  });

  it('should get metadata existing on current class', () => {
    const instance = new WithMetadata();
    const translatable = getTranslatableFields(instance);
    expect(translatable.sort()).toEqual(['description', 'name']);
    expect(getTranslationsField(instance)).toBeNull(); // Only columns can be annotated with
    expect(getJsonIgnoredFields(instance).sort()).toEqual(['translations']);
  });

  it('should get metadata existing on inherited class', () => {
    const instance = new WithParentMetadata();
    const translatable = getTranslatableFields(instance);
    expect(translatable.sort()).toEqual(['comment', 'description', 'name']);
    expect(getTranslationsField(instance)).toBeNull(); // Only columns can be annotated with
    expect(getJsonIgnoredFields(instance).sort()).toEqual([
      'secret',
      'translations'
    ]);
  });

  it('should parse fields', () => {
    const { fields: firstFields, relations: firstRelations } = parseFields([]);
    expect(firstFields).toBeUndefined();
    expect(firstRelations).toBeUndefined();

    const { fields: secondFields, relations: secondRelations } =
      parseFields('country.code');
    expect(secondFields).toBeDefined();
    expect(secondRelations).toEqual(['country']);
    expect(secondFields).toEqual({ country: { code: true } });

    const { fields: thirdFields, relations: thirdRelations } = parseFields([
      'name',
      'age',
      'address.city',
      'address.name',
      'country.state.code',
      '',
      'name'
    ]);

    expect(thirdFields).toBeDefined();
    expect(thirdRelations).toEqual(['address', 'country.state']);

    expect(thirdFields).toEqual({
      name: true,
      age: true,
      address: { city: true, name: true },
      country: { state: { code: true } }
    });
  });
});

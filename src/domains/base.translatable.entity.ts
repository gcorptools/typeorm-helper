import { AfterLoad, BeforeUpdate, DeepPartial } from 'typeorm';
import { GConstructor } from '@src/types';
import {
  getTranslationsField,
  isEmpty,
  getTranslatableFields
} from '@src/utils';
import { ValidatedEntity } from '@src/domains/base.validated.entity';

/**
 * For record allowing us to save translation of a record in database
 */
export interface TranslatableEntity {
  /**
   * Get the active language
   */
  currentLanguage(): string;

  translationClass: new () => any;
}

/**
 * Base implementation of Translated.
 * For working properly, the extending class will require a field to be annotated with translations
 */
export const BaseTranslatableEntity = <
  TBase extends GConstructor<ValidatedEntity>
>(
  Base: TBase
) => {
  abstract class BaseTranslatableEntity
    extends Base
    implements TranslatableEntity
  {
    _translationsField: string;

    constructor(...params: any[]) {
      super(...params);
      const translationsField = getTranslationsField(this);
      if (!translationsField) {
        throw new Error(
          `Expected at least one field with decorator @translations on class ${this.constructor.name}`
        );
      }
      this._translationsField = translationsField;
    }

    abstract currentLanguage(): string;

    abstract get translationClass(): new () => any;

    setDefaultFields<T extends BaseTranslatableEntity>(
      plainEntityLikeOrPlainEntityLikes?: DeepPartial<T> | DeepPartial<T>[]
    ):
      | DeepPartial<BaseTranslatableEntity>
      | DeepPartial<BaseTranslatableEntity>[] {
      // This operation is launched by a fake instance that will not be saved, so we update it with provided data first
      if (!plainEntityLikeOrPlainEntityLikes) {
        const newData: any = this._setTranslationInData(
          plainEntityLikeOrPlainEntityLikes
        );
        return super.setDefaultFields(newData);
      }
      if (!Array.isArray(plainEntityLikeOrPlainEntityLikes)) {
        const newData: any = this._setTranslationInData(
          plainEntityLikeOrPlainEntityLikes
        );
        return super.setDefaultFields(newData);
      }
      const newData: any = plainEntityLikeOrPlainEntityLikes.map(
        (item: DeepPartial<BaseTranslatableEntity>) =>
          this._setTranslationInData(item)
      );
      return super.setDefaultFields(newData);
    }

    /**
     * Update translations objects accordingly to active language
     */
    @BeforeUpdate()
    format(data: any): void {
      super.format(data);
      let currentTranslation = this._currentTranslation();
      if (!currentTranslation) {
        currentTranslation = this._createOrUpdateTranslation();
        (this as any)[this._translationsField].push(currentTranslation);
      } else {
        currentTranslation =
          this._createOrUpdateTranslation(currentTranslation);
      }
    }

    /**
     * Replace current object translatable values with corresponding translations
     */
    @AfterLoad()
    translate(): void {
      const translation = this._currentTranslation();
      if (!translation) {
        return;
      }
      Object.assign(this, this._getTranslationValue(translation));
    }

    _setTranslationInData(
      plainEntityLikeOrPlainEntityLikes?: DeepPartial<TranslatableEntity>
    ): DeepPartial<TranslatableEntity> {
      if (!plainEntityLikeOrPlainEntityLikes) {
        plainEntityLikeOrPlainEntityLikes = {};
      }
      const translationValues = (plainEntityLikeOrPlainEntityLikes as any)[
        this._translationsField
      ];
      if (
        translationValues &&
        translationValues !== null &&
        translationValues.length > 0
      ) {
        // If non-empty, we will not care
        return plainEntityLikeOrPlainEntityLikes;
      }
      Object.assign(this, plainEntityLikeOrPlainEntityLikes);
      const translation = this._createOrUpdateTranslation();
      return {
        ...plainEntityLikeOrPlainEntityLikes,
        [this._translationsField]: [translation]
      };
    }

    _currentTranslation(): any | null {
      const language = this.currentLanguage();
      const translation = ((this as any)[this._translationsField] || []).filter(
        (translation: any) => translation.language === language
      );
      if (!isEmpty(translation)) {
        return translation[0];
      }
      return null;
    }

    _createOrUpdateTranslation(translation: any | null = null): any {
      // Get current parameters
      const language = this.currentLanguage();
      const currentValues: any = this;
      const translatableFields = getTranslatableFields(this);

      // Create an object from translatable fields
      const data = translatableFields.reduce(
        (result: Record<string, any>, field: string) => ({
          ...result,
          [field]: currentValues[field]
        }),
        {
          language
        }
      );

      // Returns an instance of this new object
      const instance = translation || new this.translationClass();
      Object.assign(instance, data);
      return instance;
    }

    _getTranslationValue(translation: any): Record<string, any> {
      const translatableFields = getTranslatableFields(this);
      const translationValues: any = translation;
      return translatableFields.reduce(
        (result: Record<string, any>, field: string) => ({
          ...result,
          [field]: translationValues[field]
        }),
        {}
      );
    }
  }

  return BaseTranslatableEntity;
};

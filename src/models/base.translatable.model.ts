import { getTranslatableFields, getTranslationsField, isEmpty } from '../utils';
import { AfterLoad, BeforeUpdate, DeepPartial } from 'typeorm';
import { BaseModel } from './base.model';
import { BaseTranslationModel } from './base.translation.model';

export abstract class BaseTranslatableModel<
  T extends BaseTranslationModel
> extends BaseModel {
  private _translationsField: string;

  constructor() {
    super();
    const translationsField = getTranslationsField(this);
    if (!translationsField) {
      throw new Error(
        `Expected at least one field with decorator @translations on class ${this.constructor.name}`
      );
    }
    this._translationsField = translationsField;
  }

  setDefaultFields(
    plainEntityLikeOrPlainEntityLikes?:
      | DeepPartial<BaseTranslatableModel<T>>
      | DeepPartial<BaseTranslatableModel<T>>[]
  ): DeepPartial<BaseModel> | DeepPartial<BaseModel>[] {
    // This operation is launched by a fake instance that will not be saved, so we update it with provided data first
    if (!plainEntityLikeOrPlainEntityLikes) {
      const newData = this._setTranslationInData(
        plainEntityLikeOrPlainEntityLikes
      );
      return super.setDefaultFields(newData);
    }
    if (!Array.isArray(plainEntityLikeOrPlainEntityLikes)) {
      const newData = this._setTranslationInData(
        plainEntityLikeOrPlainEntityLikes
      );
      return super.setDefaultFields(newData);
    }
    const newData = plainEntityLikeOrPlainEntityLikes.map(
      (item: DeepPartial<BaseTranslatableModel<T>>) =>
        this._setTranslationInData(item)
    );
    return super.setDefaultFields(newData);
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

  /**
   * Update translations objects accordingly to active language
   */
  @BeforeUpdate()
  translateOnUpdate(): void {
    let currentTranslation = this._currentTranslation();
    if (!currentTranslation) {
      currentTranslation = this._createOrUpdateTranslation();
      (this as any)[this._translationsField].push(currentTranslation);
    } else {
      currentTranslation = this._createOrUpdateTranslation(currentTranslation);
    }
  }

  /**
   * Get the active language
   */
  protected abstract _currentLanguage(): string;

  protected abstract get _translationClass(): new () => T;

  private _setTranslationInData(
    plainEntityLikeOrPlainEntityLikes?: DeepPartial<BaseTranslatableModel<T>>
  ): DeepPartial<BaseTranslatableModel<T>> {
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

  private _currentTranslation(): T | null {
    const language = this._currentLanguage();
    const translation = ((this as any)[this._translationsField] || []).filter(
      (translation: T) => translation.language === language
    );
    if (!isEmpty(translation)) {
      return translation[0];
    }
    return null;
  }

  private _createOrUpdateTranslation(translation: T | null = null): T {
    // Get current parameters
    const language = this._currentLanguage();
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
    const instance = translation || new this._translationClass();
    Object.assign(instance, data);
    return instance;
  }

  private _getTranslationValue(translation: T): Record<string, any> {
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

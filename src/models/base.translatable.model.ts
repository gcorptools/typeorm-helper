import { getTranslatable, isEmpty } from '@src/utils';
import { AfterLoad, BeforeUpdate, DeepPartial } from 'typeorm';
import { BaseModel } from './base.model';
import { BaseTranslationModel } from './base.translation.model';

export abstract class BaseTranslatableModel<
  T extends BaseTranslationModel
> extends BaseModel {
  translations!: T[];

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

  private _setTranslationInData(
    plainEntityLikeOrPlainEntityLikes?: DeepPartial<BaseTranslatableModel<T>>
  ): DeepPartial<BaseTranslatableModel<T>> {
    if (!plainEntityLikeOrPlainEntityLikes) {
      plainEntityLikeOrPlainEntityLikes = {};
    }
    if (
      Object.keys(plainEntityLikeOrPlainEntityLikes).includes('translations')
    ) {
      // TODO: Even if empty, we will not care?
      return plainEntityLikeOrPlainEntityLikes;
    }
    Object.assign(this, plainEntityLikeOrPlainEntityLikes);
    const translation = this._createOrUpdateTranslation();
    return {
      ...plainEntityLikeOrPlainEntityLikes,
      translations: [translation]
    };
  }

  @AfterLoad()
  translate(): void {
    const translation = this._currentTranslation();
    if (!translation || !translation.translated()) {
      return;
    }
    Object.assign(this, this._getTranslationValue(translation));
  }

  @BeforeUpdate()
  translateOnUpdate(): void {
    let currentTranslation = this._currentTranslation();
    if (!currentTranslation) {
      currentTranslation = this._createOrUpdateTranslation();
      this.translations.push(currentTranslation);
    } else {
      currentTranslation = this._createOrUpdateTranslation(currentTranslation);
    }
  }

  /**
   * Get the active language
   */
  protected abstract _currentLanguage(): string;

  protected abstract get _translationClass(): new () => T;

  private _currentTranslation(): T | null {
    const language = this._currentLanguage();
    const translation = this._translations().filter(
      (translation: T) => translation.language === language
    );
    if (!isEmpty(translation)) {
      return translation[0];
    }
    return null;
  }

  private _translations(): T[] {
    return this.translations || [];
  }

  private _createOrUpdateTranslation(translation: T | null = null): T {
    // Get current parameters
    const language = this._currentLanguage();
    const currentValues: any = this;
    const translatableFields = getTranslatable(this) || [];

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
    if (!translation.translated()) {
      return {};
    }
    const translatableFields = getTranslatable(this) || [];
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

import { BeforeInsert, BeforeUpdate, DeepPartial } from 'typeorm';
import { getJsonIgnoredFields } from '@src/utils';

export interface ValidatedEntity {
  /**
   * Add default fields in query options. Required method for entities.
   * @param plainEntityLikeOrPlainEntityLikes provided option
   */
  setDefaultFields<T extends ValidatedEntity>(
    plainEntityLikeOrPlainEntityLikes?: DeepPartial<T> | DeepPartial<T>[]
  ): DeepPartial<ValidatedEntity> | DeepPartial<ValidatedEntity>[];

  /**
   * Validate consistency of data before saving model
   * @param data provided data
   */
  validate(data: any): void;

  /**
   * Format the provided data by applying required transformation
   * @param data provided data
   */
  format(data: any): void;

  /**
   * Executed before saving
   */
  beforeSave(): void;

  /**
   * Override JS method for object serialization into JSON
   * @returns the object JSON representation
   */
  toJSON(): { [name: string]: any };
}

/**
 * Simple implementation for BaseEntity
 */
export const BaseValidatedEntity = () => {
  class BaseValidatedEntity implements ValidatedEntity {
    setDefaultFields<T extends BaseValidatedEntity>(
      plainEntityLikeOrPlainEntityLikes?: DeepPartial<T> | DeepPartial<T>[]
    ): DeepPartial<BaseValidatedEntity> | DeepPartial<BaseValidatedEntity>[] {
      return plainEntityLikeOrPlainEntityLikes || {};
    }

    validate(data: any): void {
      // Nothing in there
    }

    format(data: any): void {
      // Nothing in there
    }

    @BeforeInsert()
    @BeforeUpdate()
    beforeSave(): void {
      this.format(this);
      this.validate(this);
    }

    toJSON(): { [name: string]: any } {
      const json: any = {};
      const ignoredFields: string[] = getJsonIgnoredFields(this);
      Object.keys(this)
        .filter((field: string) => !ignoredFields.includes(field))
        .forEach((field: string) => {
          json[field] = (this as any)[field];
        });
      return json;
    }
  }

  return BaseValidatedEntity;
};

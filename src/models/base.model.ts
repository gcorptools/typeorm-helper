import { BeforeInsert, BeforeUpdate, DeepPartial } from 'typeorm';

/**
 * Simple implementation for BaseModel
 */
export abstract class BaseModel {
  /**
   * Add default fields in query options
   * @param plainEntityLikeOrPlainEntityLikes provided option
   */
  setDefaultFields<T extends BaseModel>(
    plainEntityLikeOrPlainEntityLikes?: DeepPartial<T> | DeepPartial<T>[]
  ): DeepPartial<BaseModel> | DeepPartial<BaseModel>[] {
    return plainEntityLikeOrPlainEntityLikes || {};
  }

  /**
   * Validate consistency of data before saving model
   * @param data provided data
   */
  validate(data: any): void {
    // Nothing in there
  }

  /**
   * Format the provided data by applying required transformation
   * @param data provided data
   */
  format(data: any): void {
    // Nothing in there
  }

  /**
   * Executed before saving
   */
  @BeforeInsert()
  @BeforeUpdate()
  beforeSave(): void {
    this.format(this);
    this.validate(this);
  }
}

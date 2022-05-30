import { BeforeInsert, BeforeUpdate, DeepPartial } from 'typeorm';

/**
 * Simple implementation for BaseModel
 */
export abstract class BaseModel {
  setDefaultFields<T extends BaseModel>(
    plainEntityLikeOrPlainEntityLikes?: DeepPartial<T> | DeepPartial<T>[]
  ): DeepPartial<BaseModel> | DeepPartial<BaseModel>[] {
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
}

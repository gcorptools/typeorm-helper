import { Column } from 'typeorm';
import { BaseModel } from './base.model';

export abstract class BaseTranslationModel extends BaseModel {
  @Column({ update: false })
  language!: string;

  /**
   * Check if current instance represents a valid translation
   */
  abstract translated(): boolean;
}

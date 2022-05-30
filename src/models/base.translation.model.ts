import { Column } from 'typeorm';
import { BaseModel } from './base.model';

export abstract class BaseTranslationModel extends BaseModel {
  @Column({ update: false })
  language!: string;
}

import { Column } from 'typeorm';
import { GConstructor } from '@src/types';

/**
 * For record allowing us to save translation of a record in database.
 */
export interface TranslationEntity {
  language: string;
}

/**
 * Base implementation of Translated.
 * For working properly, the extending class will need a ManyToOne field to the source entity
 * of this translation.
 */
export const BaseTranslationEntity = <TBase extends GConstructor<any>>(
  Base: TBase
) => {
  class BaseTranslationEntity extends Base implements TranslationEntity {
    @Column({ nullable: false, update: false })
    language!: string;
  }

  return BaseTranslationEntity;
};

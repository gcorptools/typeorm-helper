import {
  BaseTranslatableEntity,
  BaseTranslationEntity,
  BaseValidatedEntity
} from '@src/domains';
import {
  jsonIgnored,
  capitalizeFirst,
  translatable,
  translations
} from '@src/utils';
import { randomUUID } from 'crypto';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne
} from 'typeorm';

/**
 * No transformation whatsoever will be applied on instances of this class
 */
export class NoMetadataPerson {
  id!: number;

  name!: string;

  firstName!: string;

  lastName!: string;

  confirmed!: boolean;

  age!: number;

  posts!: Post[];
}

/**
 * The Person class will run a certain amount of methods depending on situations.<br/>
 * @jsonIgnored applied on firstName and lastName will make these fields not serialized in JSON.
 * @format method will run every time we save a instance in database for applying format to provided data.
 * ie: Capitalizing first and last names, concatenating these two fields in name...
 * @validate method will run at each save for checking if data is consistent (ie: positive age).
 */
@Entity()
export class Person extends BaseValidatedEntity() {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ select: true })
  name!: string;

  @jsonIgnored()
  @Column()
  firstName!: string;

  @jsonIgnored()
  @Column()
  lastName!: string;

  @Column({ default: false })
  confirmed!: boolean;

  @Column()
  age!: number;

  @OneToMany(() => Post, (post) => post.author)
  posts!: Post[];

  format(data: any): void {
    super.format(data);
    this.lastName = `${data.lastName}`.toUpperCase();
    this.firstName = capitalizeFirst(data.firstName);
    this.name = `${this.firstName} ${this.lastName}`;
  }

  validate(data: any): void {
    if (!data.age || data.age < 0) {
      throw new Error('Cannot have negative age');
    }
  }
}

/**
 * BasePost will set up some needed fields for having an automatically translated record in database.
 * @currentLanguage will supposedly give us the current language at runtime at the moment of save.
 * @translationClass will give us the class/table saving the translation and also the translated columns.
 */
abstract class BasePost extends BaseTranslatableEntity(BaseValidatedEntity()) {
  static activeLanguage: string;

  @PrimaryGeneratedColumn()
  id!: number;

  @translatable()
  @Column()
  title!: string;

  @translatable()
  @Column()
  description!: string;

  currentLanguage(): string {
    return Post.activeLanguage;
  }

  get translationClass(): new () => PostTranslation {
    return PostTranslation;
  }
}

/**
 * Post class is fully configured.
 * @translations this required decorator for translatable entities will indicates the translation table.
 * @OneToMany is not needed on the field, since it is automatically managed by translations
 */
@Entity()
export class Post extends BasePost {
  @Column()
  code!: string;

  @ManyToOne(() => Person, (owner) => owner.posts)
  author!: Person;

  @jsonIgnored()
  @translations(() => PostTranslation, (translation) => translation.source)
  translations!: PostTranslation[];

  format(data: any): void {
    super.format(data);
    this.code = randomUUID().toString();
  }
}

/**
 * PostTranslation indicates which fields from post are translated, here title and description.
 * Note that we need a ManyToOne to make the inverse OneToMany translation work in Post entity.
 */
@Entity()
export class PostTranslation extends BaseTranslationEntity(
  BaseValidatedEntity()
) {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column()
  description!: string;

  @ManyToOne(() => Post, (source) => source.translations)
  source!: Post;
}

/**
 * Everything is correct except we miss the required decorator translations
 */
@Entity()
export class NotValidPost extends BasePost {}

export class NoMetadata {
  id!: number;
  code!: string;
}

export class WithMetadata extends NoMetadata {
  date!: Date;
  @translatable()
  name!: string;
  @translatable()
  description!: string;
  @jsonIgnored()
  translations!: Record<string, string>[];
}

export class WithParentMetadata extends WithMetadata {
  @jsonIgnored()
  secret!: string;
  @translatable()
  comment!: string;
}

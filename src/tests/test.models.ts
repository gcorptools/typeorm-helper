import { BaseModel } from '../models/base.model';
import { BaseTranslatableModel } from '../models/base.translatable.model';
import { BaseTranslationModel } from '../models/base.translation.model';
import { capitalizeFirst, translatable, translations } from '../utils';
import { randomUUID } from 'crypto';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne
} from 'typeorm';

@Entity()
export class Person extends BaseModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ select: true })
  name!: string;

  @Column()
  firstName!: string;

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

class BasePostTranslation extends BaseTranslatableModel<PostTranslation> {
  static activeLanguage: string;

  @PrimaryGeneratedColumn()
  id!: number;

  @translatable()
  @Column()
  title!: string;

  @translatable()
  @Column()
  description!: string;

  protected _currentLanguage(): string {
    return Post.activeLanguage;
  }

  protected get _translationClass(): new () => PostTranslation {
    return PostTranslation;
  }
}

@Entity()
export class Post extends BasePostTranslation {
  @Column()
  code!: string;

  @ManyToOne(() => Person, (owner) => owner.posts)
  author!: Person;

  @translations()
  @OneToMany(() => PostTranslation, (translation) => translation.source, {
    eager: true,
    cascade: ['insert', 'update']
  })
  translations!: PostTranslation[];

  format(data: any): void {
    super.format(data);
    this.code = randomUUID().toString();
  }
}

@Entity()
export class PostTranslation extends BaseTranslationModel {
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
 * Everything is correct except missing translations() decorator
 */
@Entity()
export class NotValidPost extends BasePostTranslation {}

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
  @translations()
  translations!: Record<string, string>[];
}

export class WithParentMetadata extends WithMetadata {
  secret!: string;
  @translatable()
  comment!: string;
  @translations()
  anotherTranslations!: Record<string, string>[];
}

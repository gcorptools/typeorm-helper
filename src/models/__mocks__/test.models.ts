import {
  BaseModel,
  BaseTranslatableModel,
  BaseTranslationModel
} from '@src/models';
import { capitalizeFirst, isEmpty, translatable } from '@src/utils';
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

@Entity()
export class Post extends BaseTranslatableModel<PostTranslation> {
  static activeLanguage: string;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  code!: string;

  @translatable()
  @Column()
  title!: string;

  @translatable()
  @Column()
  description!: string;

  @ManyToOne(() => Person, (owner) => owner.posts)
  author!: Person;

  @OneToMany(() => PostTranslation, (translation) => translation.source, {
    eager: true,
    cascade: ['insert', 'update']
  })
  translations!: PostTranslation[];

  format(data: any): void {
    super.format(data);
    this.code = randomUUID().toString();
  }

  protected _currentLanguage(): string {
    return Post.activeLanguage;
  }

  protected _translationsField(): string {
    return 'translations';
  }

  protected get _translationClass(): new () => PostTranslation {
    return PostTranslation;
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

  translated(): boolean {
    return !isEmpty(this.title) && !isEmpty(this.description);
  }
}

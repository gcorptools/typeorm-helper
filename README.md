# TypeORM

## Install

For installing this library, just do:

```sh
npm install @gcorptools/typeorm-helper
```

or with yarn

```sh
yarn add @gcorptools/typeorm-helper
```

## Features

### Base Repository

In order to use additional features like findPage, you can create an instance of BaseRepository for your entity.

In order to do so, start by creating an entity extending BaseValidatedEntity():

```ts
import { BaseValidatedEntity } from '@gcorptools/typeorm-helper';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';

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
```

Create your TypeORM data source like you used to and generate a new instance of **BaseRepository** by passing the constructor of your class and the data source manager instance.

```ts
import { BaseRepository } from '@gcorptools/typeorm-helper';
import { Person } from './person.ts';

const appDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: '<user>',
  password: '<password>',
  database: 'test-db',
  entities: [Person],
  synchronize: true,
  logging: true
});

const personRepository = new BaseRepository<Person>(
  Person,
  appDataSource.manager
);
```

The repository instance can be used just like any other TypeORM repository:

```ts
import { MoreThan } from 'typeorm';

const page = personRepository.findPage({
  where: { age: MoreThan(5) },
  order: { firstName: 'DESC' },
  take: 2,
  skip: 3
});
console.log('Persons older than 5', page.content);
```

### Translatable entities

In case you need a model able to store translations of certain fields in database, the couple Translatable/Translation types can be really helpful.
Here are some example:

#### Code

```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne
} from 'typeorm';
import {
  BaseTranslatableEntity,
  BaseTranslationEntity,
  BaseValidatedEntity
} from '@gcorptools/typeorm-helper';

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
 * Post class is fully configured.
 * @translations this required decorator for translatable entities will indicates the translation table.
 * @OneToMany is not needed on the field, since it is automatically managed by translations
 */
@Entity()
export class Post extends BaseTranslatableEntity(BaseValidatedEntity()) {
  static activeLanguage: string;

  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  code!: string;

  @translatable() // Will be translated
  @Column()
  title!: string;

  @translatable() // Will be translated
  @Column()
  description!: string;

  @jsonIgnored()
  @translations(() => PostTranslation, (translation) => translation.source)
  translations!: PostTranslation[];

  format(data: any): void {
    super.format(data);
    this.code = randomUUID().toString();
  }

  // Current language should return language by reading context (for example current user language)
  currentLanguage(): string {
    return Post.activeLanguage;
  }

  // translationClass is needed for automatically saving translations
  get translationClass(): new () => PostTranslation {
    return PostTranslation;
  }
}
```

The following unit test is a great summary of what we can now expect from having such an entity:

```ts
it('should translate fields', async () => {
  const english = 'en';
  const french = 'fr';

  // 1 - We create a record (active language is English)
  Post.activeLanguage = english;
  let post = await postRepository.save(
    postRepository.create({
      code: `post-${new Date().getTime()}`,
      title: 'My Title',
      description: 'My description'
    })
  );
  expect(post.translations.length).toEqual(1);

  // 2 - For translating it to French, we only need to save it with French activated
  Post.activeLanguage = french;
  post!.title = 'Mon titre';
  post!.description = 'Ma description';
  post = await postRepository.save(post!);
  expect(post!.translations.length).toEqual(2);

  // 3 - Fetching in English
  Post.activeLanguage = english;
  let translatedPost = await postRepository.findOne({
    where: { id: post.id }
  });
  expect(translatedPost?.title).toEqual('My Title');
  expect(translatedPost?.description).toEqual('My description');

  // Fetching in French
  Post.activeLanguage = french;
  translatedPost = await postRepository.findOne({
    where: { id: post.id }
  });
  expect(translatedPost?.title).toEqual('Mon titre');
  expect(translatedPost?.description).toEqual('Ma description');
});
```

If you are curious about the structure of data in database, the previous tables should look like:

#### Table posts

| id  | code           | title    | description    |
| --- | -------------- | -------- | -------------- |
| 1   | POST-122355531 | My title | My description |

#### Table post_translations

| id  | language | title     | description    | source_id |
| --- | -------- | --------- | -------------- | --------- |
| 1   | en       | My title  | My description | 1         |
| 2   | fr       | Mon titre | Ma description | 1         |

### Complex filtering/sorting operations from strings

This library also exposes some utilities methods that can help developers when building API; one can use a more 'natural language' when requesting for filtered or sorted data.

```sh
curl https://localhost:3000/persons?filters[0]=firstName[gt]a&filters[0]=lastName[lt]m&filters[0]=person.address.country[eq]US&filters[1]=age[gt]5&sorts=age,desc&sorts=lastName,asc&sorts=firstName,desc
```

Such request could be interpreted as follow:
Fetch all persons matching the following conditions

- (firstName must be greater than 'a' **AND** lastName must be lower than 'm' **AND** person's address country must be equal to 'US') **OR** (age must be greater than 5).
- sorts the results by descending age, then ascending lastName and descending firstName.

The implementation of the endpoints could then make use of the utilities methods for parsing these parameters into something understandable by TypeORM. For example:

```ts
class PersonController {
  async fetchAllPersons(filters: string[][], sorts: string[]) {
    const { where, order, relations } = parsePageParams<Person>({
      sorts,
      filters
    });
    return await this.repository().find({
      where,
      order,
      relations
    });
  }

  async fetchPageOfPersons(
    page: number,
    size: number,
    filters: string[][],
    sorts: string[]
  ) {
    const { take, skip, where, order, relations } = parsePageParams<Person>({
      page,
      size,
      sorts,
      filters
    });
    return await personRepository.findPage({
      where,
      order,
      relations: filterRelations,
      take: size,
      skip
    });
  }
}
```

The complete list of available filtering operators can be retrieved in the class **FilterOperator**.

## Contributing

TODO

import { SortDirection } from '../../enums';
import {
  NoMetadataPerson,
  NotValidPost,
  Person,
  Post,
  PostTranslation
} from '../../tests/test.models';
import { IBackup, IMemoryDb, newDb } from 'pg-mem';
import { DataSource, LessThan, Like, MoreThan } from 'typeorm';
import { BaseRepository } from '../base.repository';

let db: IMemoryDb;
let backup: IBackup;
let connection: DataSource;

let notValidRepository: BaseRepository<NotValidPost>;
let personRepository: BaseRepository<Person>;
let postRepository: BaseRepository<Post>;

describe('Base models', () => {
  it('should validate input before saving or updating', async () => {
    const personData = {
      lastName: 'Any last name',
      firstName: 'Any first name'
    };
    try {
      await personRepository.save(
        personRepository.create({
          ...personData,
          age: -4 //Invalid age
        })
      );
      fail('Should have failed because of negative age');
    } catch (e) {
      expect(e).toBeDefined();
    }

    const person = await personRepository.save(
      personRepository.create({
        ...personData,
        age: 4 //Valid age
      })
    );
    expect(person).toBeDefined();

    try {
      person.age = -12;
      await personRepository.save(person);
      fail('Should have failed because of negative age');
    } catch (e) {
      expect(e).toBeDefined();
    }
  });

  it('should format fields before saving or updating', async () => {
    const [lastName, firstName, age] = ['doe', 'jane and joe', 10];
    let person = await personRepository.save(
      personRepository.create({
        lastName,
        firstName,
        age
      })
    );
    expect(person.age).toEqual(age);
    expect(person.lastName).toEqual('DOE');
    expect(person.firstName).toEqual('Jane And Joe');

    person.firstName = 'DARE';
    person = await personRepository.save(person);
    expect(person.firstName).toEqual('Dare');
  });

  it('should fetch page of records', async () => {
    const personData = Array.from(Array(100).keys()).map((index: number) => {
      return {
        lastName: `Last Name ${index}`,
        firstName: `Fist Name ${index}`,
        age: index + 1,
        confirmed: index % 2 === 0
      };
    });
    const records = await personRepository.save(
      personRepository.create(personData)
    );
    expect(records.length).toEqual(100);

    // Simple page fetching
    const firstFetch = await personRepository.findPage({ take: 15, skip: 0 });
    expect(firstFetch.totalElements).toEqual(100);
    expect(firstFetch.totalPages).toEqual(7);

    // Fetching page with filter: age > 79 and fistName contains 0
    const secondFetch = await personRepository.findPage({
      take: 10,
      skip: 0,
      where: {
        age: MoreThan(79),
        firstName: Like('%0%')
      },
      order: {
        age: SortDirection.desc
      }
    });
    expect(secondFetch.totalElements).toEqual(2); // firstName: 80 and firstName: 90
    expect(secondFetch.totalPages).toEqual(1);
    expect(secondFetch.count).toEqual(2);
    expect(secondFetch.data[0].lastName).toEqual('LAST NAME 90');

    const thirdFetch = await personRepository.findPage();
    expect(thirdFetch.totalElements).toEqual(100);
    expect(thirdFetch.totalPages).toEqual(5);
    expect(thirdFetch.count).toEqual(20);

    const fourthFetch = await personRepository.findPage({
      where: {
        age: LessThan(0)
      }
    });
    expect(fourthFetch.totalElements).toEqual(0);
    expect(fourthFetch.totalPages).toEqual(0);
    expect(fourthFetch.count).toEqual(0);
  });

  it('should create without values', async () => {
    const person = personRepository.create();
    expect(person).toBeDefined();
    const post = postRepository.create();
    expect(post).toBeDefined();
  });

  it('should translate fields', async () => {
    const person = await personRepository.save(
      personRepository.create({
        lastName: 'Doe',
        firstName: 'Vec',
        age: 10
      })
    );
    const english = 'en';
    const french = 'fr';
    const englishData = {
      title: 'My Title',
      description: 'My description'
    };
    const frenchData = {
      title: 'Mon titre',
      description: 'Ma description'
    };

    Post.activeLanguage = english;
    const postEnglish = await postRepository.save(
      postRepository.create({
        ...englishData,
        author: person
      })
    );
    expect(postEnglish.translations.length).toEqual(1);
    Post.activeLanguage = french;

    let postFrench = await postRepository.findOne({
      where: {
        id: postEnglish.id
      }
    });
    expect(postFrench).not.toBeNull();
    postFrench!.title = frenchData.title;
    postFrench!.description = frenchData.description;
    postFrench = await postRepository.save(postFrench!);
    expect(postFrench!.translations.length).toEqual(2);

    Post.activeLanguage = english;
    let translatedPost = await postRepository.findOne({
      where: { id: postEnglish.id }
    });
    expect(translatedPost?.title).toEqual(englishData.title);
    expect(translatedPost?.description).toEqual(englishData.description);

    Post.activeLanguage = french;
    translatedPost = await postRepository.findOne({
      where: { id: postEnglish.id }
    });
    expect(translatedPost?.title).toEqual(frenchData.title);
    expect(translatedPost?.description).toEqual(frenchData.description);
  });

  it('should translate with multiple or unsafe values', async () => {
    const author = await personRepository.save(
      personRepository.create({
        lastName: 'Auth',
        firstName: 'Ob',
        age: 10
      })
    );

    const data: any[] = Array.from(Array(100).keys()).map((index: number) => ({
      title: `My title ${index}`,
      description: `My description ${index}`,
      author
    }));
    data[15] = {
      ...data[15],
      translations: [
        {
          title: 'Special title',
          description: 'Special description',
          language: 'en'
        },
        {
          title: 'Titre spécial',
          description: 'Description spéciale',
          language: 'fr'
        }
      ]
    };

    const records = await postRepository.save(postRepository.create(data));
    expect(records.length).toEqual(100);
    expect(records[54].translations.length).toEqual(1);
    expect(records[15].translations.length).toEqual(2);

    const specialRecord = records[15];
    specialRecord.title = 'New word';
    expect((await postRepository.save(specialRecord)).title).toEqual(
      'New word'
    );

    const datum = data[0];
    const unsafeValues = [
      { ...datum, translations: undefined },
      { ...datum, translations: null },
      { ...datum, translations: [] }
    ];
    const unsafeRecords = await postRepository.save(
      postRepository.create(unsafeValues)
    );
    expect(unsafeRecords[0].translations.length).toEqual(1);
    expect(unsafeRecords[1].translations.length).toEqual(1);
    expect(unsafeRecords[2].translations.length).toEqual(1);
  });

  it('should not work with invalid translatable class structure', async () => {
    try {
      await notValidRepository.save(
        notValidRepository.create({
          title: 'Valid title',
          description: 'Valid description'
        })
      );
    } catch (e) {
      // @translations() missing in class definition
      expect(e).toBeDefined();
    }
  });

  it('should serialize to JSON without annotated fields', async () => {
    // 1- Single models
    const author = await personRepository.save(
      personRepository.create({
        lastName: 'Auth',
        firstName: 'Ob',
        age: 10
      })
    );
    expect(author.firstName).toBeDefined();
    expect(author.lastName).toBeDefined();

    // 1.1- When serialized, no value for ignored field
    const serializedAuthor = JSON.parse(JSON.stringify(author));
    expect(serializedAuthor.firstName).toBeUndefined();
    expect(serializedAuthor.lastName).toBeUndefined();

    // 1.2- Same object (value) with a non annotated class
    const otherAuthor = Object.assign(new NoMetadataPerson(), author);
    const serializedOtherAuthor = JSON.parse(JSON.stringify(otherAuthor));
    expect(serializedOtherAuthor.firstName).toEqual(author.firstName);
    expect(serializedOtherAuthor.lastName).toEqual(author.lastName);

    // 2- Embedded models
    const savedPost = await postRepository.save(
      postRepository.create({
        title: 'A post',
        description: 'A description',
        author
      })
    );
    const post = await postRepository.findOne({
      where: { id: savedPost.id },
      relations: {
        author: true,
        translations: true
      }
    });
    expect(post!.translations.length).toEqual(1);
    expect(post!.author.firstName).toEqual(author.firstName);
    expect(post!.author.lastName).toEqual(author.lastName);

    const serializedPost = JSON.parse(JSON.stringify(post));
    expect(serializedPost.translations).toBeUndefined();
    expect(serializedPost.author).not.toBeUndefined();
    expect(serializedPost.author.firstName).toBeUndefined();
    expect(serializedPost.author.lastName).toBeUndefined();
  });

  beforeAll(async () => {
    // 1- Building database
    db = newDb({
      autoCreateForeignKeyIndices: true
    });
    db.public.registerFunction({
      implementation: () => 'test',
      name: 'current_database'
    });
    db.public.registerFunction({
      implementation: () => 'version',
      name: 'version'
    });
    connection = await db.adapters.createTypeormDataSource({
      type: 'postgres',
      entities: [Person, Post, PostTranslation],
      synchronize: true
    });

    await connection.initialize();
    notValidRepository = new BaseRepository<NotValidPost>(
      NotValidPost,
      connection.manager
    );
    personRepository = new BaseRepository<Person>(Person, connection.manager);
    postRepository = new BaseRepository<Post>(Post, connection.manager);

    // 2- Backups before any modification
    backup = db.backup();
  });

  beforeEach(async () => {
    backup.restore();
  });

  afterAll(async () => {
    await connection?.destroy();
  });
});

import { FindOperator } from 'typeorm';
import { parseSorts, parseFilters, parsePageParams } from '..';
import { SortDirection } from '../../enums';

describe('Page Utils', () => {
  it('should not fail filters parsing with empty string', () => {
    expect(parseFilters('').where).toBeDefined();
    expect(() => parseFilters([null] as any)).not.toThrow();
  });

  it('should parse filters with string', () => {
    expect(parseFilters('age[eq]2').where).toBeDefined();
  });

  it('should parse filters with array', () => {
    expect(parseFilters(['age[eq]2', 'red[eq]true']).where).toBeDefined();
  });

  it('should throw error safe when parsing invalid filters', () => {
    expect(() => parseFilters([[null]] as any)).toThrow();
    expect(
      () =>
        parseFilters([
          'name[like]"DOE"',
          'address[like]without quotes',
          '',
          'invalid',
          'date[is]',
          'createdAt[unknown]null'
        ]).where
    ).toThrow();

    expect(() => parseFilters(['name[invalid]"DOE"'])).toThrow();
  });

  it('should do filters parsing for complex operations', () => {
    const { where, relations } = parseFilters<any>([
      // First level
      [
        'name[is]Alpha',
        'age[lt]12',
        '!customer[none]',
        'approved[eq]"OK"',
        'firstName[gtEq]"A"'
      ],
      // Second level
      [
        'firstName[like]John%',
        '!age[ltEq]22',
        'height[gt]1',
        'lastName[iLike]cAssY'
      ],
      // Third level
      [
        'status[any]["S","D","M"]',
        '!access[in][0,1,2]',
        'createdAt[bt][2022, 2023]'
      ]
    ]);

    expect(where).toBeDefined();
    expect(where.length).toEqual(3);
    expect(Object.keys(relations).length).toEqual(0);

    const [firstLevel, secondLevel, thirdLevel] = where;
    expect(Object.keys(firstLevel)).toEqual([
      'name',
      'age',
      'customer',
      'approved',
      'firstName'
    ]);
    expect(firstLevel.name).toEqual('Alpha');

    expect(Object.keys(secondLevel)).toEqual([
      'firstName',
      'age',
      // No falsy since invalid operation
      'height',
      'lastName'
    ]);
    expect(secondLevel.height instanceof FindOperator).toEqual(true);

    expect(Object.keys(thirdLevel)).toEqual(['status', 'access', 'createdAt']);
  });

  it('should parse filters with nested fields', () => {
    expect(() => parseFilters<any>(['!falsy'])).toThrow();

    const { where, relations } = parseFilters<any>([
      // First level
      ['name[is]Alpha', 'person.age[lt]12', '!customer[none]'],
      // Second level
      ['person.firstName[like]John%', 'person.lastName[iLike]cAssY'],
      // Third level
      [
        'person.profile.status[any]["S","D","M"]',
        '!person.profile.access[in][0,1,2]',
        'createdAt[bt][2022, 2023]',
        '!person.address[in][0,1,2]',
        'person.job.title[any]["S","D","M"]',
        'person.job[any]["S","D","M"]'
      ]
    ]);
    expect(where).toBeDefined();
    expect(where.length).toEqual(3);
    expect(relations.person).toBeDefined();
    const { profile, job } = relations.person as any;
    expect(profile).toEqual(true);
    expect(job).toEqual(true);

    const [firstLevel, secondLevel, thirdLevel] = where;
    expect(Object.keys(firstLevel)).toEqual(['name', 'person', 'customer']);
    expect(firstLevel.name).toEqual('Alpha');
    expect(firstLevel.person.age instanceof FindOperator).toEqual(true);

    expect(Object.keys(secondLevel)).toEqual([
      'person'
      // No falsy since invalid operation
    ]);
    expect(secondLevel.person.firstName instanceof FindOperator).toEqual(true);
    expect(secondLevel.person.lastName instanceof FindOperator).toEqual(true);

    expect(Object.keys(thirdLevel)).toEqual(['person', 'createdAt']);
    expect(thirdLevel.person.profile.status instanceof FindOperator).toEqual(
      true
    );
    expect(thirdLevel.person.profile.access instanceof FindOperator).toEqual(
      true
    );
    expect(thirdLevel.person.address instanceof FindOperator).toEqual(true);
    expect(thirdLevel.createdAt instanceof FindOperator).toEqual(true);
    expect(thirdLevel.person.job.title instanceof FindOperator).toEqual(true);
  });

  it('should not fail sorts parsing with empty string', () => {
    expect(parseSorts('')).toBeDefined();
    expect(() => parseSorts([undefined] as any)).toThrow();
  });

  it('should parse sorts with string and be ASC by default', () => {
    const { order, relations } = parseSorts<any>('name');
    expect(order).toBeDefined();
    expect(order.name).toEqual(SortDirection.ASC);
    expect(Object.keys(relations).length).toEqual(0);
  });

  it('should be case insensitive when parsing sorts', () => {
    expect(parseSorts<any>('id,aSc').order.id).toEqual(SortDirection.ASC);
    expect(parseSorts<any>('id,deSc').order.id).toEqual(SortDirection.DESC);
    expect(() => parseSorts<any>('id,bad')).toThrow();
  });

  it('should parse sorts with array', () => {
    const { order, relations } = parseSorts<any>([
      'created,DESC',
      'firstName',
      'lastName,',
      ''
    ]);
    expect(order).toBeDefined();
    expect(order.created).toEqual(SortDirection.DESC);
    expect(order.firstName).toEqual(SortDirection.ASC);
    expect(order.lastName).toEqual(SortDirection.ASC);
    expect(Object.keys(order).length).toEqual(3); // No empty key
    expect(Object.keys(relations).length).toEqual(0);
  });

  it('should parse sorts with nested fields', () => {
    const { order, relations } = parseSorts<any>([
      'created,DESC',
      'profile.firstName',
      'profile.lastName,',
      'user.age'
    ]);
    expect(order).toBeDefined();
    expect(relations.profile).toEqual(true);
    expect(relations.user).toEqual(true);
    expect(order.created).toEqual(SortDirection.DESC);
    expect(order.profile).toBeDefined();

    const profileSorts = order.profile as any;
    expect(profileSorts.firstName).toEqual(SortDirection.ASC);
    expect(profileSorts.lastName).toEqual(SortDirection.ASC);

    const userSorts = order.user as any;
    expect(order.user).toBeDefined();
    expect(userSorts.age).toEqual(SortDirection.ASC);

    expect(Object.keys(order).length).toEqual(3);
  });

  it('should parse sorts by keeping more deep nested fields', () => {
    const { order, relations } = parseSorts<any>([
      'profile,DESC',
      'profile.lastName,',
      'user.age',
      'user,ASC'
    ]);
    expect(order).toBeDefined();
    expect(relations.profile).toEqual(true);
    expect(relations.user).toEqual(true);
    expect(order.profile).toBeDefined();
    const profileSorts = order.profile as any;
    expect(profileSorts.lastName).toEqual(SortDirection.ASC);

    const userSorts = order.user as any;
    expect(userSorts.age).toEqual(SortDirection.ASC);
    expect(Object.keys(order).length).toEqual(2);
  });

  it('should parse filters and sorts instructions', () => {
    const stringFilters = [
      // First level
      ['name[is]Alpha', 'person.age[lt]12', '!customer[none]'],
      // Second level
      ['person.firstName[like]John%', 'person.lastName[iLike]cAssY'],
      // Third level
      [
        'person.profile.status[any]["S","D","M"]',
        '!person.profile.access[in][0,1,2]',
        'createdAt[bt][2022, 2023]',
        '!person.address[in][0,1,2]',
        'person.job.title[any]["S","D","M"]',
        'person.job[any]["S","D","M"]'
      ]
    ];
    const stringSorts = [
      'profile,DESC',
      'profile.lastName,',
      'user.age',
      'user,ASC'
    ];
    const {
      take,
      skip,
      where: filters,
      order: sorts,
      relations
    } = parsePageParams<any>({
      page: 3,
      size: 15,
      sorts: stringSorts,
      filters: stringFilters
    });
    expect(take).toEqual(15);
    expect(skip).toEqual(45);
    expect(filters).toBeDefined();
    expect(filters.length).toEqual(3);
    expect(relations.person).toBeDefined();
    const { profile, job } = relations.person as any;
    expect(profile).toEqual(true);
    expect(job).toEqual(true);

    expect(sorts).toBeDefined();
    expect(relations.profile).toEqual(true);
    expect(relations.user).toEqual(true);
    expect(sorts.profile).toBeDefined();

    const result1 = parsePageParams<any>({});
    expect(result1.skip).toEqual(0);
    expect(result1.take).toEqual(20);
    expect(result1.where).toEqual([]);
    expect(result1.order).toEqual({});

    // Fault tolerance for page/size
    const result2 = parsePageParams<any>({
      page: -3,
      size: -10,
      sorts: '',
      filters: ''
    });
    expect(result2.skip).toEqual(0);
    expect(result2.take).toEqual(20);
    expect(result2.where).toEqual([]);
    expect(result2.order).toEqual({});

    // No tolerance for errors on sorts directions or filters operators
    expect(() => {
      parsePageParams<any>({
        sorts: 'field,noValidDirection',
        filters: [[]]
      });
    }).toThrow();

    expect(() => {
      parsePageParams<any>({
        sorts: [],
        filters: 'field[noValidOperator]works'
      });
    }).toThrow();
  });

  it('should merge relations by taking the deeper one', () => {
    const { relations } = parsePageParams<any>({
      page: 0,
      size: 100,
      // Expect relations {person: {profile: true, address: true}}
      sorts: [
        'person.profile.firstName,asc',
        'person.address.street,desc',
        'person.job,'
      ],
      // Expect relations {person: {profile: true, address: true, job: true}}
      filters: [
        'person.profile.lastName[eq]DOE',
        'person.address.country[is]US',
        'person.job.title[gt]dev'
      ]
    });
    expect(relations.person).toBeDefined();
    const { profile, address, job } = relations.person as any;
    expect(profile).toEqual(true);
    expect(address).toEqual(true);
    expect(job).toEqual(true);

    const { relations: relations2 } = parsePageParams<any>({
      // Expect relations {person: {profile: true, address: true, work: true}}
      sorts: [
        'person.profile.firstName,asc',
        'person.address.street,desc',
        'person.work.title,'
      ],
      // Expect relations {person: {profile: true, address: true, work: {address: true}}}
      filters: [
        'person.profile.lastName[eq]DOE',
        'person.address.country[is]US',
        'person.work.address.city[eq]New york'
      ]
    });
    expect(relations.person).toBeDefined();
    const {
      profile: profile2,
      address: address2,
      work
    } = relations2.person as any;
    expect(profile2).toEqual(true);
    expect(address2).toEqual(true);
    expect(work.address).toEqual(true);
  });
});

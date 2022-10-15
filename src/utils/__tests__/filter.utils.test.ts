import { FindOperator } from 'typeorm';
import { parseFilters } from '..';

describe('Filter Utils', () => {
  it('should not fail with empty string', () => {
    expect(parseFilters('').filters).toBeDefined();
  });

  it('should work with string', () => {
    expect(parseFilters('age[eq]2').filters).toBeDefined();
  });

  it('should work with array', () => {
    expect(parseFilters(['age[eq]2', 'red[eq]true']).filters).toBeDefined();
  });

  it('should be error safe', () => {
    expect(
      parseFilters([
        'name[like]"DOE"',
        'address[like]without quotes',
        '',
        'invalid',
        'date[is]',
        'createdAt[unknown]null'
      ]).filters
    ).toBeDefined();
  });

  it('should do complex operations', () => {
    const { filters, relations } = parseFilters([
      // First level
      [
        'name[is]Alpha',
        'age[lt]12',
        '!customer[null]',
        'approved[eq]"OK"',
        'firstName[gtEq]"A"',
        ''
      ],
      // Second level
      [
        'firstName[like]John%',
        '!age[ltEq]22',
        '!falsy',
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

    expect(filters).toBeDefined();
    expect(filters.length).toEqual(3);
    expect(relations.length).toEqual(0);

    const [firstLevel, secondLevel, thirdLevel] = filters;
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

  it('should work with nested fields', () => {
    const { filters, relations } = parseFilters([
      // First level
      ['name[is]Alpha', 'person.age[lt]12', '!customer[null]'],
      // Second level
      ['person.firstName[like]John%', '!falsy', 'person.lastName[iLike]cAssY'],
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
    expect(filters).toBeDefined();
    expect(filters.length).toEqual(3);
    expect(relations.length).toEqual(1);

    const [firstLevel, secondLevel, thirdLevel] = filters;
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
});

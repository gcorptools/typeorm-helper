import { FindOperator } from 'typeorm';
import { parseFilters } from '..';

describe('Filter Utils', () => {
  it('should not fail with empty string', () => {
    expect(parseFilters('')).toBeDefined();
  });

  it('should work with string', () => {
    expect(parseFilters('age[eq]2')).toBeDefined();
  });

  it('should work with array', () => {
    expect(parseFilters(['age[eq]2', 'red[eq]true'])).toBeDefined();
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
      ])
    ).toBeDefined();
  });

  it('should do complex operations', () => {
    const filters = parseFilters([
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
});

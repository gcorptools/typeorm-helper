import { parseSorts } from '..';
import { SortDirection } from '../../enums';

describe('Sort Utils', () => {
  it('should not fail with empty string', () => {
    expect(parseSorts('')).toBeDefined();
  });

  it('should parse with string and be ASC by default', () => {
    const { sorts, relations } = parseSorts<any>('name');
    expect(sorts).toBeDefined();
    expect(sorts.name).toEqual(SortDirection.ASC);
    expect(Object.keys(relations).length).toEqual(0);
  });

  it('should be case insensitive', () => {
    expect(parseSorts<any>('id,aSc').sorts.id).toEqual(SortDirection.ASC);
    expect(parseSorts<any>('id,deSc').sorts.id).toEqual(SortDirection.DESC);
    expect(parseSorts<any>('id,bad').sorts.id).toEqual(SortDirection.ASC);
  });

  it('should parse with array', () => {
    const { sorts, relations } = parseSorts<any>([
      'created,DESC',
      'firstName',
      'lastName,',
      ''
    ]);
    expect(sorts).toBeDefined();
    expect(sorts.created).toEqual(SortDirection.DESC);
    expect(sorts.firstName).toEqual(SortDirection.ASC);
    expect(sorts.lastName).toEqual(SortDirection.ASC);
    expect(Object.keys(sorts).length).toEqual(3); // No empty key
    expect(Object.keys(relations).length).toEqual(0);
  });

  it('should parse nested fields', () => {
    const { sorts, relations } = parseSorts<any>([
      'created,DESC',
      'profile.firstName',
      'profile.lastName,',
      'user.age'
    ]);
    expect(sorts).toBeDefined();
    expect(relations.profile).toEqual(true);
    expect(relations.user).toEqual(true);
    expect(sorts.created).toEqual(SortDirection.DESC);
    expect(sorts.profile).toBeDefined();

    const profileSorts = sorts.profile as any;
    expect(profileSorts.firstName).toEqual(SortDirection.ASC);
    expect(profileSorts.lastName).toEqual(SortDirection.ASC);

    const userSorts = sorts.user as any;
    expect(sorts.user).toBeDefined();
    expect(userSorts.age).toEqual(SortDirection.ASC);

    expect(Object.keys(sorts).length).toEqual(3);
  });

  it('should keep last nested fields', () => {
    const { sorts, relations } = parseSorts<any>([
      'profile,DESC',
      'profile.lastName,',
      'user.age',
      'user,ASC'
    ]);
    expect(sorts).toBeDefined();
    expect(relations.profile).toEqual(true);
    expect(relations.user).toEqual(true);
    expect(sorts.profile).toBeDefined();
    const profileSorts = sorts.profile as any;
    expect(profileSorts.lastName).toEqual(SortDirection.ASC);

    expect(sorts.user).toEqual(SortDirection.ASC);
    expect(Object.keys(sorts).length).toEqual(2);
  });
});

import {
  capitalizeFirst,
  compareToHash,
  EMPTY,
  isEmpty,
  toHash
} from '../common.utils';

describe('Common Utils', () => {
  it('should returns true if empty array/string, false if not', () => {
    expect(isEmpty([])).toEqual(true);
    expect(isEmpty('')).toEqual(true);
    expect(isEmpty(' ', true)).toEqual(true);
    expect(isEmpty(undefined)).toEqual(true);

    expect(isEmpty('<p></p>')).toEqual(false);
    expect(isEmpty('<p></p>', true)).toEqual(true);

    const empty: any = EMPTY;
    Object.keys(EMPTY).forEach((key: string) =>
      expect(isEmpty(empty[key], true)).toEqual(true)
    );
  });

  it('should hash strings and validate original value', async () => {
    const words = 'Let try it';
    const hash = await toHash(words);
    expect(hash).not.toEqual(words);
    // Hashing the same pass twice should not give same results
    expect(await toHash(words)).not.toEqual(hash);

    // But we should be able to validate that our words is as its origin
    expect(await compareToHash(hash, words)).toEqual(true);

    // And not another words (even with a simple space)
    expect(await compareToHash(hash, words + ' ')).toEqual(false);
  });

  it('should capitalize first letters of each word', () => {
    expect(capitalizeFirst('')).toEqual('');
    expect(capitalizeFirst('a b c')).toEqual('A B C');
    expect(capitalizeFirst('Alpha BRAVO cHArlie')).toEqual(
      'Alpha Bravo Charlie'
    );
  });
});

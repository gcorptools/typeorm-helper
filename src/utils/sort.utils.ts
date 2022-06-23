import { isEmpty, SortDirection } from '..';

/**
 * Get sorting instruction from received string
 * @param {string | string[]} stringSorts sorting info in the form ['field1,direction', 'field2,direction', ...]
 * @return {Record<string, SortDirection>} a typeorm compatible sorting instruction
 */
export const parseSorts = (
  stringSorts: string | string[]
): Record<string, SortDirection> => {
  if (isEmpty(stringSorts)) {
    return {};
  }
  if (!Array.isArray(stringSorts)) {
    stringSorts = [stringSorts];
  }
  const delimiter = ',';
  return stringSorts.reduce(
    (sorts: Record<string, SortDirection>, value: string) => {
      if (isEmpty(value)) {
        return sorts;
      }
      const [field, direction] = value.split(delimiter);
      return {
        ...sorts,
        [field]:
          SortDirection.DESC === (direction || '').toUpperCase()
            ? SortDirection.DESC
            : SortDirection.ASC
      };
    },
    {}
  );
};

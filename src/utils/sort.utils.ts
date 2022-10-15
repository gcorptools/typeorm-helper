import { isEmpty, SortDirection, Sorts } from '..';

const parseSingleSort = (field: string, direction: string): Sorts => {
  const sortDirection: SortDirection =
    SortDirection.DESC === (direction || '').toUpperCase()
      ? SortDirection.DESC
      : SortDirection.ASC;
  const fields = field.split('.').reverse();
  return fields.reduce(
    (sorts: Sorts, property: string) => ({ [property]: sorts }),
    sortDirection as any
  );
};

const isRecord = (value: any) => {
  return !Object.values(SortDirection).includes(value as any);
};

const deepMerge = (target: Sorts, source: Sorts): any => {
  const sourceKeys = Object.keys(source);
  return sourceKeys.reduce((sorts: Sorts, field: string) => {
    const sourceValue = source[field];
    const targetValue = target[field];
    if (!targetValue) {
      return { ...sorts, [field]: sourceValue };
    }
    if (!isRecord(sourceValue)) {
      return { ...sorts, [field]: sourceValue };
    }
    const safeTargetValue: any = Object.values(SortDirection).includes(
      targetValue as any
    )
      ? {}
      : targetValue;
    const safeSourceValue = sourceValue as any;
    return { ...sorts, [field]: { ...safeTargetValue, ...safeSourceValue } };
  }, target);
};

/**
 * Get sorting instruction from received string
 * @param {string | string[]} stringSorts sorting info in the form ['field1,direction', 'field2,direction', ...]
 * @return {Sorts} a typeorm compatible sorting instruction
 */
export const parseSorts = (
  stringSorts: string | string[]
): { sorts: Sorts; relations: string[] } => {
  if (isEmpty(stringSorts)) {
    return {
      sorts: {},
      relations: []
    };
  }
  if (!Array.isArray(stringSorts)) {
    stringSorts = [stringSorts];
  }
  const delimiter = ',';
  const sorts = stringSorts.reduce((sorts: Sorts, value: string) => {
    if (isEmpty(value)) {
      return sorts;
    }
    const [field, direction] = value.split(delimiter);
    return deepMerge(sorts, parseSingleSort(field, direction));
  }, {});
  const relations = Array.from(
    new Set(
      Object.keys(sorts).filter((field: string) => isRecord(sorts[field]))
    )
  );
  return { sorts, relations };
};

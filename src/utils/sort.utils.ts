import { FindOptionsOrder, FindOptionsRelations } from 'typeorm';
import { NESTED_DELIMITER, SORT_INSTRUCTION_DELIMITER } from '@src/constants';
import { SortDirection } from '@src/enums';
import { isEmpty } from '@src/utils/common.utils';

const parseSingleSort = <T>(
  field: string,
  direction: string
): FindOptionsOrder<T> => {
  const sortDirection: SortDirection =
    SortDirection.DESC === (direction || '').toUpperCase()
      ? SortDirection.DESC
      : SortDirection.ASC;
  const fields = field.split('.').reverse();
  return fields.reduce(
    (sorts: any, property: string) => ({ [property]: sorts }),
    sortDirection as any
  );
};

const isRecord = (value: any) => {
  return !Object.values(SortDirection).includes(value as any);
};

const deepMerge = (
  target: Record<string, any>,
  source: Record<string, any>
): any => {
  const sourceKeys = Object.keys(source);
  return sourceKeys.reduce((results: Record<string, any>, field: string) => {
    const sourceValue = (source as any)[field];
    const targetValue = (target as any)[field];
    if (!targetValue) {
      return { ...results, [field]: sourceValue };
    }
    if (!isRecord(sourceValue)) {
      return { ...results, [field]: sourceValue };
    }
    const safeTargetValue: any = !isRecord(targetValue as any)
      ? {}
      : targetValue;
    const safeSourceValue = sourceValue as any;
    return { ...results, [field]: { ...safeTargetValue, ...safeSourceValue } };
  }, target);
};

type SortRelations<T> = {
  sorts: FindOptionsOrder<T>;
  relations: FindOptionsRelations<T>;
};
/**
 * Get sorting instruction from received string
 * @param {string | string[]} stringSorts sorting info in the form ['field1,direction', 'field2,direction', ...]
 * @return {Sorts} a typeorm compatible sorting instruction
 */
export const parseSorts = <T>(
  stringSorts: string | string[]
): SortRelations<T> => {
  if (isEmpty(stringSorts)) {
    return {
      sorts: {},
      relations: {}
    };
  }
  if (!Array.isArray(stringSorts)) {
    stringSorts = [stringSorts];
  }
  const sorts = stringSorts.reduce(
    (sorts: FindOptionsOrder<T>, value: string) => {
      if (isEmpty(value)) {
        return sorts;
      }
      const [field, direction] = value.split(SORT_INSTRUCTION_DELIMITER);
      return deepMerge(sorts, parseSingleSort<T>(field, direction));
    },
    {}
  );
  const relations = relationsFromSort(stringSorts);
  return { sorts, relations };
};

const relationsFromSort = <T>(
  stringSorts: string[]
): FindOptionsRelations<T> => {
  if (isEmpty(stringSorts)) {
    return {};
  }
  const nestedFields = stringSorts
    .filter((f) => f.includes(NESTED_DELIMITER))
    .map((f) => f.split(SORT_INSTRUCTION_DELIMITER)[0])
    .map((f) => f.substring(0, f.lastIndexOf(NESTED_DELIMITER)));
  const uniqueNestedFields = new Set(nestedFields);
  return Array.from(uniqueNestedFields).reduce(
    (result: FindOptionsRelations<T>, field: string) => {
      const parts = field.split(NESTED_DELIMITER).reverse();
      const value = parts.reduce((r: any, f: string) => ({ [f]: r }), true);
      return deepMerge(result, value);
    },
    {}
  );
};

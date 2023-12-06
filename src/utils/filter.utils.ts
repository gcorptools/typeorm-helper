import {
  Equal,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Like,
  ILike,
  Between,
  In,
  Any,
  IsNull,
  Not,
  FindOperator,
  FindOptionsWhere,
  FindOptionsRelations
} from 'typeorm';
import { isBoxedPrimitive } from 'util/types';
import { FilterOperator } from '@src/enums';
import { isEmpty } from '@src/utils/common.utils';

/**
 * Parse request query filters instruction into typeorm where compatible object
 * @param {string[]} stringFilters the filtering operations
 * @return {FiltersRelation} an object that can be used with Typeorm where
 */
export const parseFilters = <T>(
  stringFilters: string[][] | string[] | string
): FiltersRelation<T> => {
  const defaultResult = { filters: [], relations: {} };
  if (isEmpty(stringFilters)) {
    // No need to go further
    return defaultResult;
  }
  if (!Array.isArray(stringFilters)) {
    stringFilters = [stringFilters];
  }
  const { filters, relations } = (stringFilters as string[]).reduce(
    ({ filters, relations }: FiltersRelation<T>, stringFilter: any) => {
      const { filter, relations: newRelations } = parseFilter<T>(stringFilter);
      return {
        filters: [...filters, filter],
        relations: deepMerge(relations, newRelations, Boolean)
      };
    },
    defaultResult
  );
  return { filters, relations };
};

const NESTED_DELIMITER = '.';
const FILTER_OPERATOR_START = '[';
const FILTER_OPERATOR_END = ']';
const FILTER_OPERATOR_NOT = '!';

type SingleValueOperator<T> = (value: T | FindOperator<T>) => FindOperator<T>;

type FiltersRelation<T> = {
  filters: FindOptionsWhere<T>[];
  relations: FindOptionsRelations<T>;
};

type FilterOperation = {
  field: string;
  operator: FilterOperator;
  value: any;
  not: boolean;
};

const getTypeormOperator = <T>(): Record<
  FilterOperator,
  SingleValueOperator<T>
> => {
  return {
    [FilterOperator.is]: (value: any) => value,

    [FilterOperator.eq]: Equal,
    [FilterOperator.lt]: LessThan,
    [FilterOperator.ltEq]: LessThanOrEqual,
    [FilterOperator.gt]: MoreThan,
    [FilterOperator.gtEq]: MoreThanOrEqual,

    [FilterOperator.like]: Like,
    [FilterOperator.iLike]: ILike,

    [FilterOperator.bt]: ([from, to]: any) => Between(from, to),
    [FilterOperator.in]: (values: any) => In(values),
    [FilterOperator.any]: (values: any) => Any(values),
    [FilterOperator.none]: IsNull
  };
};

/**
 * Receives a stringified filtering instruction
 * @param {string} filterOperation a value in the form: field[operator]value
 * @return {FilterOperation} an object representing the received instruction
 */
const splitFilterOperands = (filterOperation: string): FilterOperation => {
  const safeValue = filterOperation || '';
  const operatorStart = safeValue.indexOf(FILTER_OPERATOR_START);
  const operatorEnd = safeValue.indexOf(FILTER_OPERATOR_END);

  if (isEmpty(filterOperation) || operatorStart < 0 || operatorEnd < 0) {
    // Null or invalid values
    throw new Error(
      `Cannot get filter operation from invalid or empty string: '${filterOperation}'`
    );
  }
  const rawField = safeValue.slice(0, operatorStart);
  const not = rawField.startsWith(FILTER_OPERATOR_NOT);
  const field = not ? rawField.slice(FILTER_OPERATOR_NOT.length) : rawField;
  const operator = Object.values(FilterOperator).find(
    (e) => e === safeValue.slice(operatorStart + 1, operatorEnd)
  );
  if (!operator) {
    throw new Error('Unknown provided operator');
  }
  const value = safeValue.slice(operatorEnd + 1);
  return { field, operator, value, not };
};

/**
 * Try getting original type from provided value
 * @param value the value to JSON parse
 * @returns original value if could not parse it
 */
const rawValue = (value: any) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

/**
 * Convert a filter operation to Typeorm compatible where record
 * @param {FilterOperation} filterOperation the operation to convert
 * @return {Record<string, any>} compatible value for where
 */
const convertToObject = <T>(
  filterOperation: FilterOperation
): Record<string, any> => {
  const { field, operator, value, not } = filterOperation;
  const operatorMethod = getTypeormOperator<T>()[operator];
  if (!operatorMethod) {
    return {};
  }
  let check = operatorMethod(rawValue(value));
  if (not) {
    // eslint-disable-next-line new-cap
    check = Not(check);
  }
  const fieldParts = field.split(NESTED_DELIMITER).reverse();
  return fieldParts.reduce((result: Record<string, any>, part: string) => {
    return { [part]: result };
  }, check);
};

const isRecord = (value: any): boolean => {
  const primitives = ['number', 'boolean', 'string'];
  return (
    !isBoxedPrimitive(value) &&
    !primitives.includes(typeof value) &&
    !Array.isArray(value) &&
    !(value instanceof FindOperator)
  );
};

const deepMerge = (
  target: Record<string, any>,
  source: Record<string, any>,
  leafNodeClass: new (...args: any[]) => any
): any => {
  const sourceKeys = Object.keys(source);
  return sourceKeys.reduce((results: Record<string, any>, field: string) => {
    const sourceValue = source[field];
    const targetValue = target[field];
    if (!targetValue || targetValue instanceof leafNodeClass) {
      return { ...results, [field]: sourceValue };
    }
    if (isRecord(sourceValue) && isRecord(targetValue)) {
      // Both values are Record with nested values
      return {
        ...results,
        [field]: deepMerge(targetValue, sourceValue, leafNodeClass)
      };
    }
    return { ...results, [field]: { ...targetValue, ...sourceValue } };
  }, target);
};

const relationsFromFilterOperations = <T>(
  filter: string[]
): FindOptionsRelations<T> => {
  if (isEmpty(filter)) {
    return {};
  }
  const nestedFields = filter
    .map((f) =>
      f
        .substring(0, f.indexOf(FILTER_OPERATOR_START))
        .replace(FILTER_OPERATOR_NOT, '')
    )
    .filter((f) => f.includes(NESTED_DELIMITER))
    .map((f) => f.substring(0, f.lastIndexOf(NESTED_DELIMITER)));
  const uniqueNestedFields = new Set(nestedFields);
  return Array.from(uniqueNestedFields).reduce(
    (result: FindOptionsRelations<T>, field: string) => {
      const parts = field.split(NESTED_DELIMITER).reverse();
      const value = parts.reduce((r: any, f: string) => ({ [f]: r }), true);
      return deepMerge(result, value, Boolean);
    },
    {}
  );
};

const parseFilter = <T>(
  filterOperations: string | string[]
): { filter: FindOptionsWhere<T>; relations: FindOptionsRelations<T> } => {
  if (isEmpty(filterOperations)) {
    return { filter: {}, relations: {} };
  }
  if (!Array.isArray(filterOperations)) {
    filterOperations = [filterOperations];
  }
  const filter = filterOperations.reduce(
    (result: FindOptionsWhere<T>, operation: string) => {
      const parsedOperation: FilterOperation | null =
        splitFilterOperands(operation);
      if (!parsedOperation) {
        // Invalid operation
        return result;
      }
      const newOperation = convertToObject(parsedOperation);
      return deepMerge(result, newOperation, FindOperator);
    },
    {}
  );
  const relations = relationsFromFilterOperations(filterOperations);
  return { filter, relations };
};

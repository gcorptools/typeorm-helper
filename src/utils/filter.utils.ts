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
  FindOperator
} from 'typeorm';
import { isEmpty } from '.';

/**
 * Parse request query filters instruction into typeorm where compatible object
 * @param {string[]} stringFilters the filtering operations
 * @return {Record<string, any>[]} an object that can be used with Typeorm where
 */
export const parseFilters = (
  stringFilters: string[][] | string[] | string
): Record<string, any>[] => {
  if (isEmpty(stringFilters)) {
    // No need to go further
    return [];
  }
  if (!Array.isArray(stringFilters)) {
    stringFilters = [stringFilters];
  }
  return stringFilters.map((stringFilter: string | string[]) =>
    parseFilter(stringFilter)
  );
};

/**
 * Map between keywords and typeorm Operators
 */
const FILTER_MAP_OPERATION: Record<string, (value: any) => any> = {
  is: (value: any) => value,

  eq: (value: any) => Equal(value),
  lt: (value: any) => LessThan(value),
  ltEq: (value: any) => LessThanOrEqual(value),
  gt: (value: any) => MoreThan(value),
  gtEq: (value: any) => MoreThanOrEqual(value),

  like: (value: any) => Like(value),
  iLike: (value: any) => ILike(value),

  bt: (value: any[]) => Between(value[0], value[1]),
  in: (value: any) => In(value),
  any: (value: any) => Any(value),
  null: (value: any) => IsNull()
};

type FilterOperation = {
  field: string;
  operator: string;
  value: any;
  not: boolean;
};

/**
 * Receives a stringified filtering instruction
 * @param {string} filterOperation a value in the form: field[operator]value
 * @return {FilterOperation | null} an object representing the received instruction
 */
const splitFilterOperands = (
  filterOperation: string
): FilterOperation | null => {
  const safeValue = filterOperation || '';
  const operatorStart = safeValue.indexOf(FILTER_OPERATOR_START);
  const operatorEnd = safeValue.indexOf(FILTER_OPERATOR_END);

  if (isEmpty(filterOperation) || operatorStart < 0 || operatorEnd < 0) {
    // Null or invalid values
    return null;
  }
  const rawField = safeValue.slice(0, operatorStart);
  const not = rawField.startsWith(FILTER_OPERATOR_NOT);
  const field = not ? rawField.slice(FILTER_OPERATOR_NOT.length) : rawField;
  const operator = safeValue.slice(operatorStart + 1, operatorEnd);
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
const convertToObject = (
  filterOperation: FilterOperation
): Record<string, any> => {
  const { field, operator, value, not } = filterOperation;
  const operatorMethod = FILTER_MAP_OPERATION[operator];
  if (!operatorMethod) {
    return {};
  }
  let check = operatorMethod(rawValue(value));
  if (not) {
    // eslint-disable-next-line new-cap
    check = Not(check);
  }
  const fieldParts = field.split('.').reverse();
  return fieldParts.reduce((result: Record<string, any>, part: string) => {
    return { [part]: result };
  }, check);
};

const deepMerge = (
  target: Record<string, any>,
  source: Record<string, any>
): any => {
  const sourceKeys = Object.keys(source);
  return sourceKeys.reduce((filters: Record<string, any>, field: string) => {
    const sourceValue = source[field];
    const targetValue = target[field];
    if (!targetValue || targetValue instanceof FindOperator) {
      return { ...filters, [field]: sourceValue };
    }
    if (
      Object.keys(targetValue).length > 0 &&
      Object.keys(sourceValue).length > 0
    ) {
      // Both values are Record with nested values
      return { ...filters, [field]: deepMerge(targetValue, sourceValue) };
    }
    return { ...filters, [field]: { ...targetValue, ...sourceValue } };
  }, target);
};

export const parseFilter = (
  filterOperations: string | string[]
): Record<string, any> => {
  if (isEmpty(filterOperations)) {
    return {};
  }
  if (!Array.isArray(filterOperations)) {
    filterOperations = [filterOperations];
  }
  return filterOperations.reduce(
    (result: Record<string, any>, operation: string) => {
      const parsedOperation: FilterOperation | null =
        splitFilterOperands(operation);
      if (!parsedOperation) {
        // Invalid operation
        return result;
      }
      const newOperation = convertToObject(parsedOperation);
      return deepMerge(result, newOperation);
    },
    {}
  );
};

const FILTER_OPERATOR_START = '[';
const FILTER_OPERATOR_END = ']';
const FILTER_OPERATOR_NOT = '!';

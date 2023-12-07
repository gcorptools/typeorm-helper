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
  FindOptionsRelations,
  FindOptionsOrder
} from 'typeorm';
import { isBoxedPrimitive } from 'util/types';
import { FilterOperator, SortDirection } from '@src/enums';
import { isEmpty } from '@src/utils/common.utils';
import { PageParams } from '@src/types';

/**
 * Parse request query filters instruction into typeorm where compatible object
 * @param {string[][] | string[] | string} stringFilters the filtering operations
 * @return {FiltersRelation<T>} an object that can be used with Typeorm where
 */
export const parseFilters = <T>(
  stringFilters: string[][] | string[] | string
): FiltersRelation<T> => {
  const defaultResult = { where: [], relations: {} };
  if (isEmpty(stringFilters)) {
    // No need to go further
    return defaultResult;
  }
  if (!Array.isArray(stringFilters)) {
    stringFilters = [stringFilters];
  }
  const { where: filters, relations } = (stringFilters as string[]).reduce(
    ({ where: filters, relations }: FiltersRelation<T>, stringFilter: any) => {
      const { filter, relations: newRelations } = parseFilter<T>(stringFilter);
      return {
        where: [...filters, filter],
        relations: deepMerge(relations, newRelations, isFilterRecord)
      };
    },
    defaultResult
  );
  return { where: filters, relations };
};

/**
 * Get sorting instruction from received string
 * @param {string | string[]} stringSorts sorting info in the form ['field1,direction', 'field2,direction', ...]
 * @return {SortRelations<T>} a typeorm compatible sorting instruction
 */
export const parseSorts = <T>(
  stringSorts: string | string[]
): SortRelations<T> => {
  if (isEmpty(stringSorts)) {
    return {
      order: {},
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
      return deepMerge(
        sorts,
        parseSingleSort<T>(field, direction),
        isSortRecord
      );
    },
    {}
  );
  const relations = relationsFromSort(stringSorts);
  return { order: sorts, relations };
};

/**
 * Parse provided parameters into Repository compatible values
 * page is 0 per default
 * size is 20 per default
 * sorts should looks like ['field1,direction', 'field2,direction', ...]
 * filters should looks like [['field1[operator1]value1', 'field2[operator2]value2'], ['field3[operator3]value3']]
 * @param {PageParams} params contains information for retrieving paged records
 * @returns {PageParamsResult<T>} compatible parameters for typeOrm find methods
 */
export const parsePageParams = <T>({
  page = 0,
  size = 20,
  sorts = [],
  filters = []
}: PageParams): PageParamsResult<T> => {
  const { where, relations: filtersRelations } = parseFilters<T>(filters);
  const { order, relations: sortRelations } = parseSorts(sorts);
  const relations = deepMerge(
    filtersRelations,
    sortRelations,
    (value: any) => !(typeof value === 'boolean')
  );
  if (page < 0) {
    page = 0;
  }
  if (size < 0) {
    size = 20;
  }
  const skip = page * size;
  return { take: size, skip, where, order, relations };
};

/**
 * Deep merge of two object with similar rule sets by creating a more deep one
 * @param {Record<string, any>} target object to copy onto (ie: {person: true, age: true})
 * @param {Record<string, any>} source object to copy from (ie: {person: {profile: true}, address: true})
 * @param {(value: any) => boolean} isRecord method for deciding if object is a record (not primitive nor leaf)
 * @returns {any} merged object with more deepness (ie: {person: {profile: true}, age: true, address: true})
 */
export const deepMerge = (
  target: Record<string, any>,
  source: Record<string, any>,
  isRecord: (value: any) => boolean
): any => {
  const sourceKeys = Object.keys(source);
  return sourceKeys.reduce((results: Record<string, any>, field: string) => {
    // Source value can be empty, targetValue will take precedence
    // Target value can be empty, sourceValue will take precedence
    // Both values can be non-empty while both being records, then deepMerging both
    // Both values can be non empty while one is a record while other is not, then taking record one
    // Both values can be non empty while both are not records, then take source
    const sourceValue = source[field];
    const targetValue = target[field];
    if (!targetValue || !isRecord(targetValue)) {
      return { ...results, [field]: sourceValue };
    }
    if (!sourceValue || !isRecord(sourceValue)) {
      return { ...results, [field]: targetValue };
    }
    // Both values are Record with nested values
    return {
      ...results,
      [field]: deepMerge(targetValue, sourceValue, isRecord)
    };
  }, target);
};

const NESTED_DELIMITER = '.';
const FILTER_OPERATOR_START = '[';
const FILTER_OPERATOR_END = ']';
const FILTER_OPERATOR_NOT = '!';
const SORT_INSTRUCTION_DELIMITER = ',';

type SingleValueOperator<T> = (value: T | FindOperator<T>) => FindOperator<T>;

type SortRelations<T> = {
  order: FindOptionsOrder<T>;
  relations: FindOptionsRelations<T>;
};

type FiltersRelation<T> = {
  where: FindOptionsWhere<T>[];
  relations: FindOptionsRelations<T>;
};

type PageParamsResult<T> = {
  take: number;
  skip: number;
  order: FindOptionsOrder<T>;
  where: FindOptionsWhere<T>[];
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

const isFilterRecord = (value: any): boolean => {
  const primitives = ['number', 'boolean', 'string'];
  return (
    !isBoxedPrimitive(value) &&
    !primitives.includes(typeof value) &&
    !Array.isArray(value) &&
    !(value instanceof FindOperator)
  );
};

const isSortRecord = (value: any) => {
  return !Object.values(SortDirection).includes(value as any);
};

const relationsFromFilterOperations = <T>(
  filter: string[]
): FindOptionsRelations<T> => {
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
      return deepMerge(result, value, isFilterRecord);
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
      const parsedOperation: FilterOperation = splitFilterOperands(operation);
      const newOperation = convertToObject(parsedOperation);
      return deepMerge(result, newOperation, isFilterRecord);
    },
    {}
  );
  const relations = relationsFromFilterOperations(filterOperations);
  return { filter, relations };
};

const parseSingleSort = <T>(
  field: string,
  direction: string
): FindOptionsOrder<T> => {
  const safeDirection = (direction || '').toUpperCase();
  if (isSortRecord(safeDirection)) {
    throw new Error(
      `No valid direction received, try again with ${Object.values(
        SortDirection
      )}`
    );
  }
  const sortDirection: SortDirection =
    SortDirection.DESC === safeDirection
      ? SortDirection.DESC
      : SortDirection.ASC;
  const fields = field.split(NESTED_DELIMITER).reverse();
  return fields.reduce(
    (sorts: any, property: string) => ({ [property]: sorts }),
    sortDirection as any
  );
};

const relationsFromSort = <T>(
  stringSorts: string[]
): FindOptionsRelations<T> => {
  const nestedFields = stringSorts
    .filter((f) => f.includes(NESTED_DELIMITER))
    .map((f) => f.split(SORT_INSTRUCTION_DELIMITER)[0])
    .map((f) => f.substring(0, f.lastIndexOf(NESTED_DELIMITER)));
  const uniqueNestedFields = new Set(nestedFields);
  return Array.from(uniqueNestedFields).reduce(
    (result: FindOptionsRelations<T>, field: string) => {
      const parts = field.split(NESTED_DELIMITER).reverse();
      const value = parts.reduce((r: any, f: string) => ({ [f]: r }), true);
      return deepMerge(result, value, isSortRecord);
    },
    {}
  );
};

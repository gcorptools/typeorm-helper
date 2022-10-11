import { SortDirection } from '../enums';

export type Sorts = {
  [field: string]: SortDirection | Sorts;
};

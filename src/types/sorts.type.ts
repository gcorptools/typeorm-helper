import { SortDirection } from '@src/enums';

export type Sorts = {
  [field: string]: SortDirection | Sorts;
};

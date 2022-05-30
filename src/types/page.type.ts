import { SortDirection } from '@src/enums';

/**
 * Page response for sending as API response
 */
export interface Page<T> {
  /**
   * The requested page number (one-index based)
   */
  page: number;
  /**
   * The requested size of the page
   */
  size: number;
  /**
   * The requested sorting instructions
   */
  sortBy?: Record<string, SortDirection>;
  /**
   * The current number of items
   */
  count: number;
  /**
   * The returned items
   */
  data: T[];
  /**
   * The computed total number of pages (one-index base)
   */
  totalPages: number;
  /**
   * The computed total number of items
   */
  totalElements: number;
}

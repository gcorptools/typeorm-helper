/**
 * Filters params for requesting filtered results
 */
export type FiltersParams = {
  /**
   * The requested filtering instructions
   */
  filters?: string[][] | string[] | string;
};

/**
 * Sorts params for requesting sorted results
 */
export type SortsParams = {
  /**
   * The requested sorting instructions
   */
  sorts?: string | string[];
};

/**
 * Params for requesting filtered/sorted results
 */
export type FetchParams = FiltersParams & SortsParams;

/**
 * Page params for requesting paginated/filtered/sorted results
 */
export type PageParams = {
  /**
   * The requested page number (zero-index based)
   */
  page?: number;
  /**
   * The requested size of the page
   */
  size?: number;
} & FetchParams;

/**
 * Page response for sending as API response
 */
export interface Page<T> extends Required<PageParams> {
  /**
   * The current number of items
   */
  count: number;
  /**
   * The returned items
   */
  content: T[];
  /**
   * The computed total number of pages
   */
  totalPages: number;
  /**
   * The computed total number of items
   */
  totalElements: number;
}

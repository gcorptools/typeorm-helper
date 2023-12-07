/**
 * Page params for requesting paginated/filtered/sorted results
 */
export interface PageParams {
  /**
   * The requested page number (zero-index based)
   */
  page?: number;
  /**
   * The requested size of the page
   */
  size?: number;
  /**
   * The requested sorting instructions
   */
  sorts?: string | string[];
  /**
   * The requested filtering instructions
   */
  filters?: string[][] | string[] | string;
}

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

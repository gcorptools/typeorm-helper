/**
 * Basic constructor for mixins requiring abstract parent
 */
export type AConstructor = abstract new (...args: any[]) => {};

/**
 * Basic constructor for mixins
 */
export type Constructor = new (...args: any[]) => {};

/**
 * Generic constructor for mixins requiring abstract parent
 */
export type AGConstructor<T = {}> = abstract new (...args: any[]) => T;

/**
 * Generic constructor for mixins
 */
export type GConstructor<T = {}> = new (...args: any[]) => T;

/**
 * Base empty for dealing with default values of other mixins
 */
export const BaseEmpty = () => {
  class BaseEmpty {}

  return BaseEmpty;
};

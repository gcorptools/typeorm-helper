/**
 * Basic constructor for mixins
 */
export type Constructor = new (...args: any[]) => {};

/**
 * Generic constructor for mixins
 */
export type GConstructor<T = {}> = new (...args: any[]) => T;

/**
 * When mixin requires an argument but nothing suits
 */
export const DefaultConstructor: GConstructor<any> = class {};

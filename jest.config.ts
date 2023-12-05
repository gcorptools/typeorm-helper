import type { Config } from '@jest/types';
import { pathsToModuleNameMapper } from 'ts-jest';
import tsconfigJson from './tsconfig.json';

const config: Config.InitialOptions = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  verbose: true,
  setupFilesAfterEnv: ['./src/tests/setup.ts'],
  moduleNameMapper: pathsToModuleNameMapper(
    tsconfigJson.compilerOptions.paths,
    { prefix: '<rootDir>/' }
  ),
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
};

export default config;

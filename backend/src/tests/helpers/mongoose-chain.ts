// @ts-nocheck
import { jest } from '@jest/globals';

export function createQueryChain<T>(result: T) {
  const chain: any = {};

  chain.sort = jest.fn(() => chain);
  chain.skip = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.lean = jest.fn(() => chain);
  chain.exec = jest.fn().mockResolvedValue(result);
  chain.toList = jest.fn().mockResolvedValue(result);

  return chain;
}

export function createSaveModel<TDocument>(savedDoc: TDocument) {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(savedDoc),
  }));
}
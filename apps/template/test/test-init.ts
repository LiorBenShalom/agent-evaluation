/// <reference types="jest" />
// Mock AppLogger to prevent pino worker threads from keeping Jest open
jest.mock('@kaltura/services-common', () => ({
  ...jest.requireActual('@kaltura/services-common'),
  AppLogger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  })),
}));

export default {
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {},
};

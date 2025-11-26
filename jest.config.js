/**
 * Jest Configuration for React Testing Library
 * Added in Epic 6 retrospective to fulfill action item carried since Epic 2
 */
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.rtl.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/rtl-setup.js'],
  moduleNameMapper: {
    // Mock CSS imports if needed
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  verbose: true
};

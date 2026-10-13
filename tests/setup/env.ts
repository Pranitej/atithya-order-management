/**
 * Environment for tests. Secrets here are throwaway values; the database URI
 * is replaced by the in-memory server in the api project.
 */
process.env.JWT_ACCESS_SECRET = "test-access-secret-0123456789-abcdefghij";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-0123456789-abcdefghi";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/not-used-by-unit-tests";
process.env.ORDER_STEP_SECONDS = "20";

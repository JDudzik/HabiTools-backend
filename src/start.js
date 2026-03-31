// This entrypoint is used to bootstrap the server with env variables attached.
// Specifically, it compensates for some quirks of import-hoisting.
require('@dotenvx/dotenvx').config();
require('./server');


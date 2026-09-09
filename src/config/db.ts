import {Pool} from 'pg';
import {env} from './env.js';

export const pool = new Pool({
    connectionString: env.databaseUrl,

    max: 20, // maximum number of clients in the pool
    idleTimeoutMillis: 30000, // close idle clients after 30 seconds
    connectionTimeoutMillis: 5000, // return an error after 5 seconds if connection could not be established
});
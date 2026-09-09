import app from './app.js';
import {env} from './config/env.js';
import {pool} from './config/db.js';

const startServer = async () => {
    try {
        await pool.query('SELECT 1'); // Test the database connection
        app.listen(env.port, ()=>{
            console.log(`Server is running on port ${env.port}`);
        })
    } catch (error) {
        console.error('Error starting server:', error);

        process.exit(1); // Exit the process with an error code
    }
}

startServer();
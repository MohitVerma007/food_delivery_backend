import app from './app.js';
import {env} from './config/env.js';
import {pool} from './config/db.js';
import ngrok from '@ngrok/ngrok';

const startServer = async () => {
    try {
        await pool.query('SELECT 1'); // Test the database connection
        // app.listen(env.port, ()=>{
        //     console.log(`Server is running on port ${env.port}`);
        // })

        app.listen(env.port, async () => {
  console.log(`Server is running on port ${env.port}`);

  try {
    const forwarder = await ngrok.forward({
      addr: env.port,
      authtoken: "3LC6HwlQ8aABw0SlsTqk4ZPaADA_KKjrnTKNVSq55aGRPRos", // Apna real authtoken yahan daalein
      domain: "trouble-manhandle-cosmetics.ngrok-free.dev",
    });
    console.log(`Ngrok tunnel active at: ${forwarder.url()}`);
  } catch (error) {
    console.error("Ngrok error:", error);
  }
});
    } catch (error) {
        console.error('Error starting server:', error);

        process.exit(1); // Exit the process with an error code
    }
}

startServer();
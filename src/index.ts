import { serve } from '@hono/node-server'
import app from './app.js'
import { startAppointmentCleanupJob } from './jobs/appointment-cleanup.js';


const PORT = Number(process.env.PORT ?? 3000);

startAppointmentCleanupJob();

serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})

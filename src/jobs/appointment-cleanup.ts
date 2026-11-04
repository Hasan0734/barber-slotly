import cron from "node-cron";
import { cleanupExpiredReservations } from "../services/appointment.js";


let isRunning = false;

export function startAppointmentCleanupJob() {
    cron.schedule("* * * * *", async () => {
        if (isRunning) return;

        isRunning = true;


        try {
            await cleanupExpiredReservations();

        }
        catch (err) {
            console.error("Appointment cleanup failed:", err);
        }
        finally {
            isRunning = false;

        }
    })

    console.log("Appointment cleanup job started");
}
import { Hono } from 'hono'
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';
import { auth } from './auth.js';
import { HTTPException } from 'hono/http-exception';
import { timing } from './middleware/timing.js';
import { secureHeaders } from 'hono/secure-headers';
import shops from './routes/shops.js'
import services from './routes/services.js'
import businessHours from './routes/businessHours.js';
import availability from './routes/availability.js';
import appointments from './routes/appointments.js';
import payments from './routes/payments.js';
import webhooks from './routes/webhooks.js';
import checkout from './routes/checkout.js';
import guestSessions from './routes/guest-session.js'


const app = new Hono();

app.use(logger());
app.use(requestId());
app.use(secureHeaders());
app.use(timing)
app.use('/api/*', cors());
app.use('/api/auth/*', cors({
    origin: "http://localhost:3000",
    credentials: true
}))


const api = new Hono().basePath('/api');

app.all('/api/auth/*', (c) => auth.handler(c.req.raw));

api.route('/shops', shops);
api.route('/services', services);
api.route('/business-hours', businessHours);
api.route('/availability', availability);
api.route('/appointments', appointments);
api.route('/payments', payments);
api.route('/webhooks/stripe', webhooks);
api.route('/checkout', checkout);
api.route('/guest-sessions', guestSessions)


app.route('/', api);

app.get('/api/health', (c) => {
    return c.json({ success: true, message: "Server is running 👋 " }, 200)
})

app.get("/success", (c) => {
    const sessionId = c.req.query('session_id');
    return c.json({ message: "Payment success", sessionId, success: true }, 200)
})

app.get("/cancel", (c) => {
    return c.json({ message: "Payment failed or cancelled", success: false }, 400)
})


app.notFound((c) => {
    return c.json(
        { error: { message: `Not found: ${c.req.path}`, requestId: c.get('requestId') } }
        , 404)
});

app.onError(async (err, c) => {

    if (err instanceof HTTPException) {
        const message = err.message || (await err.getResponse().text());

        return c.json({ message, requestId: c.get('requestId') }, err.status)
    }

    console.error(err)
    return c.json(
        { message: "Something went wrong." },
        500
    )
})


export default app;
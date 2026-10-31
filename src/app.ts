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
import businessHours from './routes/businessHours.js'


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
api.route('/business-hours', businessHours)



app.route('/', api);

app.get('/', (c) => {
    return c.text('Hello Hono!')
})


app.notFound((c) => {
    return c.json(
        { error: { message: `Not found: ${c.req.path}`, requestId: c.get('requestId') } }
    )
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
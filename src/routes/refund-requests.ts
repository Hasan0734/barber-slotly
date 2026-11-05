import { Hono } from "hono";
import { validateAuth } from "../middleware/validateAuth.js";
import { getRefundReqeusts } from "../services/refund-request.js";

const app = new Hono();


app.get('/', validateAuth, async (c) => {

    const customer = c.get('customer')

    const requests = await getRefundReqeusts(customer)

    return c.json({
        success: true,
        data: requests
    })
})

app.get('/:id', async (c) => {

})

app.get("/owner", async (c) => {

})

app.get('/:id/owner', async (c) => {

})

app.patch('/:id/owner/reject', async () => {

})

app.patch('/:id/owner/approve', async (c) => {

})



export default app;
import { HTTPException } from 'hono/http-exception';
import { createMiddleware } from "hono/factory";
import { auth } from "../auth.js"

type AuthVariables = {
    Variables: {
        user: typeof auth.$Infer.Session.user,
        session: typeof auth.$Infer.Session;
    };
};


export const authGuard = createMiddleware<AuthVariables>(async (c, next) => {
    const session = await auth.api.getSession({
        headers: c.req.raw.headers
    });

    if (!session) {
        throw new HTTPException(401, { message: "Unauthorized" })
    }

    c.set("user", session.user);
    c.set("session", session);


    await next();
})
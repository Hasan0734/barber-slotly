import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";
import { zValidator } from '@hono/zod-validator'
import { HTTPException } from "hono/http-exception";

export const validate = <Target extends keyof ValidationTargets, Schema extends ZodType>
    (target: Target, schema: Schema) => zValidator(target, schema, (result) => {
        if (!result.success) {

            const message = result.error.issues.map((issue) => `${issue.path} ${issue.message}`).join(', ');
            throw new HTTPException(400, { message })
        }
    })
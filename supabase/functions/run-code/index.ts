import { createExecutionHandler } from "../_shared/execute.ts";

Deno.serve(createExecutionHandler("run"));

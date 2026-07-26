import { createExecutionHandler } from "../_shared/execute.ts";

Deno.serve(createExecutionHandler("submit"));

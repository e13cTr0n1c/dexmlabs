import {handle} from '../_shared/http.mjs';

Deno.serve((req: Request) => handle(req, 'catch'));

/**
 * Module hook that redirects every import of lib/kv.js to the in-memory
 * version in kv-memory.mjs. Passed to node via --import so the real API
 * handlers run locally, unmodified, without Redis:
 *
 *   npm run local     (see package.json)
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(new URL('./kv-hooks.mjs', import.meta.url), pathToFileURL('./'));

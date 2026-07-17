/** Resolve hook: any import that lands on lib/kv.js gets kv-memory.mjs instead. */
const MEMORY_KV_URL = new URL('./kv-memory.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  const resolved = await nextResolve(specifier, context);
  if (resolved.url.endsWith('/lib/kv.js')) {
    return { ...resolved, url: MEMORY_KV_URL, shortCircuit: true };
  }
  return resolved;
}

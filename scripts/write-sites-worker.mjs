import { mkdir, writeFile } from 'node:fs/promises';

const worker = `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) {
      return response;
    }

    const url = new URL(request.url);
    if (request.method === 'GET' && !url.pathname.split('/').pop()?.includes('.')) {
      const fallback = new URL('/index.html', url);
      return env.ASSETS.fetch(new Request(fallback, request));
    }

    return response;
  },
};
`;

await mkdir('dist/server', { recursive: true });
await writeFile('dist/server/index.js', worker);

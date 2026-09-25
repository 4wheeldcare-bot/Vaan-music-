import { FastifyInstance } from 'fastify';
import { Readable } from 'node:stream';
import { getStreamUrl } from '../services/youtubeMusic.js';

async function handleStreamReply(request: any, reply: any, trackId?: string, directUrl?: string) {
  const resolvedUrl = directUrl || (trackId ? await getStreamUrl(trackId) : null);

  if (!resolvedUrl) {
    return reply.code(404).send({ error: 'Audio stream unavailable for this track' });
  }

  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Headers', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  reply.header('Accept-Ranges', 'bytes');

  if (request.method === 'HEAD') {
    reply.header('Content-Type', 'audio/mp4');
    return reply.code(200).send();
  }

  if (resolvedUrl.startsWith('https://aac.saavncdn.com')) {
    return reply.redirect(resolvedUrl, 302);
  }

  const range = request.headers.range;
  const upstreamHeaders: Record<string, string> = {};
  if (range) {
    upstreamHeaders['Range'] = range;
  }

  try {
    const upstream = await fetch(resolvedUrl, { headers: upstreamHeaders });

    const contentType = upstream.headers.get('content-type') ?? 'audio/mp4';
    const contentRange = upstream.headers.get('content-range');
    const contentLength = upstream.headers.get('content-length');

    reply.header('Content-Type', contentType);
    if (contentRange) reply.header('Content-Range', contentRange);
    if (contentLength) reply.header('Content-Length', contentLength);

    reply.code(upstream.status);
    if (upstream.body) {
      const stream = Readable.fromWeb(upstream.body as any);
      return reply.send(stream);
    }
    return reply.redirect(resolvedUrl, 302);
  } catch (err: any) {
    console.error(`[stream] proxy fetch error for ${trackId || 'direct-url'}:`, err);
    return reply.redirect(resolvedUrl, 302);
  }
}

export async function streamRoutes(fastify: FastifyInstance) {
  fastify.route({
    method: ['GET', 'HEAD'],
    url: '/api/stream',
    handler: async (request, reply) => {
      const { url, trackId } = request.query as { url?: string; trackId?: string };
      const directUrl = typeof url === 'string' ? decodeURIComponent(url) : undefined;

      if (directUrl && directUrl.startsWith('http')) {
        return handleStreamReply(request, reply, undefined, directUrl);
      }

      if (!trackId) {
        return reply.code(400).send({ error: 'trackId or url is required' });
      }

      return handleStreamReply(request, reply, trackId, undefined);
    },
  });

  fastify.route({
    method: ['GET', 'HEAD'],
    url: '/api/stream/:trackId',
    handler: async (request, reply) => {
      const { trackId } = request.params as { trackId: string };

      if (!trackId) {
        return reply.code(400).send({ error: 'trackId is required' });
      }

      return handleStreamReply(request, reply, trackId, undefined);
    },
  });
}

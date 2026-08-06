import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createLead } from '@/lib/lead-service';

const upstashRedis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

const leadRatelimit = upstashRedis
  ? new Ratelimit({
      redis: upstashRedis,
      limiter: Ratelimit.slidingWindow(100, '10 s'),
      ephemeralCache: new Map(),
      prefix: 'ratelimit:lead',
    })
  : null;

function getClientIp(request: NextRequest): string {
  return request.headers.get('cf-connecting-ip')?.trim() || 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    if (leadRatelimit) {
      const ip = getClientIp(request);
      const { success, limit, remaining, reset } = await leadRatelimit.limit(ip);

      if (!success) {
        const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));

        return NextResponse.json(
          { error: 'Too many requests' },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfterSeconds.toString(),
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            },
          }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const { email, ...metadata } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const result = await createLead({ email, metadata });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Optional: support OPTIONS for CORS if needed
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

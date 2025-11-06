import { NextResponse } from "next/server";
import { db } from '@/lib/db';

export async function GET() {
  const healthCheck: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: {
      configured: !!process.env.DATABASE_URL,
      connected: false,
    },
  };

  // Test database connection
  try {
    await db.$queryRaw`SELECT 1`;
    healthCheck.database.connected = true;
  } catch (error) {
    healthCheck.status = 'error';
    healthCheck.database.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return NextResponse.json(healthCheck, {
    status: healthCheck.status === 'ok' ? 200 : 503,
  });
}
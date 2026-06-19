// src/app/api/audit-log/route.ts
import { NextResponse } from 'next/server';
import { logB2BAuditDetailed } from '@/utils/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, username, role, action, module, description, ipAddress, entity, oldValue, newValue } = body;

    // Use our wrapper which routes to either mock json or drizzle
    await logB2BAuditDetailed(
      userId || null,
      action,
      module,
      description,
      oldValue || null,
      newValue || null,
      role || null,
      entity || null,
      ipAddress || null,
      username || null
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Audit API logging failed:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

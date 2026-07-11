import { NextResponse } from 'next/server';
export async function PUT() {
  return NextResponse.json(
    { code: 'EDIT_SERVICE_NOT_CONFIGURED' },
    { status: 501 },
  );
}

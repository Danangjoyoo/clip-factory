import { NextResponse } from 'next/server';
import { fakeControl } from '../../../infrastructure/testing/fake-control';

// Test controls are never bundled into production behavior; local/dev is the
// only supported environment for deterministic provider fakes.
const enabled = () => process.env.NODE_ENV !== 'production';

export async function GET() {
  if (!enabled())
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    state: fakeControl.state(),
    audit: fakeControl.audit(),
  });
}

export async function POST(request: Request) {
  if (!enabled())
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = (await request.json()) as {
    action?: string;
    config?: Parameters<typeof fakeControl.configure>[0];
    request?: Parameters<typeof fakeControl.highlight>[0];
  };
  if (body.action === 'reset') fakeControl.reset();
  else if (body.action === 'configure')
    fakeControl.configure(body.config ?? {});
  else if (body.action === 'highlight' && body.request)
    return NextResponse.json(fakeControl.highlight(body.request));
  else
    return NextResponse.json(
      { error: 'Unknown test-control action' },
      { status: 400 },
    );
  return NextResponse.json({ state: fakeControl.state() });
}

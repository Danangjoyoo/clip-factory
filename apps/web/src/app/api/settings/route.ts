import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({ allowedRoots: [], defaultPlatform: 'youtube', captionProfile: 'default', catalogVersion: 'local' }); }

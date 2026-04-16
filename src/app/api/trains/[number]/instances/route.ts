import { NextRequest, NextResponse } from 'next/server';
import { getTrainInstances } from '@/lib/railradar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const { number } = await params;

  if (!number) {
    return NextResponse.json({ error: 'Train number required' }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const dataProviderParam = searchParams.get('dataProvider');
  const dataProvider = dataProviderParam === 'NTES' ? 'NTES' : 'railradar';

  try {
    const instances = await getTrainInstances(number, dataProvider);
    return NextResponse.json({ instances, dataProvider });
  } catch (error) {
    console.error('Train instances error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch train instances';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

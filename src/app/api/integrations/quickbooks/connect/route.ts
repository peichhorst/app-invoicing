import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/quickbooks/callback`;
    
    if (!clientId) {
      return NextResponse.json({ error: 'QuickBooks not configured' }, { status: 500 });
    }

    // Generate state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({ userId: user.id, timestamp: Date.now() })).toString('base64');

    // QuickBooks OAuth 2.0 authorization URL
    const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'com.intuit.quickbooks.accounting');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', state);

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error: any) {
    console.error('Error creating QuickBooks auth URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create authorization URL' },
      { status: 500 }
    );
  }
}

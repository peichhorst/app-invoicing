import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { encryptToken } from '@/lib/quickbooks';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/settings?qbError=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code || !state || !realmId) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?qbError=missing_params', req.url)
      );
    }

    // Verify state parameter
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = stateData.userId;
      
      // Check if state is not too old (5 minutes)
      if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
        throw new Error('State expired');
      }
    } catch (e) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?qbError=invalid_state', req.url)
      );
    }

    // Exchange code for tokens
    const clientId = process.env.QUICKBOOKS_CLIENT_ID || '';
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || '';
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || `${process.env.NEXT_PUBLIC_BASE_URL}/api/integrations/quickbooks/callback`;
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return NextResponse.redirect(
        new URL('/dashboard/settings?qbError=token_exchange_failed', req.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?qbError=no_company', req.url)
      );
    }

    // Update company with QuickBooks credentials
    await prisma.company.update({
      where: { id: user.companyId },
      data: {
        quickbooksRealmId: realmId,
        quickbooksAccessToken: encryptedAccessToken,
        quickbooksRefreshToken: encryptedRefreshToken,
        quickbooksTokenExpiry: expiresAt,
        quickbooksConnected: true,
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard/settings?qbSuccess=true', req.url)
    );
  } catch (error: any) {
    console.error('QuickBooks callback error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard/settings?qbError=${encodeURIComponent(error.message)}`, req.url)
    );
  }
}

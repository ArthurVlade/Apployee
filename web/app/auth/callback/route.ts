import { createClient } from '@/utils/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Handles OAuth & Email Confirmation callback from Supabase Auth.
 * Exchanges the PKCE auth code for an active user session.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has an organization
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!membership) {
          return NextResponse.redirect(new URL('/onboarding', requestUrl.origin));
        }

        const response = NextResponse.redirect(new URL(next, requestUrl.origin));
        response.cookies.set('apploye_active_org_id', membership.organization_id, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 30,
        });

        return response;
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Auth exchange failed, redirect to sign-in with error param
  return NextResponse.redirect(
    new URL('/sign-in?error=AuthCallbackFailed', requestUrl.origin)
  );
}

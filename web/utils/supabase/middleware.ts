import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Updates the user's Supabase session and synchronizes auth cookies on every request.
 * Enforces route protection and redirects for protected & auth-only routes.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid using getSession() in SSR environments; getUser() contacts Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // 1. Redirect unauthenticated users trying to access protected dashboards
  const isProtectedPath =
    path.startsWith('/dashboard') || path.startsWith('/super-admin');

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('redirectedFrom', path);
    return NextResponse.redirect(url);
  }

  // 2. Redirect authenticated users away from marketing root / or auth pages directly to dashboard
  const isAuthPath =
    path.startsWith('/sign-in') || path.startsWith('/sign-up');

  if (user && (path === '/' || isAuthPath)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // 3. Tenancy check: Ensure authenticated user has at least one Organization
  // Unless they are already on the /onboarding page or API routes
  if (
    user &&
    isProtectedPath &&
    !path.startsWith('/onboarding')
  ) {
    const activeOrgCookie = request.cookies.get('apploye_active_org_id')?.value;
    
    if (!activeOrgCookie) {
      // Query membership from Supabase
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!membership) {
        // No organization found; force onboarding
        const url = request.nextUrl.clone();
        url.pathname = '/onboarding';
        return NextResponse.redirect(url);
      } else {
        // Persist active org in response cookie
        supabaseResponse.cookies.set('apploye_active_org_id', membership.organization_id, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }
    }
  }

  return supabaseResponse;
}

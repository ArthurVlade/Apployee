'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export interface AuthActionResult {
  error?: string;
  success?: boolean;
}

/**
 * Handles new user sign-up with email, password, and full name.
 */
export async function signUp(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  if (!email || !password || !fullName) {
    return { error: 'All fields (Full Name, Email, and Password) are required.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters in length.' };
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: 'Unable to create user account. Please try again.' };
  }

  // Ensure user record is written in public.users table
  const { error: profileError } = await supabase.from('users').upsert({
    id: authData.user.id,
    email: email.toLowerCase(),
    full_name: fullName,
  });

  if (profileError) {
    console.error('Failed to create public user profile:', profileError);
  }

  revalidatePath('/', 'layout');
  redirect('/onboarding');
}

/**
 * Handles user login with email and password.
 */
export async function signIn(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const supabase = await createClient();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Please enter both your email address and password.' };
  }

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: 'Authentication failed. Please verify credentials.' };
  }

  // Check if user has an existing active organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', authData.user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const cookieStore = await cookies();

  if (!membership) {
    revalidatePath('/', 'layout');
    redirect('/onboarding');
  }

  // Store active organization ID in cookie
  cookieStore.set('apploye_active_org_id', membership.organization_id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  revalidatePath('/', 'layout');

  // Route based on role
  if (membership.role === 'MEMBER') {
    redirect('/dashboard/member');
  } else {
    redirect('/dashboard/admin/live-feed');
  }
}

/**
 * Logs out user, wipes active org cookie, and redirects to login.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const cookieStore = await cookies();

  cookieStore.delete('apploye_active_org_id');
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect('/sign-in');
}

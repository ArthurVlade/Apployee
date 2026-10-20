// app/auth/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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
  const orgName = (formData.get('organizationName') as string) || 'My Workspace';

  if (!email || !password || !fullName) {
    return { error: 'Full Name, Work Email, and Password are all required.' };
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
    return { error: 'Unable to provision user account. Please check your credentials.' };
  }

  // Create or sync the user profile record
  const { error: profileError } = await supabase.from('users').upsert({
    id: authData.user.id,
    email: email.toLowerCase(),
    full_name: fullName,
  });

  if (profileError) {
    console.error('Failed to initialize public user profile:', profileError);
  }

  // Create primary organization
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      slug: orgName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6),
      owner_id: authData.user.id,
      plan: 'pro',
    })
    .select('id')
    .single();

  if (!orgError && orgData) {
    // Add owner as organization member
    await supabase.from('organization_members').insert({
      organization_id: orgData.id,
      user_id: authData.user.id,
      role: 'owner',
      hourly_rate: 45.0,
      tracking_policy: {
        screenshot_frequency: 3,
        blur_screenshots: false,
        idle_threshold_minutes: 5,
        track_active_window: true,
      },
    });
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
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

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: signInError.message };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

/**
 * Handles user sign out.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/login');
}

/**
 * Handles password recovery requests via Supabase Auth resetPasswordForEmail.
 */
export async function resetPasswordForEmailAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const supabase = await createClient();
  const email = formData.get('email') as string;

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid work email address.' };
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const redirectTo = `${origin}/auth/callback?next=/auth/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
  };
}

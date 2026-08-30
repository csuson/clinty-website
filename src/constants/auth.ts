/** Where Supabase sends users after they confirm their email. */
export function getEmailConfirmRedirectUrl(): string {
  return `${window.location.origin}/sign-in?email_confirmed=1`
}

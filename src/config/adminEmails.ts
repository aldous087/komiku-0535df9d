// Admin email whitelist - only these emails can access admin panel
export const ADMIN_EMAILS = [
  "admin@komikru.com",
  "superadmin@komikru.com",
  // Add more admin emails here
];

export const isAdminEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

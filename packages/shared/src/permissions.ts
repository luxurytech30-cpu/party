export const PLATFORM_ROLES = ['customer', 'admin', 'super_admin'] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const BUSINESS_ROLES = ['owner', 'manager', 'staff', 'viewer'] as const;
export type BusinessRole = (typeof BUSINESS_ROLES)[number];

export const BUSINESS_PERMISSIONS = [
  'business.read',
  'business.update',
  'business.delete',
  'team.manage',
  'capabilities.manage',
  'offerings.manage',
  'media.manage',
  'availability.manage',
  'bookings.read',
  'bookings.manage',
  'quotes.manage',
  'reviews.reply',
  'analytics.read',
  'subscription.manage',
] as const;
export type BusinessPermission = (typeof BUSINESS_PERMISSIONS)[number];

const ALL = BUSINESS_PERMISSIONS;

export const ROLE_PERMISSIONS: Record<BusinessRole, readonly BusinessPermission[]> = {
  owner: ALL,
  manager: ALL.filter(
    (p) => p !== 'business.delete' && p !== 'team.manage' && p !== 'subscription.manage',
  ),
  staff: [
    'business.read',
    'offerings.manage',
    'media.manage',
    'availability.manage',
    'bookings.read',
    'bookings.manage',
    'quotes.manage',
  ],
  viewer: ['business.read', 'bookings.read', 'analytics.read'],
};

export function roleHasPermission(role: BusinessRole, perm: BusinessPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm);
}

export function isPlatformAdmin(roles: readonly PlatformRole[]): boolean {
  return roles.includes('admin') || roles.includes('super_admin');
}

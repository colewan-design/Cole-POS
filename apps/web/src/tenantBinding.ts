// Client-side override for which organization/store the staff app (app.html)
// talks to. Absent by default — src/main.ts falls back to the build-time
// VITE_POS_ORGANIZATION_SLUG/VITE_POS_STORE_CODE env vars, which is the
// production deployment's single hardcoded tenant. This key only gets set
// after a browser explicitly signs up or pairs via src/onboarding, so
// existing browsers/deployments are completely unaffected.
export const STAFF_TENANT_STORAGE_KEY = 'pos_staff_tenant'

export interface StaffTenant {
  organizationSlug: string
  storeCode: string
}

export function writeStaffTenant(tenant: StaffTenant) {
  window.localStorage.setItem(STAFF_TENANT_STORAGE_KEY, JSON.stringify(tenant))
}

export function readStaffTenant(): StaffTenant | null {
  try {
    const raw = window.localStorage.getItem(STAFF_TENANT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StaffTenant>
    return parsed.organizationSlug && parsed.storeCode
      ? { organizationSlug: parsed.organizationSlug, storeCode: parsed.storeCode }
      : null
  } catch {
    return null
  }
}

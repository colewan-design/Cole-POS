import type { VercelRequest, VercelResponse } from '@vercel/node'
import { FieldValue, type Timestamp } from 'firebase-admin/firestore'
import { ApiError, getDb, setCorsHeaders } from './_lib/admin'

// Lets the platform operator review pending self-serve signups (api/signup.ts)
// and mark their GCash payment as manually verified. Gated by a shared
// secret, not a Firebase user — this is a cross-tenant "super-admin" tool,
// not scoped to any one organization's own Admin role.
//
// PLATFORM_ADMIN_SECRET must be set as a plain Vercel project env var
// (dashboard/CLI), never inside vercel.json's build.env — that block is
// baked into the public client bundle (that's how VITE_POS_ORGANIZATION_SLUG
// is meant to be public). FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY are
// already absent from vercel.json for this same reason.

interface PlatformAdminRequest {
  action: 'list' | 'verify'
  secret?: string
  organizationSlug?: string
}

interface SubscriptionRow {
  organizationSlug: string
  organizationName: string
  status: string
  plan: string
  amountCents: number
  gcashReference: string
  submittedAt: string | null
  verifiedAt: string | null
}

function requireSecret(secret: string | undefined) {
  const expected = process.env.PLATFORM_ADMIN_SECRET
  if (!expected) {
    throw new ApiError(500, 'Platform admin is not configured.')
  }
  if (!secret || secret !== expected) {
    throw new ApiError(401, 'Incorrect secret.')
  }
}

function toIso(ts: Timestamp | null | undefined): string | null {
  return ts ? ts.toDate().toISOString() : null
}

async function listSignups(): Promise<SubscriptionRow[]> {
  const db = getDb()
  const orgsSnap = await db.collection('organizations').get()

  const rows = await Promise.all(
    orgsSnap.docs.map(async (orgDoc): Promise<SubscriptionRow | null> => {
      const subSnap = await db.doc(`organizations/${orgDoc.id}/private/subscription`).get()
      if (!subSnap.exists) return null

      const sub = subSnap.data() as {
        status: string
        plan: string
        amountCents: number
        gcashReference: string
        submittedAt: Timestamp | null
        verifiedAt: Timestamp | null
      }

      return {
        organizationSlug: orgDoc.id,
        organizationName: (orgDoc.data().name as string | undefined) ?? orgDoc.id,
        status: sub.status,
        plan: sub.plan,
        amountCents: sub.amountCents,
        gcashReference: sub.gcashReference,
        submittedAt: toIso(sub.submittedAt),
        verifiedAt: toIso(sub.verifiedAt),
      }
    }),
  )

  return rows
    .filter((row): row is SubscriptionRow => row !== null)
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
}

async function verifySignup(organizationSlug: string) {
  if (!organizationSlug) {
    throw new ApiError(400, 'organizationSlug is required.')
  }

  const subRef = getDb().doc(`organizations/${organizationSlug}/private/subscription`)
  const subSnap = await subRef.get()
  if (!subSnap.exists) {
    throw new ApiError(404, 'No subscription record for that store.')
  }

  await subRef.update({ status: 'active', verifiedAt: FieldValue.serverTimestamp() })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  try {
    const body = (req.body ?? {}) as PlatformAdminRequest
    requireSecret(body.secret)

    if (body.action === 'list') {
      const signups = await listSignups()
      res.status(200).json({ signups })
      return
    }

    if (body.action === 'verify') {
      await verifySignup(body.organizationSlug ?? '')
      res.status(200).json({ ok: true })
      return
    }

    res.status(400).json({ error: 'Unknown action.' })
  } catch (err) {
    if (err instanceof ApiError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    console.error('platform-admin failed:', err)
    res.status(500).json({ error: 'Something went wrong.' })
  }
}

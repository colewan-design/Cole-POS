import { ref } from 'vue'
import { App as CapacitorApp } from '@capacitor/app'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@pos/web/storefront/firebase'

// Polled from SettingsPage.vue. Compares against a doc the developer
// updates by hand on each release (see firebase/SCHEMA.md's appReleases
// entry) — App.getInfo() reads the real installed package's versionCode,
// not anything baked into the JS bundle, so this reflects what's actually
// installed on the device.
const RELEASE_DOC_ID = 'storefront-android'

interface ReleaseDoc {
  versionCode: number
  versionName: string
  apkUrl: string
}

export interface UpdateStatus {
  checking: boolean
  updateAvailable: boolean
  currentVersionName: string
  latestVersionName: string
  apkUrl: string
}

const status = ref<UpdateStatus>({
  checking: false,
  updateAvailable: false,
  currentVersionName: '',
  latestVersionName: '',
  apkUrl: '',
})

export function useStorefrontUpdateCheck() {
  async function check() {
    if (status.value.checking) return
    status.value.checking = true

    try {
      // Throws UNIMPLEMENTED in a plain browser (dev server) — there's no
      // native package to report on there, so the catch below just leaves
      // updateAvailable false, which is the correct outcome anyway.
      const info = await CapacitorApp.getInfo()
      status.value.currentVersionName = info.version
      const currentVersionCode = Number(info.build)

      const snap = await getDoc(doc(db, 'appReleases', RELEASE_DOC_ID))
      if (!snap.exists()) return

      const release = snap.data() as ReleaseDoc
      status.value.latestVersionName = release.versionName
      status.value.apkUrl = release.apkUrl
      status.value.updateAvailable = release.versionCode > currentVersionCode
    } catch {
      // Best-effort — offline, unimplemented on web, or no release doc yet.
    } finally {
      status.value.checking = false
    }
  }

  return { status, check }
}

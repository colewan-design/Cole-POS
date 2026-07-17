import { Haptics, ImpactStyle } from '@capacitor/haptics'

export { ImpactStyle }

// Best-effort: no-ops on platforms/browsers without haptic support.
export function haptic(style: ImpactStyle) {
  Haptics.impact({ style }).catch(() => {})
}

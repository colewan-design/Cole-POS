interface UsbDeviceLike {
  productName?: string
  manufacturerName?: string
}

interface UsbNavigator {
  getDevices?: () => Promise<UsbDeviceLike[]>
}

interface BluetoothNavigator {
  getAvailability?: () => Promise<boolean>
}

interface NavigatorWithDeviceApis extends Navigator {
  usb?: UsbNavigator
  bluetooth?: BluetoothNavigator
}

export interface ReceiptPrinterCapabilities {
  browserPrintAvailable: boolean
  secureContext: boolean
  usbSupported: boolean
  bluetoothSupported: boolean
  bluetoothAvailable: boolean | null
  grantedUsbDevices: Array<{ name: string }>
}

export async function detectReceiptPrinterCapabilities(): Promise<ReceiptPrinterCapabilities> {
  const nav = typeof navigator === 'undefined' ? null : navigator as NavigatorWithDeviceApis
  const secureContext = typeof window !== 'undefined' ? window.isSecureContext : false
  const browserPrintAvailable = typeof window !== 'undefined' && typeof window.print === 'function'
  const usbSupported = Boolean(nav?.usb?.getDevices)
  const bluetoothSupported = Boolean(nav?.bluetooth?.getAvailability)

  let grantedUsbDevices: UsbDeviceLike[] = []
  if (nav?.usb?.getDevices && secureContext) {
    try {
      grantedUsbDevices = await nav.usb.getDevices()
    } catch {
      grantedUsbDevices = []
    }
  }

  let bluetoothAvailable: boolean | null = null
  if (nav?.bluetooth?.getAvailability && secureContext) {
    try {
      bluetoothAvailable = await nav.bluetooth.getAvailability()
    } catch {
      bluetoothAvailable = null
    }
  }

  return {
    browserPrintAvailable,
    secureContext,
    usbSupported,
    bluetoothSupported,
    bluetoothAvailable,
    grantedUsbDevices: grantedUsbDevices.map((device) => ({
      name: device.productName || device.manufacturerName || 'Granted USB device',
    })),
  }
}

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CareSignal Healthcare Platform',
    short_name: 'CareSignal',
    description: 'Secure Real-Time Sensor Operations and Patient Telemetry Platform',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'window-controls-overlay', 'minimal-ui'],
    background_color: '#0a1b21',
    theme_color: '#1b8b83',
    orientation: 'portrait-primary',
    categories: ['medical', 'health', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Live Sensors',
        short_name: 'Sensors',
        description: 'View and manage active sensors and telemetry',
        url: '/sensors',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Customers Directory',
        short_name: 'Customers',
        description: 'Browse registered customer profiles and devices',
        url: '/customers',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Add New Sensor',
        short_name: 'New Sensor',
        description: 'Register and attach new sensor hardware',
        url: '/sensors/new',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Operational Reports',
        short_name: 'Reports',
        description: 'Access compliance, inventory, and export reports',
        url: '/reports',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}

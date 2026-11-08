import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Elroco',
    short_name: 'Elroco',
    description: 'VIN decoder for Australian-delivered vehicles. The Elroco parts catalogue is coming soon.',
    start_url: '/',
    display: 'standalone',
    background_color: '#02070D',
    theme_color: '#02070D',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}

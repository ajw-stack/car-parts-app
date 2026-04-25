import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Elroco',
    short_name: 'Elroco',
    description: 'Elroco Parts Catalogue',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#E8000D',
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

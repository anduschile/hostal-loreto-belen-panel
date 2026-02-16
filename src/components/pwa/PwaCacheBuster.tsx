'use client';

import { useEffect } from 'react';

const CACHE_BUST_VERSION = '2026-02-16-1'; // Hardcoded version flag

export default function PwaCacheBuster() {
  useEffect(() => {
    // 1. Check if we've already busted the cache for this version
    const hasBustedCache = localStorage.getItem(`pwa_cache_busted_${CACHE_BUST_VERSION}`);
    const isNoCacheParam = window.location.search.includes('nocache=1');

    if (hasBustedCache || isNoCacheParam) {
      return;
    }

    const bustCache = async () => {
      try {
        console.log('Starting PWA cache cleanup...', CACHE_BUST_VERSION);

        // 2. Unregister Service Workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
            console.log('ServiceWorker unregistered:', registration.scope);
          }
        }

        // 3. Delete all Caches
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          for (const key of cacheKeys) {
            await caches.delete(key);
            console.log('Cache deleted:', key);
          }
        }

        // 4. Set flag to avoid loop
        localStorage.setItem(`pwa_cache_busted_${CACHE_BUST_VERSION}`, '1');

        // 5. Force Reload
        console.log('Reloading to apply changes...');
        // Append nocache param to ensure server fetch if needed, though window.location.reload(true) might be deprecated in some browsers
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('nocache', '1');
        window.location.replace(newUrl.toString());

      } catch (error) {
        console.error('Error during PWA cache cleanup:', error);
      }
    };

    bustCache();
  }, []); // Run once on mount

  return null; // Render nothing
}

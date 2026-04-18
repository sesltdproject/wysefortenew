import { useLayoutEffect } from 'react';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';

const DEFAULT_FAVICON_DATA_URL =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='64'%20height='64'%3E%3Crect%20width='64'%20height='64'%20fill='transparent'/%3E%3C/svg%3E";

const getOrCreateFaviconLink = (): HTMLLinkElement => {
  const existing =
    (document.querySelector('#app-favicon') as HTMLLinkElement | null) ??
    (document.querySelector("link[rel~='icon']") as HTMLLinkElement | null);

  if (existing) {
    existing.id = 'app-favicon';
    existing.rel = 'icon';
    return existing;
  }

  const link = document.createElement('link');
  link.id = 'app-favicon';
  link.rel = 'icon';
  document.head.appendChild(link);
  return link;
};

const setFaviconHref = (href: string) => {
  const link = getOrCreateFaviconLink();
  link.href = href;
};

// Ensure we never fall back to /favicon.ico (Lovable) during initial page load.
setFaviconHref(DEFAULT_FAVICON_DATA_URL);

export const useDynamicHead = () => {
  const { settings, isLoading } = useWebsiteSettings();

  // Use layout effect for synchronous DOM updates before paint
  useLayoutEffect(() => {
    if (isLoading) return;

    if (settings) {
      // Update document title
      document.title = `${settings.bankName} - Secure Digital Banking`;

      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute(
          'content',
          `${settings.bankName} - Your trusted partner in secure digital banking`
        );
      }

      // Update author meta tag
      const metaAuthor = document.querySelector('meta[name="author"]');
      if (metaAuthor) {
        metaAuthor.setAttribute('content', settings.bankName);
      }

      // Update favicon (or keep a neutral placeholder)
      setFaviconHref(settings.faviconUrl || DEFAULT_FAVICON_DATA_URL);
    }
  }, [settings, isLoading]);
};

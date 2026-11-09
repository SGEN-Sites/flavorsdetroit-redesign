// seo.mjs — structured data built only from declared facts (facts/client-facts.json).
import { SITE, COPY } from '../content/site.mjs';

export function storeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': SITE.liveOrigin + '/#store',
    name: 'Flavors Detroit',
    description: COPY.deli,
    url: SITE.liveOrigin + '/',
    image: SITE.liveOrigin + '/assets/img/og-flavors-detroit.jpg',
    logo: SITE.liveOrigin + '/assets/img/logo-sign-512.png',
    telephone: '+1-313-733-4464',
    address: { '@type': 'PostalAddress', streetAddress: SITE.street, addressLocality: SITE.city, addressRegion: SITE.region, postalCode: SITE.zip, addressCountry: 'US' },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '10:00', closes: '22:00',
    }],
    hasMap: SITE.mapsUrl,
    sameAs: [SITE.instagram],
    potentialAction: { '@type': 'OrderAction', target: SITE.portal },
  };
}

export function websiteJsonLd() {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Flavors Detroit', url: SITE.liveOrigin + '/' };
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: SITE.liveOrigin + it.path })),
  };
}

export function articleJsonLd(p) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    datePublished: p.datePublished || undefined,
    dateModified: p.dateModified || p.datePublished || undefined,
    author: { '@type': 'Organization', name: 'Flavors Detroit' },
    publisher: { '@type': 'Organization', name: 'Flavors Detroit', logo: { '@type': 'ImageObject', url: SITE.liveOrigin + '/assets/img/logo-sign-512.png' } },
    mainEntityOfPage: SITE.liveOrigin + p.path.replace(/\/$/, ''),
    description: p.metaDescription || p.excerpt || undefined,
  };
}

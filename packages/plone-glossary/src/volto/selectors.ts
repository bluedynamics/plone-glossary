import { flattenToAppURL } from '@plone/volto/helpers/Url/Url';

/** The navigation root path of the content, or '' for the site root. */
export function getNavroot(content: unknown): string {
  const id = (
    content as {
      '@components'?: { navroot?: { navroot?: { '@id'?: string } } };
    } | null
  )?.['@components']?.navroot?.navroot?.['@id'];
  return typeof id === 'string' ? flattenToAppURL(id) : '';
}

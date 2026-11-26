import config from '@plone/volto/registry';
import { nonContentRoutes } from '@plone/volto/config/NonContentRoutes';
import { isTooltipRoute } from './routes';

beforeEach(() => {
  config.settings.nonContentRoutes = nonContentRoutes;
});

describe('isTooltipRoute', () => {
  it.each([
    ['/de/news', ['/'], true],
    ['/', ['/'], true],
    ['/documentation/intro', ['/documentation'], true],
    ['/news', ['/documentation'], false],
    ['/de/news', [], false],
    ['/de/news/edit', ['/'], false],
    ['/de/news/add', ['/'], false],
    ['/controlpanel', ['/'], false],
    ['/de/news/contents', ['/'], false],
    // Content paths that start like a CMS route (B14).
    ['/editors', ['/'], true],
    ['/de/editorial', ['/'], true],
    ['/de/news/editing-tips', ['/'], true],
    ['/de/page/', ['/'], true],
    // Public routes of Volto that are not CMS UI.
    ['/de/search-tips', ['/'], true],
    ['/de/login-help', ['/'], true],
  ])('isTooltipRoute(%s, %j) is %s', (pathname, routes, expected) => {
    expect(isTooltipRoute(pathname, routes)).toBe(expected);
  });

  // Volto's isCmsUi treats a path that contains a non-content route name
  // followed by more characters as CMS UI (https://github.com/plone/volto/issues/870).
  it.each([
    '/de/sharing-economy',
    '/de/rules-of-the-game',
    '/de/contents-overview',
    '/de/layout-guide',
  ])(
    'treats the content path %s as CMS UI, as Volto does (B14, documented limit)',
    (pathname) => {
      expect(isTooltipRoute(pathname, ['/'])).toBe(false);
    },
  );
});

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
  ])('isTooltipRoute(%s, %j) is %s', (pathname, routes, expected) => {
    expect(isTooltipRoute(pathname, routes)).toBe(expected);
  });
});

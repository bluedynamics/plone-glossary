import { getBaseUrl } from '@plone/volto/helpers/Url/Url';
import { getGlossaryTerms } from './actions';

export interface AsyncItem {
  key: string;
  promise(options: {
    store: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    location: { pathname: string };
  }): unknown;
}

declare const __SERVER__: boolean | undefined;

const isServer = () => typeof __SERVER__ !== 'undefined' && !!__SERVER__;

/**
 * Loads the glossary terms on the server, after the content, so the term list
 * is part of the server HTML. In the browser it does nothing: the previous
 * page's content is still in the store while the route has already changed,
 * the glossary view loads the terms itself there.
 */
export const glossaryAsyncPropsExtender = {
  path: '/' as const,
  extend(items: AsyncItem[]): AsyncItem[] {
    return items.map((item) =>
      item.key !== 'content'
        ? item
        : {
            ...item,
            async promise(options) {
              const result = await item.promise(options);
              if (!isServer()) return result;
              const { store, location } = options;
              if (store.getState().content?.data?.['@type'] === 'Glossary') {
                try {
                  await store.dispatch(
                    getGlossaryTerms(getBaseUrl(location.pathname)),
                  );
                } catch {
                  // The page renders without the list.
                }
              }
              return result;
            },
          },
    );
  },
};

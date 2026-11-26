import { GET_GLOSSARY_TERMS, GET_GLOSSARY_TOOLTIP_TERMS } from './constants';
import { getGlossaryTerms, getTooltipTerms } from './actions';

describe('actions', () => {
  it('requests tooltip terms below the navroot', () => {
    expect(getTooltipTerms('/de')).toEqual({
      type: GET_GLOSSARY_TOOLTIP_TERMS,
      navroot: '/de',
      request: { op: 'get', path: '/de/@tooltip_terms' },
    });
    expect(getTooltipTerms('').request.path).toBe('/@tooltip_terms');
  });

  it('requests glossary terms below the path', () => {
    expect(getGlossaryTerms('/de/glossar')).toEqual({
      type: GET_GLOSSARY_TERMS,
      path: '/de/glossar',
      request: { op: 'get', path: '/de/glossar/@glossary_terms' },
    });
  });
});

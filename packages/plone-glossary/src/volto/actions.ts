import { GET_GLOSSARY_TERMS, GET_GLOSSARY_TOOLTIP_TERMS } from './constants';

export function getTooltipTerms(navroot: string) {
  return {
    type: GET_GLOSSARY_TOOLTIP_TERMS,
    navroot,
    request: { op: 'get', path: `${navroot}/@tooltip_terms` },
  };
}

export function getGlossaryTerms(path: string) {
  return {
    type: GET_GLOSSARY_TERMS,
    path,
    request: { op: 'get', path: `${path}/@glossary_terms` },
  };
}

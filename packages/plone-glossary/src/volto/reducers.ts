import type { GlossaryTerm } from '../core';
import { GET_GLOSSARY_TERMS, GET_GLOSSARY_TOOLTIP_TERMS } from './constants';

export interface TooltipTermsState {
  navroot: string | null;
  items: GlossaryTerm[];
  loading: boolean;
  loaded: boolean;
  error: unknown;
}

export interface GlossaryEntry {
  '@id': string;
  id: string;
  title: string;
  terms: string[];
  definition: string;
  description: string;
}

export interface GlossaryTermsState {
  path: string | null;
  items: Record<string, GlossaryEntry[]>;
  loading: boolean;
  loaded: boolean;
  error: unknown;
}

interface Action {
  type: string;
  navroot?: string;
  path?: string;
  result?: unknown;
  error?: unknown;
}

const initialTooltipTerms: TooltipTermsState = {
  navroot: null,
  items: [],
  loading: false,
  loaded: false,
  error: null,
};

const initialGlossaryTerms: GlossaryTermsState = {
  path: null,
  items: {},
  loading: false,
  loaded: false,
  error: null,
};

function itemsOf(result: unknown): unknown {
  return result && typeof result === 'object'
    ? (result as { items?: unknown }).items
    : undefined;
}

export function glossaryTooltipTerms(
  state: TooltipTermsState = initialTooltipTerms,
  action: Action,
): TooltipTermsState {
  switch (action.type) {
    case `${GET_GLOSSARY_TOOLTIP_TERMS}_PENDING`:
      return {
        navroot: action.navroot ?? null,
        items: [],
        loading: true,
        loaded: false,
        error: null,
      };
    case `${GET_GLOSSARY_TOOLTIP_TERMS}_SUCCESS`: {
      if (action.navroot !== state.navroot) return state;
      const items = itemsOf(action.result);
      return {
        ...state,
        items: Array.isArray(items) ? (items as GlossaryTerm[]) : [],
        loading: false,
        loaded: true,
        error: null,
      };
    }
    case `${GET_GLOSSARY_TOOLTIP_TERMS}_FAIL`:
      if (action.navroot !== state.navroot) return state;
      return {
        ...state,
        items: [],
        loading: false,
        loaded: true,
        error: action.error ?? true,
      };
    default:
      return state;
  }
}

export function glossaryTerms(
  state: GlossaryTermsState = initialGlossaryTerms,
  action: Action,
): GlossaryTermsState {
  switch (action.type) {
    case `${GET_GLOSSARY_TERMS}_PENDING`:
      return {
        path: action.path ?? null,
        items: {},
        loading: true,
        loaded: false,
        error: null,
      };
    case `${GET_GLOSSARY_TERMS}_SUCCESS`: {
      if (action.path !== state.path) return state;
      const items = itemsOf(action.result);
      const usable =
        items && typeof items === 'object' && !Array.isArray(items);
      return {
        ...state,
        items: usable ? (items as Record<string, GlossaryEntry[]>) : {},
        loading: false,
        loaded: true,
        error: null,
      };
    }
    case `${GET_GLOSSARY_TERMS}_FAIL`:
      if (action.path !== state.path) return state;
      return {
        ...state,
        items: {},
        loading: false,
        loaded: true,
        error: action.error ?? true,
      };
    default:
      return state;
  }
}

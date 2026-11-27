// The types a project needs for the documented extension points. tsconfig.json
// lists this file under `files`, so `tsc` compiles it although it is a test
// file: it fails to compile when the package entry stops exporting one of
// them or when its shape changes. Vitest runs it with the other tests; the
// type assertions do nothing at runtime.
import type { ComponentType, ReactNode } from 'react';
import { describe, expectTypeOf, it } from 'vitest';
import {
  GlossaryTrigger,
  type GlossarySettings,
  type GlossaryTextProps,
  type GlossaryTriggerProps,
  type TooltipRoute,
} from './index';
import type { GlossaryTriggerProps as ReactTriggerProps } from './react';
import type { GlossaryTextProps as VoltoTextProps } from './volto/GlossaryText';
import type {
  GlossarySettings as VoltoSettings,
  TooltipRoute as VoltoTooltipRoute,
} from './volto/settings';

describe('types of the package entry', () => {
  it('are the types of the layers', () => {
    expectTypeOf<GlossaryTriggerProps>().toEqualTypeOf<ReactTriggerProps>();
    expectTypeOf<GlossaryTextProps>().toEqualTypeOf<VoltoTextProps>();
    expectTypeOf<GlossarySettings>().toEqualTypeOf<VoltoSettings>();
    expectTypeOf<TooltipRoute>().toEqualTypeOf<VoltoTooltipRoute>();
  });

  it('have the documented shape', () => {
    expectTypeOf<GlossaryTriggerProps>().toEqualTypeOf<{
      text: string;
      term: string;
      definitions: string[];
      showTermHeading?: boolean;
    }>();
    expectTypeOf<GlossaryTextProps>().toEqualTypeOf<{ text: ReactNode }>();
    expectTypeOf<TooltipRoute>().toEqualTypeOf<
      | string
      | { path: string; exact?: boolean; strict?: boolean; sensitive?: boolean }
    >();
    expectTypeOf<GlossarySettings>().toEqualTypeOf<{
      tooltipRoutes: TooltipRoute[];
      tooltipRootSelector: string;
      caseSensitive: boolean;
      matchOnlyFirstOccurrence: boolean;
      mentionTermInTooltip: boolean;
      showAlphabetNavigation: boolean;
    }>();
  });

  it('type a wrapper of the trigger that GlossaryText can render', () => {
    // The example of the reference page.
    function MarkedTrigger(props: GlossaryTriggerProps) {
      return (
        <>
          <GlossaryTrigger {...props} />
          <span className="my-glossary-marker" aria-hidden="true" />
        </>
      );
    }
    // GlossaryText renders the registered component as this type.
    expectTypeOf(MarkedTrigger).toExtend<ComponentType<GlossaryTriggerProps>>();
  });

  it('type a project configuration', () => {
    const glossary: Partial<GlossarySettings> = {
      tooltipRoutes: ['/de', { path: '/en/documentation', exact: true }],
      caseSensitive: true,
    };
    expectTypeOf(glossary.tooltipRoutes).toEqualTypeOf<
      TooltipRoute[] | undefined
    >();
    expectTypeOf<{ exact: true }>().not.toExtend<TooltipRoute>();
  });
});

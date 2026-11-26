import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Popover,
} from 'react-aria-components';

export const HOVER_OPEN_DELAY = 300; // ms
export const HOVER_CLOSE_DELAY = 200; // ms

export interface GlossaryTriggerProps {
  /** Visible text of the occurrence, also the name of the button. */
  text: string;
  /** Key of the glossary entry, also the name of the dialog. */
  term: string;
  /** Definitions as HTML from the backend. */
  definitions: string[];
  showTermHeading?: boolean;
}

/**
 * `closed`: no popover.
 * `hover`: opened by the pointer resting on the trigger; focus stays where it
 * is, leaving trigger and popover closes it after `HOVER_CLOSE_DELAY`.
 * `pinned`: opened by a press (click, tap, Enter, Space); focus moves into the
 * dialog and the popover stays until Escape, a press outside or a press on
 * the trigger.
 */
type Mode = 'closed' | 'hover' | 'pinned';

// ---------------------------------------------------------------------------
// Single-open coordination: module state shared by all triggers on the page.

interface Occupant {
  close: () => void;
  isPinned: () => boolean;
}

let openOccupant: Occupant | null = null;

/** Makes `occupant` the open one and closes the popover that was open. */
function claim(occupant: Occupant): void {
  const previous = openOccupant;
  openOccupant = occupant;
  if (previous && previous !== occupant) {
    previous.close();
  }
}

function release(occupant: Occupant): void {
  if (openOccupant === occupant) {
    openOccupant = null;
  }
}

/** A popover the reader pinned is not replaced by hovering another term. */
function isPinnedElsewhere(occupant: Occupant): boolean {
  return openOccupant !== null && openOccupant !== occupant
    ? openOccupant.isPinned()
    : false;
}

// ---------------------------------------------------------------------------

/**
 * A button for one glossary occurrence that shows the definitions in a
 * popover. The popover opens on hover after `HOVER_OPEN_DELAY` without moving
 * focus, or on press with focus moving into the dialog. At most one popover
 * is open on the page.
 */
export function GlossaryTrigger({
  text,
  term,
  definitions,
  showTermHeading = false,
}: GlossaryTriggerProps): JSX.Element {
  // `pins` counts presses that pinned the popover, see the `key` below.
  const [state, setState] = useState<{ mode: Mode; pins: number }>({
    mode: 'closed',
    pins: 0,
  });
  const modeRef = useRef<Mode>('closed');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);

  const actions = useMemo(() => {
    const clearTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    };
    const later = (delay: number, callback: () => void) => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        callback();
      }, delay);
    };
    const setMode = (mode: Mode) => {
      modeRef.current = mode;
      setState((previous) => ({
        mode,
        pins: mode === 'pinned' ? previous.pins + 1 : previous.pins,
      }));
    };
    const occupant: Occupant = {
      close: () => {
        clearTimer();
        release(occupant);
        setMode('closed');
      },
      isPinned: () => modeRef.current === 'pinned',
    };
    const open = (mode: Mode) => {
      clearTimer();
      claim(occupant);
      setMode(mode);
    };
    const closeLater = () => later(HOVER_CLOSE_DELAY, occupant.close);

    return {
      occupant,
      clearTimer,
      close: occupant.close,
      // A press on the trigger pins the popover from `closed` or `hover`, and
      // closes it from `pinned`.
      onPress: () =>
        modeRef.current === 'pinned' ? occupant.close() : open('pinned'),
      onHoverStart: () => {
        if (modeRef.current === 'closed') {
          later(HOVER_OPEN_DELAY, () => {
            if (!isPinnedElsewhere(occupant)) {
              open('hover');
            }
          });
        } else if (modeRef.current === 'hover') {
          clearTimer();
        }
      },
      onHoverEnd: () => {
        if (modeRef.current === 'closed') {
          clearTimer();
        } else if (modeRef.current === 'hover') {
          closeLater();
        }
      },
      onPopoverEnter: () => {
        if (modeRef.current === 'hover') {
          clearTimer();
        }
      },
      onPopoverLeave: () => {
        if (modeRef.current === 'hover') {
          closeLater();
        }
      },
    };
  }, []);

  const { mode, pins } = state;

  // Escape closes the popover wherever the focus is (WCAG 1.4.13). It listens
  // in the capture phase, so a focused element that stops the propagation of
  // Escape cannot block it; Escape that ends a text composition is left
  // alone. With the focus inside the dialog, the popover restores the focus
  // to the trigger. A press outside trigger and popover closes it; React
  // commits this discrete update before the press moves the focus.
  useEffect(() => {
    if (mode === 'closed') {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) {
        actions.close();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        actions.close();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [mode, actions]);

  useEffect(
    () => () => {
      actions.clearTimer();
      release(actions.occupant);
    },
    [actions],
  );

  return (
    // `aria-expanded` and `aria-controls` follow every open popover, also one
    // opened by hover. The trigger's own toggle cannot tell a press during
    // hover (pins) from a press while pinned (closes), so it reports nothing
    // and the button's `onPress` decides.
    <DialogTrigger isOpen={mode !== 'closed'}>
      <Button
        ref={triggerRef}
        className="glossary-term__trigger"
        onPress={actions.onPress}
        onHoverStart={actions.onHoverStart}
        onHoverEnd={actions.onHoverEnd}
      >
        {text}
      </Button>
      <Popover
        // A new key on pinning mounts the popover afresh: its focus scope
        // then records the trigger, which holds the focus after the press,
        // and returns the focus there when the popover closes.
        key={pins}
        ref={popoverRef}
        className="glossary-popover"
        isNonModal
        isOpen={mode !== 'closed'}
        // The popover only ever reports closing (Escape inside it, focus
        // leaving it, scrolling); opening goes through the trigger.
        onOpenChange={actions.close}
        // Focus moving to the trigger on its press must not close the popover,
        // the press itself decides.
        shouldCloseOnInteractOutside={(element) =>
          !triggerRef.current?.contains(element)
        }
        onPointerEnter={actions.onPopoverEnter}
        onPointerLeave={actions.onPopoverLeave}
      >
        <Dialog
          aria-label={showTermHeading ? undefined : term}
          // The dialog moves focus into itself on mount, and whenever this
          // turns false, unless it is entering. Only a pinned dialog takes
          // the focus; a preview opened by hover must leave it alone, also
          // while it closes.
          isEntering={mode !== 'pinned'}
        >
          {showTermHeading && (
            <Heading slot="title" className="glossary-popover__heading">
              {term}
            </Heading>
          )}
          {definitions.length === 1 ? (
            <div
              className="glossary-popover__definition"
              dangerouslySetInnerHTML={{ __html: definitions[0] }}
            />
          ) : (
            <ol>
              {definitions.map((definition, index) => (
                <li
                  // Definitions have no identity of their own and never
                  // reorder while the popover is open.
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="glossary-popover__definition"
                  dangerouslySetInnerHTML={{ __html: definition }}
                />
              ))}
            </ol>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

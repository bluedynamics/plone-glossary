import {
  useEffect,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Dialog,
  DialogTrigger,
  Heading,
  Popover,
  PopoverContext,
  Pressable,
} from 'react-aria-components';

export const HOVER_OPEN_DELAY = 300; // ms
export const HOVER_CLOSE_DELAY = 200; // ms
// After a touch ends, iOS lets a pointer of type "mouse" enter the element
// (https://bugs.webkit.org/show_bug.cgi?id=214609). For this long after a
// touch, a mouse pointer is not taken for a hover, as react-aria's useHover
// does it.
const EMULATED_MOUSE_WINDOW = 500; // ms

export interface GlossaryTriggerProps {
  /** Visible text of the occurrence, also the name of the trigger. */
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
 * A trigger for one glossary occurrence that shows the definitions in a
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
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLElement>(null);

  // Created once per component: the single-open coordination tells the
  // occupant apart by its identity.
  const [actions] = useState(() => {
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
    // A hover is a mouse or pen resting on the trigger. A tap is a press,
    // never a hover: touch pointers are ignored, and so is the mouse pointer
    // iOS emulates right after a touch.
    let touchEnd = -Infinity;
    const isHover = (event: ReactPointerEvent) =>
      event.pointerType !== 'touch' &&
      event.timeStamp - touchEnd >= EMULATED_MOUSE_WINDOW;

    return {
      occupant,
      clearTimer,
      close: occupant.close,
      // A press on the trigger pins the popover from `closed` or `hover`, and
      // closes it from `pinned`.
      onPress: () =>
        modeRef.current === 'pinned' ? occupant.close() : open('pinned'),
      // A pointer pressed on the trigger starts a press or a text selection,
      // not a hover: a hover open that is still pending is canceled.
      onPressStart: () => {
        if (modeRef.current === 'closed') {
          clearTimer();
        }
      },
      onPointerUp: (event: ReactPointerEvent) => {
        if (event.pointerType === 'touch') {
          touchEnd = event.timeStamp;
        }
      },
      onPointerEnter: (event: ReactPointerEvent) => {
        if (!isHover(event)) {
          return;
        }
        if (modeRef.current === 'closed') {
          // A pointer that enters with a button held is a drag, for example
          // a text selection across the term, and opens nothing.
          if (event.buttons === 0) {
            later(HOVER_OPEN_DELAY, () => {
              if (!isPinnedElsewhere(occupant)) {
                open('hover');
              }
            });
          }
        } else if (modeRef.current === 'hover') {
          // Back on the trigger, with or without a button held: an open
          // preview stays, a selection inside it is not cut short.
          clearTimer();
        }
      },
      onPointerLeave: (event: ReactPointerEvent) => {
        if (!isHover(event)) {
          return;
        }
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
  });

  const { mode, pins } = state;

  // Escape closes the popover wherever the focus is (WCAG 1.4.13), and one
  // Escape is one dismissal (R32). With the focus inside the popover,
  // react-aria handles Escape: it closes the popover, restores the focus to
  // the trigger and stops the event. Otherwise this listener closes the
  // popover in the capture phase, so a focused element that stops Escape
  // cannot block it, and stops the event and its default action, so it does
  // not also dismiss a surrounding layer, clear a search field or close a
  // native dialog. Escape that ends a text composition is left alone.
  // A press outside trigger and popover closes it; React commits this
  // discrete update before the press moves the focus.
  useEffect(() => {
    if (mode === 'closed') {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.isComposing ||
        popoverRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      actions.close();
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
    // and the trigger's `onPress` decides.
    <DialogTrigger isOpen={mode !== 'closed'}>
      {/*
       * Text with the role of a button, not a native button: browsers lay a
       * native button out as one box, so a multi-word term would neither
       * wrap nor be selected like the text around it (R42). Pressable
       * handles pointer, Enter and Space (default prevented, so Space does
       * not scroll) and passes on the id and ARIA props of DialogTrigger.
       * Text selection stays possible while the pointer is down; releasing
       * it outside the trigger is no press.
       */}
      <Pressable
        ref={triggerRef}
        onPress={actions.onPress}
        onPressStart={actions.onPressStart}
        allowTextSelectionOnPress
      >
        <span
          role="button"
          tabIndex={0}
          className="glossary-term__trigger"
          onPointerUp={actions.onPointerUp}
          onPointerEnter={actions.onPointerEnter}
          onPointerLeave={actions.onPointerLeave}
        >
          {text}
        </span>
      </Pressable>
      {/*
       * DialogTrigger also passes the trigger's id as aria-labelledby to the
       * popover container, which has no role, where ARIA 1.2 prohibits a
       * name. The context is cleared and the trigger ref passed directly;
       * the dialog inside keeps its name.
       */}
      <PopoverContext.Provider value={null}>
        <Popover
          // A new key on pinning mounts the popover afresh: its focus scope
          // then records the trigger, which holds the focus after the press,
          // and returns the focus there when the popover closes.
          key={pins}
          ref={popoverRef}
          triggerRef={triggerRef}
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
      </PopoverContext.Provider>
    </DialogTrigger>
  );
}

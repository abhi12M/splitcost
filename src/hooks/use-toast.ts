import * as React from "react";

import type {
  ToastActionElement,
  ToastCustomColor,
  ToastProps,
} from "@/components/ui/toast";
import { type ToastIconName, type ToastVariant, toastVariantConfig } from "@/components/ui/toast-config";
import { takeRecentApiError } from "@/lib/devApiErrors";

// Toast state manager: `toast({ ... })` adds data here; <Toaster /> reads and displays it.
// 4 fits one realtime group save, which can show up to four notices at once
// (members added, removed, renamed, and the group renamed).
const TOAST_LIMIT = 4;
const TOAST_REMOVE_DELAY = 1_000;

const TOAST_DEFAULT_DURATIONS: Record<ToastVariant, number> = Object.fromEntries(
  Object.entries(toastVariantConfig).map(([variant, config]) => [variant, config.duration]),
) as Record<ToastVariant, number>;

export type ToastCallbackAction = {
  label: string;
  callback: () => void;
  /** Leave the toast open after the action runs, e.g. when it opens a sheet. */
  keepOpen?: boolean;
};

type ToasterToast = Omit<ToastProps, "variant"> & {
  id: string;
  /** Preferred single-line API. `title` and `description` remain supported for existing call sites. */
  message?: React.ReactNode;
  variant?: ToastVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement | ToastCallbackAction;
  dismissible?: boolean;
  /** When false, tapping elsewhere on the page leaves the toast open. Defaults per variant. */
  closeOnOutsideClick?: boolean;
  /** Same variant and text as another open toast; used to refresh it instead of stacking a copy. */
  dedupeKey?: string;
  /** Bumped when a duplicate refreshes this toast; remounting restarts its timer. */
  renewKey?: number;
  position?: "center" | "top-right" | "bottom-right" | "top-center" | "bottom-center"
  customColor?: ToastCustomColor;
  icon?: React.ReactNode | React.ElementType | ToastIconName;
  /** Development only: the exact error behind this toast, offered through a Copy button. */
  copyText?: string;
};

// How long a toast that carries the exact error stays up, so it can be read and copied.
const DEBUG_TOAST_DURATION = 30_000;

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
    type: ActionType["ADD_TOAST"];
    toast: ToasterToast;
  }
  | {
    type: ActionType["UPDATE_TOAST"];
    toast: Partial<ToasterToast>;
  }
  | {
    type: ActionType["DISMISS_TOAST"];
    toastId?: ToasterToast["id"];
  }
  | {
    type: ActionType["REMOVE_TOAST"];
    toastId?: ToasterToast["id"];
  };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
              ...t,
              open: false,
            }
            : t,
        ),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

/** The options accepted by `toast({ ... })`. */
export type ToastOptions = Omit<ToasterToast, "id">;

/** Identifies toasts whose content is plain text, so repeats can be spotted. */
function getDedupeKey(variant: ToastVariant, props: ToastOptions): string | undefined {
  const parts = [props.title, props.description, props.message];
  if (parts.every((part) => part === undefined)) return undefined;
  if (!parts.every((part) => part === undefined || typeof part === "string")) return undefined;
  return JSON.stringify([variant, ...parts]);
}

function toast({ ...props }: ToastOptions) {
  const variant = props.variant ?? "info";

  // Development: an error toast right after a failed API call shows that
  // call's exact error, with a way to copy it. Production keeps the friendly text.
  const apiError = variant === "error" ? takeRecentApiError() : null;
  if (apiError) {
    if (props.message !== undefined) props.message = apiError.message;
    else props.description = apiError.message;
    props.copyText = apiError.copyText;
    props.duration ??= DEBUG_TOAST_DURATION;
  }

  const config = toastVariantConfig[variant];
  const dedupeKey = getDedupeKey(variant, props);

  // The same message is already showing (e.g. a double tap, or the same
  // failure again): refresh that toast and restart its timer, don't stack.
  const existing = dedupeKey
    ? memoryState.toasts.find((item) => item.open && item.dedupeKey === dedupeKey)
    : undefined;
  const id = existing?.id ?? genId();

  const update = (props: Partial<ToasterToast>) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  if (existing) {
    update({ ...props, renewKey: (existing.renewKey ?? 0) + 1 });
    return { id, dismiss, update };
  }

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      variant,
      duration: props.duration ?? TOAST_DEFAULT_DURATIONS[variant],
      closeOnOutsideClick: props.closeOnOutsideClick ?? config.closeOnOutsideClick,
      type: props.type ?? config.announce,
      dedupeKey,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id: id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { TOAST_DEFAULT_DURATIONS, useToast, toast };

"use client";

import { startTransition, type FormEvent } from "react";

/**
 * Submit a form to a `useActionState` action without React clearing it
 * (2026-10-09). With `<form action={action}>`, React 19 resets every field
 * it doesn't control once the action finishes, even when the server sent
 * back "a few things need fixing": a leader lost the Dgroup name they had
 * typed. Submitting from onSubmit keeps what people typed. The clicked
 * button still counts, so `name`/`value` on submit buttons work as before.
 *
 *   <form action={action} onSubmit={keepForm(action)}>
 *
 * Keep `action` too: before the page's script has loaded, it makes the form
 * post to the server (never a GET that would put what people typed in the
 * address bar). Once loaded, onSubmit takes over and React skips the action
 * because the event's default was prevented.
 */
export function keepForm(action: (fd: FormData) => void) {
  return (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const submitter = (ev.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(ev.currentTarget, submitter);
    startTransition(() => action(fd));
  };
}

"use client";

import { startTransition, type FormEvent } from "react";

/**
 * React 19 resets a <form action={...}> after every submission, which wipes
 * what people typed when validation fails. Submitting through onSubmit keeps
 * their input; forms that should clear on success do so explicitly.
 */
export function keepValuesOnSubmit(dispatch: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
}

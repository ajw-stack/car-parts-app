"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Classes for the wrapper, e.g. "flex-1" when the field sits in a flex row. */
  wrapperClassName?: string;
  /** Colour of the eye icon; defaults to a grey that works on light and dark fields. */
  iconClassName?: string;
};

/** Password field with a show/hide eye button. */
export default function PasswordInput({ wrapperClassName = "", iconClassName = "text-gray-400 hover:text-gray-600", className = "", ...props }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className={`relative ${wrapperClassName}`}>
      <input {...props} type={show ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
        className={`absolute inset-y-0 right-0 flex items-center px-3 ${iconClassName}`}
      >
        {show ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 11-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

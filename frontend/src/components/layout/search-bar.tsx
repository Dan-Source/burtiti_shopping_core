"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    router.push(`/search?q=${encodeURIComponent(query)}`);
    setQuery("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex w-full min-w-0 items-center rounded-lg bg-gray-800 px-2.5 py-2 transition duration-150 sm:px-4 ${
        isFocused ? "ring-2 ring-red-600 ring-offset-2 ring-offset-black" : ""
      }`}
    >
      <input
        type="text"
        placeholder="buscar na buritishop"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-gray-500 sm:text-sm"
      />
      <button
        type="submit"
        className="ml-2 shrink-0 text-gray-400 transition hover:text-white"
        aria-label="Buscar"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>
    </form>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h1 className="mb-2 text-xl font-semibold">Une erreur est survenue</h1>
        <p className="mb-6 text-sm text-slate-600">
          Quelque chose s&apos;est mal passé de notre côté. Vous pouvez réessayer, ou
          revenir à l&apos;accueil.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            Réessayer
          </button>
          <Link href="/" className="btn-secondary">
            Accueil
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-slate-400">Code: {error.digest}</p>
        )}
      </div>
    </div>
  );
}

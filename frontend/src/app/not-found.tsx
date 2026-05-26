import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="card max-w-md p-8 text-center">
        <div className="mb-4 text-4xl">🔎</div>
        <h1 className="mb-2 text-xl font-semibold">Page introuvable</h1>
        <p className="mb-6 text-sm text-slate-600">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <Link href="/" className="btn-primary">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

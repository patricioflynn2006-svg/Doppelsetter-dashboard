import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-zinc-100">
      <main className="w-full max-w-4xl rounded-3xl border border-zinc-800 bg-zinc-900/60 p-10 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
              Doppelsetter
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Dashboard de métricas para clientes AI Setter
            </h1>
          </div>
          {userId ? <UserButton /> : null}
        </div>

        <p className="max-w-2xl text-zinc-300">
          Visualizá leads, conversión por etapa, mensajes y performance de
          contenido en un único lugar. Este dashboard está preparado para
          operar multi-tenant y consolidar métricas desde los flujos de n8n de
          cada cliente.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          {userId ? (
            <Link
              href="/dashboard"
              className="rounded-xl bg-emerald-500 px-5 py-3 font-medium text-black transition hover:bg-emerald-400"
            >
              Ir al dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-xl bg-emerald-500 px-5 py-3 font-medium text-black transition hover:bg-emerald-400"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/sign-up"
                className="rounded-xl border border-zinc-700 px-5 py-3 font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                Crear usuario
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

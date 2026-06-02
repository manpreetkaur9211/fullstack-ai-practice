import Link from "next/link";

const examples = [
  {
    href: "/action-state",
    title: "Action State",
    description:
      "React 19 Server Actions with useActionState — form-based state management without client-side JS.",
    tag: "Server Actions",
  },
  {
    href: "/optimistic",
    title: "Optimistic UI",
    description:
      "useOptimistic + useTransition for instant UI feedback while a server mutation is in flight.",
    tag: "useOptimistic",
  },
  {
    href: "/parallel-fetching",
    title: "Parallel Fetching",
    description:
      "Fetch multiple data sources concurrently with Suspense boundaries for granular loading states.",
    tag: "Suspense",
  },
  {
    href: "/use-hook",
    title: "use() Hook",
    description:
      "Pass a Promise as a prop and let a client component unwrap it with React 19's use() hook.",
    tag: "use()",
  },
  {
    href: "/cache-demo",
    title: "Cache Demo",
    description:
      "Next.js fetch caching strategies — no-store, revalidate, and tag-based revalidation with Server Actions.",
    tag: "Caching",
  },
  {
    href: "/dashbaord",
    title: "Dashboard",
    description:
      "Parallel data fetching with Suspense — profile, metrics, and AI insight loaded concurrently via Server Components.",
    tag: "Dashboard",
  },
  {
    href: "/users/1",
    title: "User Detail",
    description:
      "Dynamic route with server-fetched data and an optimistic inline edit form using Server Actions.",
    tag: "Dynamic Route",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">
            Next.js · React 19
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Practice Examples
          </h1>
          <p className="mt-3 text-zinc-500 dark:text-zinc-400">
            Isolated demos for React 19 patterns with the Next.js App Router.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {examples.map(({ href, title, description, tag }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex flex-col gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-black dark:group-hover:text-white">
                    {title}
                  </span>
                  <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {tag}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

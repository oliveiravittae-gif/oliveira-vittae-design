import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oliveira Vittae Designer & IA" },
      { name: "description", content: "Oliveira Vittae Designer & IA" },
      { property: "og:title", content: "Oliveira Vittae Designer & IA" },
      { property: "og:description", content: "Oliveira Vittae Designer & IA" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <h1 className="max-w-4xl font-sans text-4xl font-semibold leading-tight text-brand-yellow sm:text-6xl md:text-7xl">
        Oliveira Vittae Designer &amp; IA
      </h1>
    </main>
  );
}

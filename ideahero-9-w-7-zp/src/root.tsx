import type { ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import "./index.css";
import "./idea-hero.css";

export function meta() {
  return [
    { title: "Idea Hero — Construção Coletiva de Ideias" },
    {
      name: "description",
      content:
        "Idea Hero é uma plataforma colaborativa para ideação, criatividade e prototipagem de projetos em grupo.",
    },
    { name: "theme-color", content: "#0f172a" },
    { property: "og:title", content: "Idea Hero — Construção Coletiva de Ideias" },
    {
      property: "og:description",
      content: "Crie, colabore e dê vida a projetos inovadores em tempo real.",
    },
    { property: "og:type", content: "website" },
    { property: "og:image", content: "/idea-hero-logo.svg" },
  ];
}

export function links() {
  return [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
    { rel: "shortcut icon", href: "/favicon.ico" },
    { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
    { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
    { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
  ];
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Idea Hero — Construção Coletiva de Ideias</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}


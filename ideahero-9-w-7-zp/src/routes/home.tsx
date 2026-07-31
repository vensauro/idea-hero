import { useEffect, useState, type ComponentType } from "react";
import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Idea Hero — Construção Coletiva de Ideias" },
    {
      name: "description",
      content:
        "Idea Hero é uma plataforma colaborativa para ideação, criatividade e prototipagem de projetos em grupo.",
    },
  ];
};

export default function Home() {
  const [ClientApp, setClientApp] = useState<ComponentType | null>(null);

  useEffect(() => {
    void import("../client-app").then(({ default: App }) => {
      setClientApp(() => App);
    });
  }, []);

  if (!ClientApp) {
    return <main aria-busy="true">Carregando IdeaHero...</main>;
  }

  return <ClientApp />;
}


import { useEffect, useState, type ComponentType } from "react";

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

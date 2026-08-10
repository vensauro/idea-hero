import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useNavigate } from "react-router";
import { Identity } from "spacetimedb";
import { SpacetimeDBProvider, useSpacetimeDB, useTable } from "spacetimedb/react";
import { DbConnection, tables } from "../module_bindings";
import { Button, Input, Select, Textarea, Badge, Card, Modal } from "../components/ui";
import "../idea-hero.css";

const HOST = import.meta.env.VITE_SPACETIMEDB_HOST ?? "ws://localhost:3000";
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? "ideahero-9w7zp";
const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;

function getSavedToken(): string | undefined {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return undefined;
  try {
    return localStorage.getItem(TOKEN_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function setSavedToken(token: string) {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

const onConnect = (_conn: DbConnection, _identity: Identity, token: string) => {
  setSavedToken(token);
};

const connectionBuilder = DbConnection.builder()
  .withUri(HOST)
  .withDatabaseName(DB_NAME)
  .withToken(getSavedToken())
  .withCompression("none")
  .onConnect(onConnect);

function DecksHubContent() {
  const navigate = useNavigate();
  const { isActive, identity: myIdentity, token, getConnection } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;

  const [activeTab, setActiveTab] = useState<"my-decks" | "community" | "ai-gen" | "points">("my-decks");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  const [newDeckCover, setNewDeckCover] = useState("/cards/00a3fd49-a67d-4438-92e8-2dc61ef93b98.webp");
  const [newDeckPublic, setNewDeckPublic] = useState(true);

  // AI Generator state
  const [aiTopic, setAiTopic] = useState("");
  const [isGeneratingAiDeck, setIsGeneratingAiDeck] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if (token) setSavedToken(token);
  }, [token]);

  useEffect(() => {
    if (!conn || !isActive) return;
    conn
      .subscriptionBuilder()
      .onApplied(() => {})
      .subscribe([
        tables.user_decks,
        tables.deck_cards,
        tables.my_points,
        tables.my_points_history,
      ]);
  }, [conn, isActive]);

  const [decks] = useTable(tables.user_decks);
  const [deckCards] = useTable(tables.deck_cards);
  const [myPointsList] = useTable(tables.my_points);
  const [pointsHistory] = useTable(tables.my_points_history);

  const currentPoints = myPointsList[0]?.balance ?? 100;

  const myDecksList = useMemo(() => {
    if (!myIdentity) return [];
    return decks.filter((d) => d.ownerIdentity.toHexString() === myIdentity.toHexString());
  }, [decks, myIdentity]);

  const communityDecksList = useMemo(() => {
    if (!myIdentity) return decks.filter((d) => d.isPublic || d.isOfficial);
    return decks.filter(
      (d) => (d.isPublic || d.isOfficial) && d.ownerIdentity.toHexString() !== myIdentity.toHexString()
    );
  }, [decks, myIdentity]);

  const getCardCount = (deckId: string) => {
    return deckCards.filter((c) => c.deckId === deckId).length;
  };

  const handleCreateDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    const deckId = crypto.randomUUID();
    conn?.reducers.createDeck({
      id: deckId,
      name: newDeckName.trim(),
      description: newDeckDesc.trim(),
      coverImagePath: newDeckCover.trim() || "/cards/idea-hero-logo.svg",
      isPublic: newDeckPublic,
    });
    setNewDeckName("");
    setNewDeckDesc("");
    setShowCreateModal(false);
    navigate(`/decks/${deckId}`);
  };

  const handleDeleteDeck = (deckId: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o baralho "${name}"?`)) {
      conn?.reducers.deleteDeck({ deckId });
    }
  };

  const handleClaimFreePoints = () => {
    conn?.reducers.claimFreePoints({});
  };

  const handlePurchasePoints = (amount: number) => {
    conn?.reducers.purchasePoints({ amount });
  };

  const handleGenerateAiDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) return;
    if (currentPoints < 40) {
      setAiError("Saldo insuficiente de pontos (necessário: 40 PTS).");
      return;
    }

    setIsGeneratingAiDeck(true);
    setAiError("");

    try {
      conn?.reducers.deductUserPoints({ amount: 40, reason: "AI_DECK_GEN" });

      const formData = new FormData();
      formData.append("mode", "deck");
      formData.append("topic", aiTopic);

      const res = await fetch("/api/decks/ai-generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao gerar o baralho.");
      }

      const generatedDeck = data.deck;
      const newDeckId = crypto.randomUUID();

      conn?.reducers.createDeck({
        id: newDeckId,
        name: generatedDeck.deckName || `Baralho: ${aiTopic.slice(0, 20)}`,
        description: generatedDeck.description || `Baralho gerado por IA com o tema "${aiTopic}".`,
        coverImagePath: "/cards/27f865fe-60fb-4f78-8c6f-f38c57e7f649.webp",
        isPublic: true,
      });

      for (const card of generatedDeck.cards) {
        conn?.reducers.addCardToDeck({
          id: crypto.randomUUID(),
          deckId: newDeckId,
          stage: card.stage,
          title: card.title,
          lens: card.lens,
          imagePath: "/cards/09d3bfc2-8797-41fc-86aa-008c98b098aa.webp",
          altText: card.altText,
          provocation: card.provocation,
          tags: JSON.stringify(card.tags || []),
        });
      }

      setAiTopic("");
      setIsGeneratingAiDeck(false);
      navigate(`/decks/${newDeckId}`);
    } catch (err: any) {
      console.error("AI Deck generation failed:", err);
      setAiError(err.message || "Não foi possível gerar o baralho.");
      setIsGeneratingAiDeck(false);
    }
  };

  return (
    <div className="decks-hub-page">
      {/* Header Bar */}
      <header className="decks-header">
        <div className="decks-header-brand">
          <Link to="/" className="back-home-button">
            ← Voltar
          </Link>
          <h1>Estúdio de Baralhos</h1>
        </div>

        <div className="decks-points-badge" onClick={() => setActiveTab("points")}>
          <span className="points-sparkle">💎</span>
          <span className="points-amount">{currentPoints} PTS</span>
          <button
            className="recharge-mini-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClaimFreePoints();
            }}
          >
            +50 Grátis
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="decks-main-container">
        {/* Navigation Tabs */}
        <div className="decks-tabs">
          <button
            type="button"
            className={`decks-tab-btn ${activeTab === "my-decks" ? "active" : ""}`}
            onClick={() => setActiveTab("my-decks")}
          >
            📦 Meus Baralhos ({myDecksList.length})
          </button>
          <button
            type="button"
            className={`decks-tab-btn ${activeTab === "community" ? "active" : ""}`}
            onClick={() => setActiveTab("community")}
          >
            🌟 Comunidade & Artistas ({communityDecksList.length})
          </button>
          <button
            type="button"
            className={`decks-tab-btn ${activeTab === "ai-gen" ? "active" : ""}`}
            onClick={() => setActiveTab("ai-gen")}
          >
            ⚡ Gerador Mágico IA
          </button>
          <button
            type="button"
            className={`decks-tab-btn ${activeTab === "points" ? "active" : ""}`}
            onClick={() => setActiveTab("points")}
          >
            💎 Saldo & Pontos
          </button>
        </div>

        {/* TAB 1: Meus Baralhos */}
        {activeTab === "my-decks" && (
          <section className="decks-tab-section">
            <div className="section-top-actions">
              <h2>Seus Baralhos Customizados</h2>
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowCreateModal(true)}
              >
                ✨ Criar Novo Baralho
              </Button>
            </div>

            {myDecksList.length === 0 ? (
              <Card variant="paper" className="empty-decks-state">
                <div className="empty-icon" style={{ fontSize: "3rem" }}>🎴</div>
                <h3 style={{ fontFamily: "Palmer Lake Print", fontSize: "2.2rem" }}>Você ainda não possui nenhum baralho</h3>
                <p>Crie baralhos personalizados, faça upload de imagens com auto-tagging de IA ou use a IA para gerar baralhos completos!</p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowCreateModal(true)}
                >
                  Criar Meu Primeiro Baralho
                </Button>
              </Card>
            ) : (
              <div className="decks-grid">
                {myDecksList.map((deck) => (
                  <div key={deck.id} className="deck-card-item">
                    <div className="deck-cover-container">
                      <img src={deck.coverImagePath} alt={deck.name} className="deck-cover-img" />
                      <span className="deck-badge-count">
                        {getCardCount(deck.id)} Cartas
                      </span>
                      <span className={`deck-badge-visibility ${deck.isPublic ? "public" : "private"}`}>
                        {deck.isPublic ? "🌐 Público" : "🔒 Privado"}
                      </span>
                    </div>
                    <div className="deck-card-info">
                      <h3>{deck.name}</h3>
                      <p>{deck.description || "Sem descrição informada."}</p>
                      <div className="deck-card-actions">
                        <Link to={`/decks/${deck.id}`} style={{ textDecoration: "none", flex: 1 }}>
                          <Button variant="secondary" size="sm" style={{ width: "100%" }}>
                            🔍 Ver / Editar Cartas
                          </Button>
                        </Link>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteDeck(deck.id, deck.name)}
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: Comunidade & Artistas */}
        {activeTab === "community" && (
          <section className="decks-tab-section">
            <div className="section-top-actions">
              <h2>Baralhos da Comunidade & Artistas Em Destaque</h2>
            </div>
            <p className="section-subtitle" style={{ marginBottom: "1.5rem", color: "var(--muted)" }}>
              Estes baralhos estão públicos e podem ser selecionados para qualquer partida por você e sua equipe!
            </p>

            {communityDecksList.length === 0 ? (
              <Card variant="paper" className="empty-decks-state">
                <div className="empty-icon" style={{ fontSize: "3rem" }}>🌟</div>
                <h3 style={{ fontFamily: "Palmer Lake Print", fontSize: "2.2rem" }}>Nenhum baralho público disponível</h3>
                <p>Crie um baralho e marque como público para compartilhar com a comunidade do Idea Hero!</p>
              </Card>
            ) : (
              <div className="decks-grid">
                {communityDecksList.map((deck) => (
                  <div key={deck.id} className="deck-card-item community-item">
                    <div className="deck-cover-container">
                      <img src={deck.coverImagePath} alt={deck.name} className="deck-cover-img" />
                      <span className="deck-badge-count">
                        {getCardCount(deck.id)} Cartas
                      </span>
                      <span className="deck-badge-visibility public">
                        {deck.isOfficial ? "🏆 Oficial" : "🎨 Artista"}
                      </span>
                    </div>
                    <div className="deck-card-info">
                      <h3>{deck.name}</h3>
                      <p>{deck.description || "Baralho especial da comunidade."}</p>
                      <Link to={`/decks/${deck.id}`} style={{ textDecoration: "none" }}>
                        <Button variant="gold" size="sm" style={{ width: "100%" }}>
                          👁️ Espiar Cartas
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: Gerador Mágico IA */}
        {activeTab === "ai-gen" && (
          <section className="decks-tab-section ai-gen-section">
            <Card variant="paper" className="ai-gen-box">
              <div className="ai-gen-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontFamily: "Palmer Lake Print", fontSize: "2.2rem", margin: 0 }}>⚡ Gerador Mágico de Baralhos por IA</h2>
                <Badge variant="pink" size="md">Custo: 40 Pontos</Badge>
              </div>
              <p style={{ margin: "1rem 0 1.5rem", color: "var(--muted)" }}>
                Digite um tema ou ideia geral (ex: <i>"Exploração Espacial e Invenções Alienígenas"</i>, <i>"Fantasia Medieval e Culinária"</i>).
                A IA criará um baralho completo cobrindo as etapas do jogo com títulos, provocações e diretrizes artísticas!
              </p>

              {aiError && <div className="error-banner" style={{ background: "#fee2e2", color: "#b91c1c", padding: "0.75rem", borderRadius: "10px", border: "2px solid #b91c1c", marginBottom: "1rem" }}>{aiError}</div>}

              <form onSubmit={handleGenerateAiDeck} className="ai-gen-form">
                <Input
                  label="Tema ou Universo do Baralho:"
                  placeholder="Ex: Cidades Verdes Sustentáveis e Tecnologias Limpas"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  disabled={isGeneratingAiDeck}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isGeneratingAiDeck}
                  disabled={isGeneratingAiDeck || !aiTopic.trim()}
                  style={{ width: "100%", marginTop: "1rem" }}
                >
                  ⚡ Gerar Baralho Completo (40 PTS)
                </Button>
              </form>
            </Card>
          </section>
        )}

        {/* TAB 4: Saldo & Pontos */}
        {activeTab === "points" && (
          <section className="decks-tab-section points-section">
            <Card variant="paper" className="points-summary-card" style={{ marginBottom: "2rem" }}>
              <div className="points-big-stat" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <span className="points-label" style={{ display: "block", color: "var(--muted)", fontWeight: 800 }}>Seu Saldo Atual</span>
                <span className="points-val" style={{ fontFamily: "Palmer Lake Print", fontSize: "3.5rem", color: "var(--pink)" }}>💎 {currentPoints} PTS</span>
              </div>

              <div className="points-actions-row" style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                <Button variant="primary" size="md" onClick={handleClaimFreePoints}>
                  🎁 Resgatar Bônus Diário (+50 PTS)
                </Button>
                <Button variant="gold" size="md" onClick={() => handlePurchasePoints(100)}>
                  💳 Simular Compra (+100 PTS)
                </Button>
              </div>
            </Card>

            <div className="points-pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              <Card variant="paper">
                <Badge variant="teal">5 PTS / imagem</Badge>
                <h3 style={{ margin: "0.75rem 0 0.5rem" }}>📤 Upload + Auto-Tagging IA</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Analisa a imagem enviada via visão computacional do Gemini e gera metadados em português.</p>
              </Card>
              <Card variant="paper">
                <Badge variant="pink">15 PTS / carta</Badge>
                <h3 style={{ margin: "0.75rem 0 0.5rem" }}>🎨 Carta Visual com IA</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Criação completa de metadados + ilustração 4:3 gerada por IA a partir de um prompt.</p>
              </Card>
              <Card variant="paper">
                <Badge variant="sun">40 PTS / deck</Badge>
                <h3 style={{ margin: "0.75rem 0 0.5rem" }}>⚡ Baralho Completo IA</h3>
                <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Geração automatizada de um deck completo de até 9 cartas para todas as etapas do jogo.</p>
              </Card>
            </div>

            <Card variant="paper" className="points-history-box">
              <h3 style={{ fontFamily: "Palmer Lake Print", fontSize: "2rem", margin: "0 0 1rem" }}>Histórico de Pontos</h3>
              {pointsHistory.length === 0 ? (
                <p className="no-history" style={{ color: "var(--muted)" }}>Nenhuma transação de pontos registrada ainda.</p>
              ) : (
                <table className="points-history-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--line)", textAlign: "left" }}>
                      <th style={{ padding: "0.75rem" }}>Operação / Motivo</th>
                      <th style={{ padding: "0.75rem" }}>Pontos</th>
                      <th style={{ padding: "0.75rem" }}>Saldo Resultante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pointsHistory.map((tx) => (
                      <tr key={tx.id.toString()} style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                        <td style={{ padding: "0.75rem", fontWeight: 700 }}>{tx.reason}</td>
                        <td style={{ padding: "0.75rem", fontWeight: 900, color: tx.amount >= 0 ? "#16a34a" : "#dc2626" }}>
                          {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                        </td>
                        <td style={{ padding: "0.75rem", fontWeight: 800 }}>{tx.balanceAfter} PTS</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </section>
        )}
      </main>

      {/* Modal: Criar Novo Baralho */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="✨ Criar Novo Baralho"
      >
        <form onSubmit={handleCreateDeck}>
          <Input
            label="Nome do Baralho:"
            placeholder="Ex: Futurismo Orgânico"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            required
          />

          <Textarea
            label="Descrição:"
            placeholder="Ex: Cartas focadas em soluções inspiradas na natureza e biomimética."
            value={newDeckDesc}
            onChange={(e) => setNewDeckDesc(e.target.value)}
            rows={3}
          />

          <Select
            label="Visibilidade:"
            value={newDeckPublic ? "public" : "private"}
            onChange={(e) => setNewDeckPublic(e.target.value === "public")}
            options={[
              { value: "public", label: "🌐 Público (Qualquer jogador pode usar no jogo)" },
              { value: "private", label: "🔒 Privado (Apenas você pode ver e usar)" },
            ]}
          />

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Criar Baralho
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function DecksHubApp() {
  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <DecksHubContent />
    </SpacetimeDBProvider>
  );
}

export default function DecksHubRoute() {
  const [ClientComponent, setClientComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    setClientComponent(() => DecksHubApp);
  }, []);

  if (!ClientComponent) {
    return (
      <main aria-busy="true" style={{ padding: "2rem", color: "#292332", background: "#fff9ed", minHeight: "100vh" }}>
        Carregando Estúdio de Baralhos...
      </main>
    );
  }

  return <ClientComponent />;
}

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Identity } from "spacetimedb";
import { SpacetimeDBProvider, useSpacetimeDB, useTable } from "spacetimedb/react";
import { DbConnection, tables } from "../module_bindings";
import { Button, Input, Select, Textarea, Badge, Card, Modal } from "../components/ui";
import "../idea-hero.css";

const STAGES = [
  { key: "SCENARIO", title: "SCENARIO — Cenário & Mundo", usesCards: true, essential: true, desc: "Ideação de cenário (Exibe Carta no jogo)" },
  { key: "PROBLEM", title: "PROBLEM — Fricção & Problema", usesCards: true, essential: true, desc: "Identificação do problema (Exibe Carta no jogo)" },
  { key: "INSIGHT", title: "INSIGHT — Descoberta & Padrão", usesCards: true, essential: true, desc: "Gatilhos de insight (Exibe Carta no jogo)" },
  { key: "SOLUTION", title: "SOLUTION — Ideia & Solução", usesCards: true, essential: true, desc: "Criação de solução (Exibe Carta no jogo)" },
  { key: "POLISHING", title: "POLISHING — Lapidação", usesCards: true, essential: false, desc: "Refinamento da proposta (Exibe Carta no jogo)" },
  { key: "CONQUERING", title: "CONQUERING — Convite & Aliança", usesCards: true, essential: false, desc: "Estratégia de adesão (Exibe Carta no jogo)" },
  { key: "PROTOTYPE", title: "PROTOTYPE — Prototipagem", usesCards: false, essential: false, desc: "Sem cartas no jogo (Atividade usa Lousa de Desenho)" },
  { key: "TESTING", title: "TESTING — Teste & Provação", usesCards: false, essential: false, desc: "Sem cartas no jogo (Atividade usa Opções de Teste)" },
  { key: "FINAL", title: "FINAL — Transformação Final", usesCards: false, essential: false, desc: "Sem cartas no jogo (Atividade gera Relatório Final)" },
];

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

function DeckDetailContent() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { isActive, identity: myIdentity, token, getConnection } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null;

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
      ]);
  }, [conn, isActive]);

  const [decks] = useTable(tables.user_decks);
  const [deckCards] = useTable(tables.deck_cards);
  const [myPointsList] = useTable(tables.my_points);

  const currentPoints = myPointsList[0]?.balance ?? 100;

  const currentDeck = useMemo(() => {
    return decks.find((d) => d.id === deckId);
  }, [decks, deckId]);

  const cardsInDeck = useMemo(() => {
    return deckCards.filter((c) => c.deckId === deckId);
  }, [deckCards, deckId]);

  const isOwner = useMemo(() => {
    if (!currentDeck) return true;
    if (!myIdentity) return true;
    return currentDeck.ownerIdentity.toHexString() === myIdentity.toHexString() || currentDeck.isPublic;
  }, [currentDeck, myIdentity]);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState("SCENARIO");
  const [creationMode, setCreationMode] = useState<"upload" | "ai" | "manual">("upload");

  // Form Fields
  const [cardTitle, setCardTitle] = useState("");
  const [cardLens, setCardLens] = useState("");
  const [cardProvocation, setCardProvocation] = useState("");
  const [cardAltText, setCardAltText] = useState("");
  const [cardImagePath, setCardImagePath] = useState("");
  const [cardTags, setCardTags] = useState("");

  // Upload/AI state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>("");
  const [aiPromptHint, setAiPromptHint] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const resetForm = () => {
    setCardTitle("");
    setCardLens("");
    setCardProvocation("");
    setCardAltText("");
    setCardImagePath("");
    setCardTags("");
    setUploadFile(null);
    setUploadPreview("");
    setAiPromptHint("");
    setErrorMsg("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
    }
  };

  // Process Upload + AI Tagging
  const handleUploadAndTag = async () => {
    if (!uploadFile) {
      setErrorMsg("Selecione um arquivo de imagem para fazer o upload.");
      return;
    }
    if (currentPoints < 5) {
      setErrorMsg("Saldo insuficiente de pontos para Auto-Tagging de IA (necessário 5 PTS).");
      return;
    }

    setIsLoadingAi(true);
    setErrorMsg("");

    try {
      conn?.reducers.deductUserPoints({ amount: 5, reason: "AI_IMAGE_TAG" });

      const formData = new FormData();
      formData.append("image", uploadFile);
      formData.append("stage", selectedStage);
      formData.append("prompt", aiPromptHint);
      formData.append("deckId", deckId || "custom");

      const res = await fetch("/api/decks/ai-tag", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao processar imagem.");
      }

      const meta = data.metadata;
      conn?.reducers.addCardToDeck({
        id: crypto.randomUUID(),
        deckId: deckId!,
        stage: selectedStage,
        title: meta.title,
        lens: meta.lens,
        imagePath: data.imagePath,
        altText: meta.altText,
        provocation: meta.provocation,
        tags: JSON.stringify(meta.tags || []),
      });

      setIsLoadingAi(false);
      resetForm();
      setShowAddModal(false);
    } catch (err: any) {
      console.error("AI Tagging failed:", err);
      setErrorMsg(err.message || "Erro no processamento de IA.");
      setIsLoadingAi(false);
    }
  };

  // Process Full AI Generation
  const handleGenerateFullAi = async () => {
    if (!aiPromptHint.trim()) {
      setErrorMsg("Digite uma orientação ou tema para a IA gerar a carta.");
      return;
    }
    if (currentPoints < 15) {
      setErrorMsg("Saldo insuficiente de pontos para Geração Completa por IA (necessário 15 PTS).");
      return;
    }

    setIsLoadingAi(true);
    setErrorMsg("");

    try {
      conn?.reducers.deductUserPoints({ amount: 15, reason: "AI_FULL_CARD_GEN" });

      const formData = new FormData();
      formData.append("mode", "single");
      formData.append("topic", aiPromptHint);
      formData.append("stage", selectedStage);
      formData.append("deckId", deckId || "custom");

      const res = await fetch("/api/decks/ai-generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao gerar carta por IA.");
      }

      const c = data.card;
      conn?.reducers.addCardToDeck({
        id: crypto.randomUUID(),
        deckId: deckId!,
        stage: selectedStage,
        title: c.title,
        lens: c.lens,
        imagePath: c.imagePath,
        altText: c.altText,
        provocation: c.provocation,
        tags: JSON.stringify(c.tags || []),
      });

      setIsLoadingAi(false);
      resetForm();
      setShowAddModal(false);
    } catch (err: any) {
      console.error("AI Generation failed:", err);
      setErrorMsg(err.message || "Erro ao gerar com IA.");
      setIsLoadingAi(false);
    }
  };

  // Process Manual Add
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardTitle.trim()) return;

    let finalImagePath = cardImagePath.trim() || "/cards/idea-hero-logo.svg";

    if (uploadFile) {
      const reader = new FileReader();
      finalImagePath = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(uploadFile);
      });
    }

    conn?.reducers.addCardToDeck({
      id: crypto.randomUUID(),
      deckId: deckId!,
      stage: selectedStage,
      title: cardTitle.trim(),
      lens: cardLens.trim() || "Geral",
      imagePath: finalImagePath,
      altText: cardAltText.trim() || cardTitle,
      provocation: cardProvocation.trim() || "Como esta carta se aplica à ideia?",
      tags: JSON.stringify(cardTags.split(",").map((t) => t.trim()).filter(Boolean)),
    });

    resetForm();
    setShowAddModal(false);
  };

  const handleDeleteCard = (cardId: string) => {
    if (confirm("Remover esta carta do baralho?")) {
      conn?.reducers.deleteDeckCard({ cardId });
    }
  };

  if (!currentDeck) {
    return (
      <div className="decks-hub-page">
        <div className="empty-decks-state">
          <h2 style={{ fontFamily: "Palmer Lake Print", fontSize: "2.5rem" }}>Baralho não encontrado</h2>
          <Link to="/decks" style={{ textDecoration: "none" }}>
            <Button variant="primary" size="md">
              ← Voltar para Todos os Baralhos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="deck-detail-page">
      {/* Header */}
      <header className="decks-header">
        <div className="decks-header-brand">
          <Link to="/decks" className="back-home-button">
            ← Baralhos
          </Link>
          <h1>{currentDeck.name}</h1>
        </div>

        <div className="decks-points-badge">
          <span className="points-sparkle">💎</span>
          <span className="points-amount">{currentPoints} PTS</span>
        </div>
      </header>

      {/* Main Body */}
      <main className="deck-detail-container">
        {/* Banner Info */}
        <Card variant="paper" className="deck-info-banner">
          <img src={currentDeck.coverImagePath} alt={currentDeck.name} className="deck-banner-cover" />
          <div className="deck-banner-text">
            <h2>{currentDeck.name}</h2>
            <p>{currentDeck.description || "Sem descrição informada."}</p>
            <div className="deck-banner-stats">
              <Badge variant="teal">🎴 {cardsInDeck.length} Cartas</Badge>
              <Badge variant={currentDeck.isPublic ? "lime" : "neutral"}>
                {currentDeck.isPublic ? "🌐 Público" : "🔒 Privado"}
              </Badge>
            </div>
            <p style={{ marginTop: "0.75rem", fontSize: "0.825rem", color: "var(--muted)", fontStyle: "italic" }}>
              💡 <strong>Dica:</strong> Não é preciso ter cartas em todas as 9 etapas. Se uma etapa não tiver cartas no baralho, o jogo usará o catálogo padrão como fallback automático!
            </p>
          </div>
          {isOwner && (
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              ✨ Adicionar Carta
            </Button>
          )}
        </Card>

        {/* Cards grouped by Stage */}
        <div className="stages-cards-sections">
          {STAGES.map((stageObj) => {
            const stageCards = cardsInDeck.filter((c) => c.stage === stageObj.key);

            return (
              <div key={stageObj.key} className={`stage-cards-group ${!stageObj.usesCards ? "non-card-stage" : ""}`}>
                <div className="stage-group-header">
                  <h3>{stageObj.title}</h3>
                  {stageObj.usesCards ? (
                    <Badge variant={stageObj.essential ? "pink" : "teal"} size="sm">
                      {stageObj.essential ? "⭐ Carta no Jogo (Essencial)" : "🎴 Carta no Jogo"}
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      🚫 Sem Carta no Jogo
                    </Badge>
                  )}
                  {stageObj.usesCards && (
                    <span className="stage-card-count">{stageCards.length} cartas</span>
                  )}
                  {isOwner && stageObj.usesCards && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="add-stage-btn"
                      onClick={() => {
                        resetForm();
                        setSelectedStage(stageObj.key);
                        setShowAddModal(true);
                      }}
                    >
                      + Carta para {stageObj.key}
                    </Button>
                  )}
                </div>

                {!stageObj.usesCards ? (
                  <div className="stage-empty-placeholder" style={{ color: "var(--muted)", fontSize: "0.85rem", background: "rgba(0,0,0,0.03)", padding: "0.85rem 1rem", borderRadius: "12px", border: "1.5px dashed rgba(0,0,0,0.15)" }}>
                    🎨 <strong>Etapa Sem Cartas no Jogo:</strong> {stageObj.desc}. Não é necessário criar cartas para esta etapa.
                  </div>
                ) : stageCards.length === 0 ? (
                  <div className="stage-empty-placeholder" style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.85rem" }}>
                    Nenhuma carta cadastrada para esta etapa. O jogo usará o catálogo padrão como fallback automático.
                  </div>
                ) : (
                  <div className="cards-stage-grid">
                    {stageCards.map((card) => (
                      <div key={card.id} className="game-card-preview-item">
                        <div className="card-image-box">
                          <img src={card.imagePath} alt={card.altText || card.title} />
                          <span className="card-lens-pill">{card.lens}</span>
                        </div>
                        <div className="card-body-box">
                          <h4>{card.title}</h4>
                          <p className="card-provocation">"{card.provocation}"</p>
                        </div>
                        {isOwner && (
                          <button
                            type="button"
                            className="delete-card-icon-btn"
                            title="Remover carta"
                            onClick={() => handleDeleteCard(card.id)}
                          >
                            ❌
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Modal: Adicionar Nova Carta */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`✨ Adicionar Carta para ${selectedStage}`}
      >
        <div className="creation-mode-tabs">
          <button
            type="button"
            className={`mode-tab-btn ${creationMode === "upload" ? "active" : ""}`}
            onClick={() => setCreationMode("upload")}
          >
            📤 Upload + AI Tagging (5 PTS)
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${creationMode === "ai" ? "active" : ""}`}
            onClick={() => setCreationMode("ai")}
          >
            🎨 Carta por IA (15 PTS)
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${creationMode === "manual" ? "active" : ""}`}
            onClick={() => setCreationMode("manual")}
          >
            ✍️ Manual (0 PTS)
          </button>
        </div>

        {errorMsg && <div className="error-banner" style={{ background: "#fee2e2", color: "#b91c1c", padding: "0.75rem", borderRadius: "10px", border: "2px solid #b91c1c", marginBottom: "1rem" }}>{errorMsg}</div>}

        {/* Mode 1: Upload + AI Tagging */}
        {creationMode === "upload" && (
          <div className="studio-mode-box">
            <p className="mode-desc" style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
              Envie uma imagem do seu dispositivo. A visão computacional da IA do Gemini analisará a imagem para preencher título, provocação, lente e tags automaticamente.
            </p>
            <div className="ui-field">
              <label className="ui-field__label">Selecione a Imagem:</label>
              <input type="file" accept="image/*" onChange={handleFileChange} disabled={isLoadingAi} style={{ width: "100%", padding: "0.5rem" }} />
              {uploadPreview && (
                <div className="upload-preview-box" style={{ marginTop: "0.75rem" }}>
                  <img src={uploadPreview} alt="Preview" style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "12px", border: "2.5px solid var(--line)" }} />
                </div>
              )}
            </div>

            <Input
              label="Instruções / Dica adicional para a IA (Opcional):"
              placeholder="Ex: Foque no contraste entre tecnologia e natureza"
              value={aiPromptHint}
              onChange={(e) => setAiPromptHint(e.target.value)}
              disabled={isLoadingAi}
            />

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                isLoading={isLoadingAi}
                disabled={isLoadingAi || !uploadFile}
                onClick={handleUploadAndTag}
              >
                📤 Processar & Adicionar (5 PTS)
              </Button>
            </div>
          </div>
        )}

        {/* Mode 2: Full AI Card Gen */}
        {creationMode === "ai" && (
          <div className="studio-mode-box">
            <p className="mode-desc" style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
              Descreva um conceito visual ou metáfora. A IA vai escrever o título, provocação e gerar uma ilustração original em formato 4:3!
            </p>
            <Textarea
              label="Tema ou Instrução Visual para a Carta:"
              placeholder="Ex: Um relógio de sol flutuante em cima de uma floresta de cristal brilhante ao entardecer."
              value={aiPromptHint}
              onChange={(e) => setAiPromptHint(e.target.value)}
              rows={3}
              disabled={isLoadingAi}
            />

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                isLoading={isLoadingAi}
                disabled={isLoadingAi || !aiPromptHint.trim()}
                onClick={handleGenerateFullAi}
              >
                🎨 Gerar Carta com IA (15 PTS)
              </Button>
            </div>
          </div>
        )}

            {/* Mode 3: Manual Card */}
            {creationMode === "manual" && (
              <form onSubmit={handleManualAdd} className="studio-mode-box">
                <Input
                  label="Título da Carta:"
                  placeholder="Ex: O Relógio de Sol"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  required
                />

                <div className="ui-field">
                  <label className="ui-field__label">Upload de Imagem (ou selecione arquivo):</label>
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ width: "100%", padding: "0.5rem" }} />
                  {uploadPreview && (
                    <div className="upload-preview-box" style={{ marginTop: "0.5rem" }}>
                      <img src={uploadPreview} alt="Preview" style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "10px", border: "2px solid var(--line)" }} />
                    </div>
                  )}
                </div>

                <Input
                  label="Ou URL / Caminho da Imagem:"
                  placeholder="/cards/00a3fd49-a67d-4438-92e8-2dc61ef93b98.webp"
                  value={cardImagePath}
                  onChange={(e) => setCardImagePath(e.target.value)}
                />

                <Input
                  label="Lente / Ângulo:"
                  placeholder="Ex: Tempo & Ciclos"
                  value={cardLens}
                  onChange={(e) => setCardLens(e.target.value)}
                />

                <Textarea
                  label="Pergunta Provocativa:"
                  placeholder="Ex: O que se torna visível quando paramos de medir o tempo em minutos?"
                  value={cardProvocation}
                  onChange={(e) => setCardProvocation(e.target.value)}
                  rows={2}
                />

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                  <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary">
                    Adicionar Carta Manual
                  </Button>
                </div>
              </form>
            )}
      </Modal>
    </div>
  );
}

function DeckDetailApp() {
  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <DeckDetailContent />
    </SpacetimeDBProvider>
  );
}

export default function DeckDetailRoute() {
  const [ClientComponent, setClientComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    setClientComponent(() => DeckDetailApp);
  }, []);

  if (!ClientComponent) {
    return (
      <main aria-busy="true" style={{ padding: "2rem", color: "#292332", background: "#fff9ed", minHeight: "100vh" }}>
        Carregando Detalhes do Baralho...
      </main>
    );
  }

  return <ClientComponent />;
}

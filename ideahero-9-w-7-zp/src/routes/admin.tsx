import { useEffect, useState, useTransition } from "react";
import type { CardItem } from "./api.admin.cards";
import "../admin.css";

const CARD_STAGES_SET = new Set(["SCENARIO", "PROBLEM", "INSIGHT", "SOLUTION"]);

const STAGES = [
  { id: "ALL", label: "Todas as Etapas", badgeClass: "badge-all" },
  { id: "CARDS_ONLY", label: "🃏 Etapas com Cartas", color: "#a78bfa" },
  { id: "SCENARIO", label: "Cenário", color: "#6f58c9" },
  { id: "PROBLEM", label: "Problema", color: "#e85671" },
  { id: "INSIGHT", label: "Insight", color: "#218c95" },
  { id: "SOLUTION", label: "Solução", color: "#e39a22" },
  { id: "PROTOTYPE", label: "Protótipo", color: "#438454" },
  { id: "PILOT", label: "Piloto", color: "#a94791" },
  { id: "MARKETING", label: "Marketing", color: "#3b82f6" },
  { id: "SALES", label: "Vendas", color: "#10b981" },
];

export default function AdminPage() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [selectedStage, setSelectedStage] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Modals state
  const [editingCard, setEditingCard] = useState<CardItem | null>(null);
  const [uploadingCard, setUploadingCard] = useState<CardItem | null>(null);
  const [aiGeneratingCard, setAiGeneratingCard] = useState<CardItem | null>(
    null,
  );
  const [isCreatingCard, setIsCreatingCard] = useState(false);

  // Form states for editing metadata with AI assistant
  const [editTitle, setEditTitle] = useState("");
  const [editLens, setEditLens] = useState("");
  const [editProvocation, setEditProvocation] = useState("");
  const [editAltText, setEditAltText] = useState("");
  const [editImagePath, setEditImagePath] = useState("");
  const [aiMetadataLoading, setAiMetadataLoading] = useState(false);

  // Upload file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // AI Generation state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiImageKey, setAiImageKey] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  const fetchCards = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/cards");
      if (res.ok) {
        const data = await res.json();
        setCards(data.cards || []);
      }
    } catch (err) {
      console.error("Failed to load cards:", err);
      setMessage({
        type: "error",
        text: "Não foi possível carregar as cartas.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCards();
  }, []);

  const showNotification = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const openEditModal = (card: CardItem) => {
    setEditingCard(card);
    setEditTitle(card.title);
    setEditLens(card.lens);
    setEditProvocation(card.provocation);
    setEditAltText(card.altText);
    setEditImagePath(card.imagePath);
  };

  const handleUpdateMetadata = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCard) return;

    const formData = new FormData();
    formData.append("action", "update_metadata");
    formData.append("id", editingCard.id);
    formData.append("title", editTitle);
    formData.append("lens", editLens);
    formData.append("provocation", editProvocation);
    formData.append("altText", editAltText);
    formData.append("imagePath", editImagePath);

    try {
      const res = await fetch("/api/admin/cards", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showNotification(
          "success",
          `Carta "${editTitle}" atualizada com sucesso!`,
        );
        setEditingCard(null);
        void fetchCards();
      } else {
        showNotification("error", data.error || "Erro ao salvar alterações.");
      }
    } catch (err) {
      console.error(err);
      showNotification("error", "Falha de rede ao atualizar carta.");
    }
  };

  const handleGenerateAiMetadata = async () => {
    if (!editingCard) return;
    setAiMetadataLoading(true);

    const formData = new FormData();
    formData.append("action", "generate_ai_metadata");
    formData.append("stage", editingCard.stage);
    formData.append("title", editTitle);
    formData.append("provocation", editProvocation);

    try {
      const res = await fetch("/api/admin/cards", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success && data.suggestion) {
        const { title, lens, provocation, altText } = data.suggestion;
        if (title) setEditTitle(title);
        if (lens) setEditLens(lens);
        if (provocation) setEditProvocation(provocation);
        if (altText) setEditAltText(altText);
        showNotification(
          "success",
          "Sugestão de metadados gerada pela IA aplicada ao formulário!",
        );
      } else {
        showNotification(
          "error",
          data.error || "Não foi possível obter sugestão da IA.",
        );
      }
    } catch (err) {
      console.error(err);
      showNotification("error", "Erro ao conectar com o serviço de IA.");
    } finally {
      setAiMetadataLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPicture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingCard || !selectedFile) return;

    const formData = new FormData();
    formData.append("action", "upload_picture");
    formData.append("id", uploadingCard.id);
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/admin/cards", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showNotification(
          "success",
          `Imagem da carta "${uploadingCard.title}" atualizada!`,
        );
        setUploadingCard(null);
        setSelectedFile(null);
        setFilePreview(null);
        void fetchCards();
      } else {
        showNotification("error", data.error || "Erro ao enviar imagem.");
      }
    } catch (err) {
      console.error(err);
      showNotification("error", "Erro ao fazer upload da imagem.");
    }
  };

  const handleGenerateAiImage = async () => {
    if (!aiGeneratingCard || !aiPrompt.trim()) return;
    setAiLoading(true);

    try {
      const formData = new FormData();
      formData.append("operation", "generate");
      formData.append("roomId", "9999");
      formData.append("prompt", aiPrompt);
      formData.append("title", aiGeneratingCard.title);

      const res = await fetch("/api/image-studio", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.key) {
        const imageUrl = `/api/storage?key=${encodeURIComponent(data.key)}`;
        setAiImagePreview(imageUrl);
        setAiImageKey(imageUrl);
        showNotification("success", "Imagem gerada com sucesso pela IA!");
      } else {
        showNotification("error", data.error || "Erro na geração com IA.");
      }
    } catch (err) {
      console.error(err);
      showNotification("error", "Falha de conexão com a IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiImage = async () => {
    if (!aiGeneratingCard || !aiImageKey) return;

    const formData = new FormData();
    formData.append("action", "update_metadata");
    formData.append("id", aiGeneratingCard.id);
    formData.append("imagePath", aiImageKey);

    try {
      const res = await fetch("/api/admin/cards", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showNotification(
          "success",
          "Imagem da IA aplicada à carta com sucesso!",
        );
        setAiGeneratingCard(null);
        setAiImagePreview(null);
        setAiImageKey(null);
        void fetchCards();
      } else {
        showNotification(
          "error",
          data.error || "Erro ao salvar imagem gerada.",
        );
      }
    } catch (err) {
      console.error(err);
      showNotification("error", "Erro ao aplicar imagem.");
    }
  };

  const handleCreateCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append("action", "create_card");

    try {
      const res = await fetch("/api/admin/cards", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showNotification("success", `Nova carta "${data.card.title}" criada!`);
        setIsCreatingCard(false);
        void fetchCards();
      } else {
        showNotification("error", data.error || "Erro ao criar carta.");
      }
    } catch (err) {
      console.error(err);
      showNotification("error", "Falha ao criar carta.");
    }
  };

  const handleDeleteCard = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja remover a carta "${title}"?`)) return;

    const formData = new FormData();
    formData.append("action", "delete_card");
    formData.append("id", id);

    try {
      const res = await fetch("/api/admin/cards", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showNotification("success", `Carta "${title}" removida.`);
        void fetchCards();
      } else {
        showNotification("error", data.error || "Erro ao remover.");
      }
    } catch (err) {
      console.error(err);
      showNotification("error", "Erro ao excluir carta.");
    }
  };

  const filteredCards = cards.filter((card) => {
    let matchesStage = false;
    if (selectedStage === "ALL") {
      matchesStage = true;
    } else if (selectedStage === "CARDS_ONLY") {
      matchesStage = CARD_STAGES_SET.has(card.stage);
    } else {
      matchesStage = card.stage === selectedStage;
    }

    const matchesSearch =
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.lens.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.provocation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSearch;
  });

  return (
    <div className="admin-container">
      {/* Top Header */}
      <header className="admin-header">
        <div className="admin-header-brand">
          <a href="/" className="admin-back-btn" title="Voltar ao Jogo">
            ← Voltar
          </a>
          <div>
            <h1 className="admin-title">Painel de Gerenciamento de Cartas</h1>
            <p className="admin-subtitle">
              Gestão de imagens, metadados com assistência por IA e catálogo do
              Idea Hero
            </p>
          </div>
        </div>

        <button
          type="button"
          className="admin-btn primary"
          onClick={() => setIsCreatingCard(true)}
        >
          + Nova Carta
        </button>
      </header>

      {/* Toast Notification */}
      {message && (
        <div className={`admin-toast ${message.type}`}>{message.text}</div>
      )}

      {/* Stats Bar */}
      <div className="admin-stats-bar">
        <div className="stat-chip">
          <span className="stat-icon">🎴</span>
          <div>
            <span className="stat-label">Total de Cartas</span>
            <div className="stat-value">{cards.length}</div>
          </div>
        </div>
        <div className="stat-chip">
          <span className="stat-icon">🃏</span>
          <div>
            <span className="stat-label">Cartas de Jogo</span>
            <div className="stat-value">
              {cards.filter((c) => CARD_STAGES_SET.has(c.stage)).length}
            </div>
          </div>
        </div>
        <div className="stat-chip">
          <span className="stat-icon">📊</span>
          <div>
            <span className="stat-label">Executivos</span>
            <div className="stat-value">
              {cards.filter((c) => !CARD_STAGES_SET.has(c.stage)).length}
            </div>
          </div>
        </div>
        <div className="stat-chip">
          <span className="stat-icon">✨</span>
          <div>
            <span className="stat-label">Personalizadas</span>
            <div className="stat-value">
              {cards.filter((c) => c.custom).length}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <section className="admin-toolbar">
        <div className="admin-search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="admin-input search-input"
            placeholder="Buscar por título, lente ou provocação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="admin-stage-tabs">
          {STAGES.map((st) => {
            let count = 0;
            if (st.id === "ALL") {
              count = cards.length;
            } else if (st.id === "CARDS_ONLY") {
              count = cards.filter((c) => CARD_STAGES_SET.has(c.stage)).length;
            } else {
              count = cards.filter((c) => c.stage === st.id).length;
            }

            return (
              <button
                key={st.id}
                type="button"
                className={`stage-tab ${selectedStage === st.id ? "active" : ""}`}
                onClick={() => startTransition(() => setSelectedStage(st.id))}
                style={{
                  borderColor:
                    selectedStage === st.id
                      ? st.color || "#e85671"
                      : "transparent",
                }}
              >
                {st.label}
                <span className="stage-count">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Grid View */}
      {loading ? (
        <div className="admin-loading">Carregando catálogo de cartas...</div>
      ) : filteredCards.length === 0 ? (
        <div className="admin-empty">
          Nenhuma carta encontrada para os filtros aplicados.
        </div>
      ) : (
        <div className="admin-cards-grid">
          {filteredCards.map((card) => {
            const stageConfig = STAGES.find((s) => s.id === card.stage);
            const isCardStage = CARD_STAGES_SET.has(card.stage);

            return (
              <div key={card.id} className="admin-card-tile">
                <div className="card-tile-header">
                  <span
                    className="card-stage-badge"
                    style={{ backgroundColor: stageConfig?.color || "#6b7280" }}
                  >
                    {stageConfig?.label || card.stage}
                  </span>
                  <span
                    className={`card-stage-type-tag ${isCardStage ? "is-game-card" : "is-executive"}`}
                    title={
                      isCardStage
                        ? "Utiliza cartas de inspiração durante o jogo"
                        : "Estágio de simulação e execução"
                    }
                  >
                    {isCardStage ? "🃏 Carta" : "📊 Executivo"}
                  </span>
                  <span className="card-lens-badge">{card.lens}</span>
                </div>

                <div className="card-tile-image-container">
                  <img
                    src={card.imagePath}
                    alt={card.altText || card.title}
                    className="card-tile-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/cards/idea-hero-logo.svg";
                    }}
                  />
                  <div className="card-tile-image-overlay">
                    <button
                      type="button"
                      className="overlay-btn"
                      onClick={() => {
                        setUploadingCard(card);
                        setSelectedFile(null);
                        setFilePreview(null);
                      }}
                    >
                      📷 Alterar Foto
                    </button>
                    <button
                      type="button"
                      className="overlay-btn ai-btn"
                      onClick={() => {
                        setAiGeneratingCard(card);
                        setAiPrompt(
                          `Imagem para carta "${card.title}": ${card.provocation}`,
                        );
                        setAiImagePreview(null);
                        setAiImageKey(null);
                      }}
                    >
                      ✨ Criar Imagem IA
                    </button>
                  </div>
                </div>

                <div className="card-tile-content">
                  <h3 className="card-tile-title">{card.title}</h3>
                  <p className="card-tile-provocation">"{card.provocation}"</p>
                  <div className="card-tile-path" title={card.imagePath}>
                    📁 {card.imagePath}
                  </div>
                </div>

                <div className="card-tile-footer">
                  <button
                    type="button"
                    className="tile-action-btn"
                    onClick={() => openEditModal(card)}
                  >
                    ✏️ Editar Metadados
                  </button>
                  <button
                    type="button"
                    className="tile-action-btn danger"
                    onClick={() => handleDeleteCard(card.id, card.title)}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Edit Metadata (with AI Assistance) */}
      {editingCard && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setEditingCard(null)}
        >
          <div
            className="admin-modal large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-with-ai">
              <div>
                <h2>Editar Metadados — {editingCard.title}</h2>
                <p className="modal-subtitle">
                  Ajuste título, lente, provocação e altText ou solicite
                  sugestões inteligentes da IA.
                </p>
              </div>
              <button
                type="button"
                className="admin-btn ai-btn"
                onClick={handleGenerateAiMetadata}
                disabled={aiMetadataLoading}
              >
                {aiMetadataLoading
                  ? "✨ Gerando com IA..."
                  : "✨ Sugerir com IA"}
              </button>
            </div>

            <form onSubmit={handleUpdateMetadata} className="admin-form">
              <div className="form-group">
                <label htmlFor="title">Título da Carta</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="admin-input"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="stage">Etapa</label>
                  <input
                    id="stage"
                    name="stage"
                    type="text"
                    defaultValue={editingCard.stage}
                    className="admin-input"
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lens">Lente de Provocação</label>
                  <input
                    id="lens"
                    name="lens"
                    type="text"
                    value={editLens}
                    onChange={(e) => setEditLens(e.target.value)}
                    className="admin-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="provocation">Pergunta / Provocação</label>
                <textarea
                  id="provocation"
                  name="provocation"
                  rows={3}
                  value={editProvocation}
                  onChange={(e) => setEditProvocation(e.target.value)}
                  className="admin-textarea"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="altText">
                  Texto Alternativo (Acessibilidade)
                </label>
                <input
                  id="altText"
                  name="altText"
                  type="text"
                  value={editAltText}
                  onChange={(e) => setEditAltText(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="imagePath">Caminho da Imagem</label>
                <input
                  id="imagePath"
                  name="imagePath"
                  type="text"
                  value={editImagePath}
                  onChange={(e) => setEditImagePath(e.target.value)}
                  className="admin-input"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => setEditingCard(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="admin-btn primary">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Picture */}
      {uploadingCard && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setUploadingCard(null)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Gerenciar Imagem — {uploadingCard.title}</h2>
            <p className="modal-subtitle">
              Envie um arquivo de imagem (WEBP, PNG, JPG) para substituir a
              imagem atual desta carta.
            </p>

            <form onSubmit={handleUploadPicture} className="admin-form">
              <div className="image-comparison">
                <div className="preview-box">
                  <span>Atual:</span>
                  <img src={uploadingCard.imagePath} alt="Imagem Atual" />
                </div>
                {filePreview && (
                  <div className="preview-box new">
                    <span>Nova Seleção:</span>
                    <img src={filePreview} alt="Nova Seleção" />
                  </div>
                )}
              </div>

              <div className="file-dropzone">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  onChange={handleFileChange}
                  id="card-file-input"
                  className="file-input-hidden"
                />
                <label htmlFor="card-file-input" className="file-label">
                  📁{" "}
                  {selectedFile
                    ? selectedFile.name
                    : "Clique para selecionar uma imagem do computador"}
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => setUploadingCard(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="admin-btn primary"
                  disabled={!selectedFile}
                >
                  Confirmar Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI Studio Generator */}
      {aiGeneratingCard && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setAiGeneratingCard(null)}
        >
          <div
            className="admin-modal large"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>
              Estúdio de IA — Criar Imagem para "{aiGeneratingCard.title}"
            </h2>
            <p className="modal-subtitle">
              Gere uma imagem 4:3 conceitual sem texto utilizando o Google
              Gemini AI Studio.
            </p>

            <div className="admin-form">
              <div className="form-group">
                <label htmlFor="ai-prompt-input">Prompt Visual para IA</label>
                <textarea
                  id="ai-prompt-input"
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="admin-textarea"
                  placeholder="Descreva o estilo, iluminação, cores e composição desejados..."
                />
              </div>

              <div className="ai-preview-area">
                {aiLoading ? (
                  <div className="ai-loading-box">
                    <span className="spinner">✨</span>
                    <p>Gerando imagem com IA... Aguarde alguns instantes.</p>
                  </div>
                ) : aiImagePreview ? (
                  <div className="ai-result-box">
                    <p>Imagem Gerada:</p>
                    <img src={aiImagePreview} alt="Resultado IA" />
                  </div>
                ) : (
                  <div className="ai-placeholder">
                    Clique em "Gerar Imagem com IA" para visualizar a proposta.
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => setAiGeneratingCard(null)}
                >
                  Fechar
                </button>
                <button
                  type="button"
                  className="admin-btn ai-btn"
                  onClick={handleGenerateAiImage}
                  disabled={aiLoading || !aiPrompt.trim()}
                >
                  {aiLoading ? "Gerando..." : "✨ Gerar Imagem com IA"}
                </button>
                {aiImageKey && (
                  <button
                    type="button"
                    className="admin-btn primary"
                    onClick={handleApplyAiImage}
                  >
                    Aplicar na Carta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Card */}
      {isCreatingCard && (
        <div
          className="admin-modal-backdrop"
          onClick={() => setIsCreatingCard(false)}
        >
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Criar Nova Carta</h2>
            <form onSubmit={handleCreateCard} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="create-stage">Etapa do Jogo</label>
                  <select
                    id="create-stage"
                    name="stage"
                    className="admin-select"
                    required
                  >
                    {STAGES.filter(
                      (s) => s.id !== "ALL" && s.id !== "CARDS_ONLY",
                    ).map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="create-lens">Lente</label>
                  <input
                    id="create-lens"
                    name="lens"
                    type="text"
                    placeholder="Ex: Mundo, Tensão, Perspectiva"
                    className="admin-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="create-title">Título da Carta</label>
                <input
                  id="create-title"
                  name="title"
                  type="text"
                  placeholder="Ex: Nova Fronteira"
                  className="admin-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-provocation">Pergunta Provocativa</label>
                <textarea
                  id="create-provocation"
                  name="provocation"
                  rows={3}
                  placeholder="Ex: Que oportunidade surge quando o padrão é quebrado?"
                  className="admin-textarea"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-altText">Texto Alternativo</label>
                <input
                  id="create-altText"
                  name="altText"
                  type="text"
                  placeholder="Descrição da imagem para leitores de tela..."
                  className="admin-input"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="admin-btn secondary"
                  onClick={() => setIsCreatingCard(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="admin-btn primary">
                  Criar Carta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

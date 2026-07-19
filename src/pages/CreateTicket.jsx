import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTicket } from "../api/api";
import Icon from "../components/Icon";
import ImageLightbox from "../components/ImageLightbox";
import Topbar from "../components/Topbar";
import {
  MAX_TICKET_IMAGES,
  MAX_TICKET_IMAGES_TOTAL_LENGTH,
  fileToTicketImageDataUrl,
} from "../utils/imageUpload";
import {
  validateAssetTag,
  validateLongText,
  validateShortText,
} from "../utils/validation";

const SECTORS = [
  "Recepção",
  "UTI",
  "Enfermaria",
  "Laboratório",
  "Farmácia",
  "Centro Cirúrgico",
  "Pronto Atendimento",
  "Radiologia",
  "Ambulatório",
  "Almoxarifado",
  "Administrativo",
  "TI",
];

const CATEGORIES = [
  "Infraestrutura",
  "Rede",
  "Hardware",
  "Software hospitalar",
  "Impressão",
  "Acesso",
  "Telefonia",
  "Internet",
  "Segurança",
  "Periféricos",
  "Sistema de gestão hospitalar",
  "Leitor ou coletor",
];

const EQUIPMENTS = [
  "Computador",
  "Notebook",
  "Impressora",
  "Impressora Zebra",
  "Leitor de código de barras",
  "Coletor de dados",
  "Wi-Fi",
  "Switch",
  "Sistema hospitalar",
  "Telefone",
];

const TICKET_LIMITS = {
  title: 100,
  description: 1000,
  category: 40,
  sector: 30,
  equipment: 30,
  assetTag: 40,
};

function counterClass(value, limit) {
  return value.length >= limit * 0.9 ? "field-counter is-warning" : "field-counter";
}

export default function CreateTicket() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Infraestrutura");
  const [priority, setPriority] = useState("medium");
  const [sector, setSector] = useState("Recepção");
  const [equipment, setEquipment] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [operationalImpact, setOperationalImpact] = useState("medium");
  const [issueImages, setIssueImages] = useState([]);
  const [imageError, setImageError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    setSubmitting(true);
    try {
      const cleanedTitle = validateShortText(title, "Título", {
        required: true,
        maxLength: TICKET_LIMITS.title,
      });
      const cleanedDescription = validateLongText(description, "Descrição", {
        required: true,
        maxLength: TICKET_LIMITS.description,
      });
      const cleanedCategory = validateShortText(category, "Categoria", {
        required: true,
        maxLength: TICKET_LIMITS.category,
      });
      const cleanedSector = validateShortText(sector, "Setor", {
        required: true,
        maxLength: TICKET_LIMITS.sector,
      });

      const ticket = await createTicket({
        title: cleanedTitle,
        description: cleanedDescription,
        category: cleanedCategory,
        priority,
        sector: cleanedSector,
        equipment: validateShortText(equipment, "Equipamento", {
          maxLength: TICKET_LIMITS.equipment,
        }),
        assetTag: validateAssetTag(assetTag, { maxLength: TICKET_LIMITS.assetTag }),
        operationalImpact,
        issueImages: issueImages.map((image) => image.src),
      });
      navigate(`/tickets/${ticket.id}`, {
        state: {
          notice: `Chamado criado com sucesso. O prazo foi calculado automaticamente em ${ticket.sla_hours || 24}h pela prioridade e impacto informados.`,
        },
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  async function handleIssueImageChange(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    setImageError("");
    try {
      const remainingSlots = MAX_TICKET_IMAGES - issueImages.length;
      if (remainingSlots <= 0 || files.length > remainingSlots) {
        throw new Error(`Anexe no máximo ${MAX_TICKET_IMAGES} imagens por chamado.`);
      }

      const newImages = [];
      for (const [index, file] of files.entries()) {
        const dataUrl = await fileToTicketImageDataUrl(file);
        newImages.push({
          id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`,
          name: file.name,
          src: dataUrl,
        });
      }

      const totalSize = [...issueImages, ...newImages].reduce(
        (total, image) => total + image.src.length,
        0
      );
      if (totalSize > MAX_TICKET_IMAGES_TOTAL_LENGTH) {
        throw new Error("As imagens juntas ficaram grandes demais. Remova uma delas ou use fotos mais leves.");
      }

      setIssueImages((current) => [...current, ...newImages]);
    } catch (err) {
      setImageError(err.message);
    }
  }

  function removeIssueImage(imageId) {
    setIssueImages((current) => current.filter((image) => image.id !== imageId));
    setImageError("");
  }

  return (
    <>
      <Topbar title="Novo chamado" subtitle="Suporte de TI para ambiente de saúde" />
      <main className="main ticket-create-page">
        <div className="page-title">
          <div>
            <h2>
              <Icon name="ticket" />
              Abrir chamado técnico
            </h2>
            <p>Registre falhas de infraestrutura sem incluir dados de pacientes.</p>
          </div>
        </div>

        <form className="form-card health-form-card" onSubmit={handleSubmit}>
          <label>Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Impressora da UTI não imprime prescrições"
            maxLength={TICKET_LIMITS.title}
            required
          />

          <div className="form-grid">
            <div>
              <label>Setor</label>
              <input
                list="sector-options"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Ex: Recepção, UTI, Radiologia"
                maxLength={TICKET_LIMITS.sector}
                required
              />
              <datalist id="sector-options">
                {SECTORS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <p className="field-hint">Escolha uma sugestão ou digite outro setor.</p>
            </div>

            <div>
              <label>Categoria</label>
              <input
                list="category-options"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Rede, Hardware, Sistema hospitalar"
                maxLength={TICKET_LIMITS.category}
                required
              />
              <datalist id="category-options">
                {CATEGORIES.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              <p className="field-hint">Use uma categoria pronta ou cadastre uma nova digitando.</p>
            </div>

            <div>
              <label>Equipamento ou sistema</label>
              <input
                list="equipment-options"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="Ex: Impressora Zebra, Wi-Fi, ERP hospitalar"
                maxLength={TICKET_LIMITS.equipment}
              />
              <datalist id="equipment-options">
                {EQUIPMENTS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div>
            <label>Código do patrimônio</label>
            <input
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              placeholder="Ex: PAT-UTI-0042"
              maxLength={TICKET_LIMITS.assetTag}
            />
              <p className="field-hint">Opcional. Use apenas letras, números, ponto, hífen, barra ou sublinhado.</p>
            </div>

            <div>
              <label>Impacto no atendimento</label>
              <select
                value={operationalImpact}
                onChange={(e) => setOperationalImpact(e.target.value)}
              >
                <option value="low">Baixo</option>
                <option value="medium">Médio</option>
                <option value="high">Alto</option>
                <option value="critical">Crítico</option>
              </select>
            </div>

            <div>
              <label>Prioridade técnica</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
          </div>

          <label>Descrição</label>
          <textarea
            className="ticket-description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o problema, desde quando ocorre, setor afetado e impacto operacional. Não informe dados de pacientes."
            rows="6"
            maxLength={TICKET_LIMITS.description}
            required
          />
          <p className={counterClass(description, TICKET_LIMITS.description)}>
            {description.length}/{TICKET_LIMITS.description}
          </p>

          <div className="ticket-photo-field">
            <div>
              <label htmlFor="ticket-photo">Fotos do problema</label>
              <p>Opcional. Anexe até {MAX_TICKET_IMAGES} imagens para tela azul, erro na impressora, cabo solto ou outro sinal visual.</p>
            </div>
            <input
              id="ticket-photo"
              className="avatar-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handleIssueImageChange}
            />
            <div className="ticket-photo-actions">
              <label className="avatar-upload-button" htmlFor="ticket-photo">
                <Icon name="camera" />
                Anexar imagens
              </label>
              <span className="ticket-photo-count">
                {issueImages.length}/{MAX_TICKET_IMAGES} anexadas
              </span>
            </div>
            {imageError && <p className="error compact-feedback">{imageError}</p>}
            {issueImages.length > 0 && (
              <div className="ticket-photo-preview-grid">
                {issueImages.map((image, index) => (
                  <figure className="ticket-photo-preview" key={image.id}>
                    <button
                      type="button"
                      className="image-thumb-button"
                      onClick={() => setPreviewIndex(index)}
                      aria-label={`Ampliar pré-visualização ${index + 1}`}
                    >
                      <img src={image.src} alt={`Pré-visualização do problema ${index + 1}`} />
                      <span>Ampliar</span>
                    </button>
                    <figcaption>
                      <span>{image.name || `Imagem ${index + 1}`}</span>
                      <button type="button" className="ghost small" onClick={() => removeIssueImage(image.id)}>
                        <Icon name="trash" />
                        Remover
                      </button>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={submitting}>
            <Icon name="send" />
            {submitting ? "Criando..." : "Criar chamado"}
          </button>
        </form>
      </main>

      {previewIndex !== null && (
        <ImageLightbox
          images={issueImages}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </>
  );
}

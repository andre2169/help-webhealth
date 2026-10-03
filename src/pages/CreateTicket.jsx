import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTicket } from "../api/api";
import Icon from "../components/Icon";
import ImageLightbox from "../components/ImageLightbox";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";
import { detectSensitiveData } from "../utils/sensitiveData";
import useTicketCatalog from "../hooks/useTicketCatalog";
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

function SuggestionOptions({ field, options, value, onSelect, activeField, setActiveField }) {
  if (activeField !== field) return null;

  const normalizedValue = value.trim().toLocaleLowerCase();
  const filteredOptions = options
    .filter((option) => !normalizedValue || option.toLocaleLowerCase().includes(normalizedValue))
    .slice(0, 8);

  if (filteredOptions.length === 0) return null;

  return (
    <div className="field-suggestions" role="listbox" aria-label="Sugestões">
      {filteredOptions.map((option) => (
        <button
          type="button"
          className="field-suggestion"
          key={option}
          role="option"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onSelect(option);
            setActiveField(null);
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function CreateTicket() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const catalog = useTicketCatalog();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [sector, setSector] = useState("");
  const [equipment, setEquipment] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [operationalImpact, setOperationalImpact] = useState("medium");
  const [issueImages, setIssueImages] = useState([]);
  const [imageError, setImageError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sensitiveWarnings, setSensitiveWarnings] = useState([]);
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const formRef = useRef(null);
  const submitLock = useRef(false);
  const [previewIndex, setPreviewIndex] = useState(null);
  const [activeSuggestionField, setActiveSuggestionField] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (user && !user.email_verified) {
      setError("Confirme seu email no perfil antes de abrir chamados.");
      return;
    }

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
      if (!catalog.categories.includes(cleanedCategory) || !catalog.sectors.includes(cleanedSector)) {
        throw new Error("Selecione um setor e uma categoria da lista oficial.");
      }

      const warnings = detectSensitiveData(`${cleanedTitle}\n${cleanedDescription}`);
      setSensitiveWarnings(warnings);
      if (warnings.length > 0 && !warningAcknowledged) return;

      if (submitLock.current) return;
      submitLock.current = true;
      setSubmitting(true);

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
    } finally {
      if (submitLock.current) {
        submitLock.current = false;
        setSubmitting(false);
      }
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
        throw new Error("As imagens juntas ficaram grandes demais. Remova uma delas ou anexe fotos mais leves.");
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

        {user && !user.email_verified && (
          <section className="panel email-verification-panel ticket-verification-gate">
            <div>
              <h3>
                <Icon name="shield" />
                Confirme seu email
              </h3>
              <p className="muted-note">
                Por segurança, sua conta precisa confirmar o email antes de registrar chamados.
              </p>
            </div>
            <button type="button" className="secondary" onClick={() => navigate("/perfil")}>
              <Icon name="mail" />
              Ir para confirmação
            </button>
          </section>
        )}

        <form ref={formRef} className="form-card health-form-card" onSubmit={handleSubmit} aria-disabled={user && !user.email_verified}>
          {catalog.error && (
            <div className="catalog-feedback" role="alert">
              <p className="error">Não foi possível carregar setores e categorias. {catalog.error}</p>
              <button type="button" className="secondary small" onClick={catalog.reload}><Icon name="refresh" /> Tentar novamente</button>
            </div>
          )}
          <label>Título</label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setWarningAcknowledged(false);
            }}
            placeholder="Ex: Impressora da UTI não imprime prescrições"
            maxLength={TICKET_LIMITS.title}
            required
          />

          <div className="form-grid">
            <div>
              <label htmlFor="ticket-sector">Setor</label>
              <div className="field-control">
                <select
                  id="ticket-sector"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  disabled={catalog.loading || !!catalog.error}
                  required
                >
                  <option value="">{catalog.loading ? "Carregando setores..." : "Selecione o setor"}</option>
                  {catalog.sectors.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="ticket-category">Categoria</label>
              <div className="field-control">
                <select
                  id="ticket-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={catalog.loading || !!catalog.error}
                  required
                >
                  <option value="">{catalog.loading ? "Carregando categorias..." : "Selecione a categoria"}</option>
                  {catalog.categories.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label>Equipamento ou sistema</label>
              <div className="field-control">
                <input
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  onFocus={() => setActiveSuggestionField("equipment")}
                  onBlur={() => window.setTimeout(() => setActiveSuggestionField(null), 120)}
                  placeholder="Ex: Impressora Zebra, Wi-Fi, ERP hospitalar"
                  maxLength={TICKET_LIMITS.equipment}
                />
                <SuggestionOptions
                  field="equipment"
                  options={EQUIPMENTS}
                  value={equipment}
                  onSelect={setEquipment}
                  activeField={activeSuggestionField}
                  setActiveField={setActiveSuggestionField}
                />
              </div>
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
            onChange={(e) => {
              setDescription(e.target.value);
              setWarningAcknowledged(false);
            }}
            placeholder="Descreva o problema, desde quando ocorre, setor afetado e impacto operacional. Não informe dados de pacientes."
            rows="6"
            maxLength={TICKET_LIMITS.description}
            required
          />
          <p className={counterClass(description, TICKET_LIMITS.description)}>
            {description.length}/{TICKET_LIMITS.description}
          </p>

          {sensitiveWarnings.length > 0 && (
            <aside className="sensitive-data-warning" role="alert">
              <div>
                <strong><Icon name="shield" size={17} /> Revise estas informações antes de enviar</strong>
                <p>O texto pode conter {sensitiveWarnings.join(", ")}. Não inclua dados identificáveis nem informações clínicas de pacientes. Este aviso é automático e pode falhar; a revisão é sua.</p>
              </div>
              {!warningAcknowledged && (
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => {
                    setWarningAcknowledged(true);
                    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
                  }}
                >
                  Continuar após revisar
                </button>
              )}
            </aside>
          )}

          <div className="ticket-photo-field">
            <div>
              <label htmlFor="ticket-photo">Fotos do problema</label>
              <p>Opcional. Anexe até {MAX_TICKET_IMAGES} imagens. Fotos grandes do celular serão comprimidas antes do envio.</p>
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

          <button type="submit" disabled={submitting || catalog.loading || !!catalog.error || (user && !user.email_verified)}>
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

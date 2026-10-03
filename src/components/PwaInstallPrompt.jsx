import { useEffect, useState } from "react";
import Icon from "./Icon";
import BrandLogo from "./BrandLogo";

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setIsIos(isIosDevice());
    setIsInstalled(isStandaloneMode());

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setShowHelp(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) {
      setShowHelp(true);
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (isInstalled || (!deferredPrompt && !isIos)) return null;

  return (
    <>
      <button
        type="button"
        className="pwa-install-trigger"
        onClick={handleInstall}
        aria-label="Instalar HELP WEB HEALTH no dispositivo"
      >
        <BrandLogo decorative className="pwa-install-brand" />
        Instalar no dispositivo
      </button>

      {showHelp && (
        <div
          className="pwa-install-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowHelp(false);
          }}
        >
          <section
            className="pwa-install-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
          >
            <header className="pwa-install-dialog-header">
              <BrandLogo decorative className="pwa-dialog-brand" />
              <div>
                <span className="pwa-install-kicker">HELP WEB HEALTH</span>
                <h2 id="pwa-install-title">Adicionar à tela de início</h2>
              </div>
              <button
                type="button"
                className="ghost pwa-install-close"
                onClick={() => setShowHelp(false)}
                aria-label="Fechar instruções"
              >
                <Icon name="x" size={18} />
              </button>
            </header>

            <ol className="pwa-install-steps">
              <li>Abra este sistema pelo Safari.</li>
              <li>Toque em <strong>Compartilhar</strong>.</li>
              <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
              <li>Ative <strong>Abrir como App</strong> e toque em <strong>Adicionar</strong>.</li>
            </ol>

            <p className="pwa-install-note">
              No iPhone, o botão de instalação é disponibilizado pelo Safari e não pode ser aberto automaticamente pelo site.
            </p>
            <button type="button" className="secondary" onClick={() => setShowHelp(false)}>
              Entendi
            </button>
          </section>
        </div>
      )}
    </>
  );
}

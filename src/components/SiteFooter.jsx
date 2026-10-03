import { SITE_INFO, releaseDate, supportLinks } from "../config/siteInfo";

export default function SiteFooter() {
  const { developer, technologies, support, updatedAt } = SITE_INFO;
  const links = supportLinks(support);
  const updated = releaseDate(updatedAt);

  return (
    <footer className="site-footer" aria-label="Informações e contato do sistema">
      <dl className="site-footer-content">
        <div><dt>Desenvolvimento</dt><dd>{developer}</dd></div>
        <div><dt>Tecnologias</dt><dd>{technologies.join(" · ")}</dd></div>
        {updated && <div><dt>Última atualização</dt><dd><time dateTime={updatedAt}>{updated}</time></dd></div>}
        <div className="site-footer-support">
          <dt>Suporte {support.demonstration && <span className="support-demo-label">Demonstração</span>}</dt>
          <dd>{links.phone ? <a href={links.phone}>{support.phone}</a> : <span>{support.phone}</span>}</dd>
          <dd>{links.email ? <a href={links.email}>{support.email}</a> : <span>{support.email}</span>}</dd>
          {support.demonstration && <dd className="support-demo-note">Contatos fictícios, ainda indisponíveis.</dd>}
        </div>
      </dl>
    </footer>
  );
}

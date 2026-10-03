export default function BrandLogo({ full = false, decorative = false, className = "" }) {
  return (
    <span
      className={`brand-logo${full ? " is-full" : ""}${className ? ` ${className}` : ""}`}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "HELP WEB HEALTH"}
      aria-hidden={decorative || undefined}
    />
  );
}

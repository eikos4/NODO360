export default function SalaNightAtmosphere() {
  return (
    <div className="sala-night-sky pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="sala-night-stars" />
      <div className="sala-night-lamp" />
      <div className="sala-night-vignette" />
    </div>
  );
}

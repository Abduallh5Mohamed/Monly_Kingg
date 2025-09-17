export const CircuitBackground = () => (
    <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="circuit" patternUnits="userSpaceOnUse" width="40" height="40">
            <path d="M0 10h10v10H0zM10 0v10h10V0zM20 10h10v10H20zM30 20v10h10V20zM10 20v10h10V20zM0 30h10v10H0zM20 30h10v10H20z" stroke="hsl(var(--primary))" strokeWidth="0.5" fill="none" />
            <path d="M10 5h10M5 10v10M15 20h10M25 10v10M35 20v10M5 30v10M15 30h10" stroke="hsl(var(--accent))" strokeWidth="0.5" fill="none" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>
    </div>
);

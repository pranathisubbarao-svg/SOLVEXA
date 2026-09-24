// Animated city illustration for the home page hero.
// Pure SVG + CSS animation (see home.css "HERO SCENE").

function Pin({ x, y, color, delay }) {
  return (
    <g className="hs-pin" style={{ "--d": delay }} transform={`translate(${x} ${y})`}>
      <circle className="hs-pin-pulse" r="14" fill={color} />
      <path
        d="M0 0 C-10 -12 -12 -18 -12 -22 A12 12 0 0 1 12 -22 C12 -18 10 -12 0 0 Z"
        fill={color}
      />
      <circle cy="-22" r="4.5" fill="#fff" />
    </g>
  );
}

function HeroScene() {
  return (
    <div className="hs" aria-hidden="true">
      <svg className="hs-svg" viewBox="0 0 520 440">
        <defs>
          <linearGradient id="hsSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#eff6ff" />
          </linearGradient>
          <linearGradient id="hsBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>
          <linearGradient id="hsFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <radialGradient id="hsGlow">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
          </radialGradient>
          <clipPath id="hsClip">
            <rect width="520" height="440" rx="28" />
          </clipPath>
        </defs>

        <g clipPath="url(#hsClip)">
          {/* Sky */}
          <rect width="520" height="440" fill="url(#hsSky)" />
          <circle className="hs-sun" cx="420" cy="80" r="34" fill="#fcd34d" />

          {/* Clouds */}
          <g className="hs-cloud" fill="#fff" opacity="0.9">
            <ellipse cx="90" cy="70" rx="38" ry="14" />
            <ellipse cx="115" cy="62" rx="26" ry="14" />
          </g>
          <g className="hs-cloud hs-cloud-2" fill="#fff" opacity="0.8">
            <ellipse cx="300" cy="46" rx="30" ry="11" />
            <ellipse cx="320" cy="40" rx="20" ry="11" />
          </g>

          {/* Back skyline */}
          <g fill="url(#hsBack)">
            <rect x="10" y="170" width="60" height="170" rx="4" />
            <rect x="78" y="130" width="48" height="210" rx="4" />
            <rect x="134" y="190" width="70" height="150" rx="4" />
            <rect x="330" y="150" width="56" height="190" rx="4" />
            <rect x="394" y="185" width="64" height="155" rx="4" />
            <rect x="466" y="140" width="50" height="200" rx="4" />
          </g>

          {/* Front buildings */}
          <g fill="url(#hsFront)">
            <rect x="40" y="220" width="84" height="130" rx="6" />
            <rect x="210" y="160" width="100" height="190" rx="6" />
            <rect x="360" y="230" width="90" height="120" rx="6" />
          </g>

          {/* Windows (twinkle) */}
          <g fill="#e0f2fe">
            {[0, 1, 2, 3].map((row) =>
              [0, 1, 2].map((col) => (
                <rect
                  key={`a${row}${col}`}
                  className={(row + col) % 3 === 0 ? "hs-window" : ""}
                  style={{ "--d": `${(row * 3 + col) * 0.35}s` }}
                  x={54 + col * 22}
                  y={236 + row * 26}
                  width="12"
                  height="14"
                  rx="2"
                />
              ))
            )}
            {[0, 1, 2, 3, 4, 5].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <rect
                  key={`b${row}${col}`}
                  className={(row + col) % 4 === 1 ? "hs-window" : ""}
                  style={{ "--d": `${(row * 4 + col) * 0.25}s` }}
                  x={224 + col * 22}
                  y={176 + row * 27}
                  width="12"
                  height="15"
                  rx="2"
                />
              ))
            )}
            {[0, 1, 2, 3].map((row) =>
              [0, 1, 2].map((col) => (
                <rect
                  key={`c${row}${col}`}
                  className={(row + col) % 2 === 0 ? "hs-window" : ""}
                  style={{ "--d": `${(row * 3 + col) * 0.3 + 1}s` }}
                  x={376 + col * 24}
                  y={246 + row * 24}
                  width="12"
                  height="13"
                  rx="2"
                />
              ))
            )}
          </g>

          {/* Trees */}
          <g className="hs-tree">
            <rect x="148" y="318" width="5" height="30" fill="#92400e" />
            <circle cx="150" cy="312" r="18" fill="#22c55e" />
            <circle cx="160" cy="300" r="12" fill="#4ade80" />
          </g>
          <g className="hs-tree hs-tree-2">
            <rect x="484" y="320" width="5" height="28" fill="#92400e" />
            <circle cx="486" cy="314" r="16" fill="#22c55e" />
          </g>

          {/* Street light (flickering = reported issue) */}
          <g>
            <rect x="330" y="262" width="5" height="88" fill="#475569" />
            <path d="M332 264 q0 -12 16 -12 h8" stroke="#475569" strokeWidth="5" fill="none" />
            <rect x="352" y="248" width="16" height="8" rx="3" fill="#334155" />
            <circle className="hs-lamp" cx="360" cy="262" r="26" fill="url(#hsGlow)" />
          </g>

          {/* Road */}
          <rect y="348" width="520" height="92" fill="#334155" />
          <rect y="344" width="520" height="8" fill="#94a3b8" />
          <g className="hs-road-lines" fill="#facc15">
            {Array.from({ length: 9 }, (_, i) => (
              <rect key={i} x={i * 70} y="392" width="38" height="5" rx="2" />
            ))}
          </g>

          {/* Pothole */}
          <ellipse cx="120" cy="412" rx="28" ry="8" fill="#1e293b" />
          <ellipse cx="120" cy="410" rx="20" ry="5" fill="#0f172a" />

          {/* Garbage bin */}
          <g transform="translate(262 316)">
            <rect x="0" y="6" width="26" height="30" rx="3" fill="#16a34a" />
            <rect x="-3" y="0" width="32" height="8" rx="3" fill="#15803d" />
            <circle cx="36" cy="32" r="5" fill="#a16207" />
            <circle cx="-8" cy="33" r="4" fill="#78716c" />
          </g>

          {/* Car driving */}
          <g className="hs-car">
            <rect x="0" y="-18" width="62" height="20" rx="7" fill="#f97316" />
            <path d="M12 -18 l8 -14 h22 l10 14 z" fill="#fb923c" />
            <rect x="22" y="-29" width="10" height="9" rx="1" fill="#e0f2fe" />
            <rect x="35" y="-29" width="10" height="9" rx="1" fill="#e0f2fe" />
            <circle cx="15" cy="3" r="7" fill="#0f172a" />
            <circle cx="48" cy="3" r="7" fill="#0f172a" />
          </g>

          {/* Report pins dropping on the issues */}
          <Pin x={120} y={398} color="#ef4444" delay="0.4s" />
          <Pin x={360} y={244} color="#f59e0b" delay="0.9s" />
          <Pin x={275} y={306} color="#22c55e" delay="1.4s" />
        </g>
      </svg>

      {/* Floating UI cards */}
      <div className="hs-card hs-card-report">
        <span className="hs-card-icon">🕳️</span>
        <div>
          <strong>Pothole reported</strong>
          <small>Roads &amp; Potholes · just now</small>
        </div>
      </div>

      <div className="hs-card hs-card-status">
        <div className="hs-status-head">
          <strong>Street light repair</strong>
          <em>In Progress</em>
        </div>
        <div className="hs-steps">
          <span className="done" />
          <span className="done" />
          <span className="done" />
          <span className="active" />
          <span />
        </div>
        <small>Electrical Dept assigned · ETA 24h</small>
      </div>

      <div className="hs-card hs-card-resolved">
        <span className="hs-check">✓</span>
        <div>
          <strong>Garbage cleared</strong>
          <small>Resolved in 18 hours</small>
        </div>
      </div>
    </div>
  );
}

export default HeroScene;

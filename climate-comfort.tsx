import { useState, useMemo } from "react";

// Dew point from temp (°F) and RH (%)
function calcDewPoint(T, RH) {
  const Tc = (T - 32) * 5 / 9;
  const a = 17.27, b = 237.7;
  const gamma = (a * Tc) / (b + Tc) + Math.log(RH / 100);
  const dpC = (b * gamma) / (a - gamma);
  return dpC * 9 / 5 + 32;
}

// Heat index (Rothfusz regression)
function calcHeatIndex(T, RH) {
  if (T < 80) return T;
  let HI = -42.379 + 2.04901523 * T + 10.14333127 * RH
    - 0.22475541 * T * RH - 0.00683783 * T * T
    - 0.05481717 * RH * RH + 0.00122874 * T * T * RH
    + 0.00085282 * T * RH * RH - 0.00000199 * T * T * RH * RH;
  if (RH < 13 && T >= 80 && T <= 112) {
    HI -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  }
  if (RH > 85 && T >= 80 && T <= 87) {
    HI += ((RH - 85) / 10) * ((87 - T) / 5);
  }
  return HI;
}

function dewPointComfort(dp) {
  if (dp < 50) return { label: "Dry", color: "#3B82F6" };
  if (dp < 55) return { label: "Comfortable", color: "#10B981" };
  if (dp < 60) return { label: "Pleasant", color: "#6EE7B7" };
  if (dp < 65) return { label: "Noticeable", color: "#FBBF24" };
  if (dp < 70) return { label: "Sticky", color: "#F97316" };
  return { label: "Oppressive", color: "#EF4444" };
}

function feelsLikeComfort(fl) {
  if (fl < 80) return { label: "Comfortable", color: "#10B981" };
  if (fl < 90) return { label: "Caution", color: "#FBBF24" };
  if (fl < 105) return { label: "Danger", color: "#F97316" };
  return { label: "Extreme", color: "#EF4444" };
}

const Gauge = ({ value, min, max, label, unit, comfort, subtext }) => {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#F1F5F9", fontVariantNumeric: "tabular-nums" }}>
          {value.toFixed(1)}<span style={{ fontSize: 14, color: "#94A3B8", fontWeight: 400 }}>{unit}</span>
        </span>
      </div>
      <div style={{ position: "relative", height: 10, borderRadius: 5, background: "#1E293B", overflow: "hidden" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${pct}%`, borderRadius: 5,
          background: `linear-gradient(90deg, ${comfort.color}88, ${comfort.color})`,
          transition: "width 0.3s ease, background 0.3s ease"
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: comfort.color,
          transition: "color 0.3s ease"
        }}>{comfort.label}</span>
        {subtext && <span style={{ fontSize: 11, color: "#64748B" }}>{subtext}</span>}
      </div>
    </div>
  );
};

export default function ClimateComfort() {
  const [temp, setTemp] = useState(74);
  const [rh, setRh] = useState(67);

  const dp = useMemo(() => calcDewPoint(temp, rh), [temp, rh]);
  const fl = useMemo(() => calcHeatIndex(temp, rh), [temp, rh]);
  const dpC = dewPointComfort(dp);
  const flC = feelsLikeComfort(fl);

  const sliderTrack = {
    WebkitAppearance: "none", appearance: "none",
    width: "100%", height: 6, borderRadius: 3,
    background: "#1E293B", outline: "none", cursor: "pointer"
  };

  const sliderCSS = `
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 22px; height: 22px; border-radius: 50%;
      background: #E2E8F0; border: 2px solid #475569;
      cursor: pointer; margin-top: -1px;
    }
  `;

  // Generate heatmap data
  const heatmapTemps = [68, 72, 76, 80, 84, 88, 92];
  const heatmapRHs = [30, 40, 50, 60, 70, 80, 90];

  function cellColor(dp) {
    if (dp < 50) return "#1E3A5F";
    if (dp < 55) return "#065F46";
    if (dp < 60) return "#047857";
    if (dp < 65) return "#92400E";
    if (dp < 70) return "#B45309";
    return "#991B1B";
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0F172A", color: "#F1F5F9",
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      padding: "32px 20px"
    }}>
      <style>{sliderCSS}</style>

      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#F8FAFC", margin: "0 0 4px" }}>
          Climate Comfort
        </h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 32px" }}>
          How temperature &amp; humidity shape what you feel
        </p>

        {/* Sliders */}
        <div style={{ background: "#1E293B", borderRadius: 12, padding: "20px 20px 16px", marginBottom: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#94A3B8" }}>Air Temperature</span>
              <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{temp}°F</span>
            </div>
            <input type="range" min={60} max={100} value={temp}
              onChange={e => setTemp(+e.target.value)} style={sliderTrack} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 3 }}>
              <span>60°F</span><span>100°F</span>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "#94A3B8" }}>Relative Humidity</span>
              <span style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{rh}%</span>
            </div>
            <input type="range" min={10} max={95} value={rh}
              onChange={e => setRh(+e.target.value)} style={sliderTrack} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", marginTop: 3 }}>
              <span>10%</span><span>95%</span>
            </div>
          </div>
        </div>

        {/* Gauges */}
        <div style={{ background: "#1E293B", borderRadius: 12, padding: "20px 20px 4px", marginBottom: 24 }}>
          <Gauge value={dp} min={20} max={80} label="Dew Point" unit="°F"
            comfort={dpC} subtext="What your body feels" />
          <Gauge value={fl} min={60} max={130} label="Feels Like" unit="°F"
            comfort={flC} subtext="Heat index" />
        </div>

        {/* Key insight */}
        <div style={{
          background: `${dpC.color}15`, border: `1px solid ${dpC.color}40`,
          borderRadius: 10, padding: 16, marginBottom: 28, transition: "all 0.3s ease"
        }}>
          <p style={{ fontSize: 13, color: "#CBD5E1", margin: 0, lineHeight: 1.6 }}>
            {dp < 55
              ? "Air feels crisp. Sweat evaporates quickly — your body cools efficiently."
              : dp < 60
              ? "Comfortable conditions. Sweat evaporation works well, minimal perceived humidity."
              : dp < 65
              ? "You'll start noticing the moisture. Sweat evaporates more slowly, body works a bit harder to cool."
              : dp < 70
              ? "Sticky. Sweat lingers on skin, evaporative cooling is significantly impaired."
              : "Oppressive. Sweat can't evaporate effectively — heat stress risk is high."}
          </p>
        </div>

        {/* Dew Point Reference Heatmap */}
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#94A3B8", margin: "0 0 12px", letterSpacing: "0.03em" }}>
          DEW POINT MAP — °F BY TEMP × RH
        </h2>
        <div style={{ overflowX: "auto", marginBottom: 10 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11, textAlign: "center" }}>
            <thead>
              <tr>
                <th style={{ padding: "6px 4px", color: "#64748B", fontWeight: 500, textAlign: "left" }}>RH\T</th>
                {heatmapTemps.map(t => (
                  <th key={t} style={{ padding: "6px 4px", color: "#94A3B8", fontWeight: 600 }}>{t}°</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapRHs.map(r => (
                <tr key={r}>
                  <td style={{ padding: "5px 4px", color: "#94A3B8", fontWeight: 600, textAlign: "left" }}>{r}%</td>
                  {heatmapTemps.map(t => {
                    const d = calcDewPoint(t, r);
                    const isClose = Math.abs(t - temp) <= 2 && Math.abs(r - rh) <= 5;
                    return (
                      <td key={t} style={{
                        padding: "5px 3px",
                        background: cellColor(d),
                        color: "#E2E8F0",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: isClose ? 800 : 400,
                        borderRadius: 3,
                        border: isClose ? "2px solid #F8FAFC" : "2px solid transparent",
                        transition: "all 0.2s"
                      }}>
                        {d.toFixed(0)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10, color: "#64748B", marginBottom: 8 }}>
          {[
            { label: "Dry", c: "#1E3A5F" }, { label: "Comfortable", c: "#065F46" },
            { label: "Noticeable", c: "#92400E" }, { label: "Oppressive", c: "#991B1B" }
          ].map(i => (
            <span key={i.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: i.c, display: "inline-block" }} />
              {i.label}
            </span>
          ))}
        </div>

        <p style={{ fontSize: 11, color: "#475569", marginTop: 24, lineHeight: 1.5 }}>
          Dew point = absolute moisture in air. RH is relative to temperature — same RH at different temps means different comfort. Your body responds to dew point.
        </p>
      </div>
    </div>
  );
}

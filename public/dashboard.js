const DATA_FILES = {
  fastest: "query_results/fastest_5k_runs.csv",
  longest: "query_results/top_runs_distance.csv",
  monthly: "query_results/monthly_run_volume.csv",
};

const state = {
  volumeSeries: "distance",
};

const tooltip = document.getElementById("tooltip");

init().catch((error) => {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<p style="padding:24px;font-family:sans-serif;">Failed to load dashboard data: ${error.message}</p>`
  );
});

async function init() {
  const [fastest, longest, monthly] = await Promise.all([
    loadCsv(DATA_FILES.fastest),
    loadCsv(DATA_FILES.longest),
    loadCsv(DATA_FILES.monthly),
  ]);

  const parsed = {
    fastest: fastest.map((row) => ({
      name: row.ACTIVITY_NAME,
      date: new Date(`${row.ACTIVITY_DATE}T00:00:00`),
      distanceKm: Number(row.DISTANCE_KM),
      pace: row.PACE,
      paceMinKm: Number(row.PACE_MIN_KM),
      rank: Number(row.P_RANK),
    })),
    longest: longest.map((row) => ({
      name: decodeText(row.ACTIVITY_NAME),
      date: new Date(`${row.ACTIVITY_DATE}T00:00:00`),
      distanceKm: Number(row.DISTANCE_KM),
      rank: Number(row.DISTANCE_RANK),
    })),
    monthly: monthly
      .map((row) => ({
        month: new Date(`${row.TRAINING_MONTH}T00:00:00`),
        totalKm: Number(row.TOTAL_MONTHLY_KM),
        avgPaceDecimal: Number(row.AVG_MONTHLY_PACE_DECIMAL),
        avgPaceFormatted: row.AVG_PACE_FORMATTED,
      }))
      .sort((a, b) => a.month - b.month),
  };

  renderMeta(parsed);
  renderLeaderboard(parsed.fastest);
  renderDistanceChart(parsed.longest);
  renderVolumeChart(parsed.monthly);
  bindControls(parsed.monthly);
}

async function loadCsv(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return parseCsv(await response.text());
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((record, header, index) => {
      record[header] = values[index] ?? "";
      return record;
    }, {});
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values;
}

function decodeText(value) {
  return value.replace(/ðŸŒ¯/g, "🌯");
}

function renderMeta({ fastest, longest, monthly }) {
  const firstMonth = monthly[0]?.month;
  const lastMonth = monthly[monthly.length - 1]?.month;
  document.getElementById("best-pace").textContent = fastest[0]?.pace ?? "--";
  document.getElementById("longest-run").textContent = `${longest[0]?.distanceKm.toFixed(2)} km`;
  document.getElementById("peak-month").textContent = `${monthLabel(
    monthly.reduce((best, current) => (current.totalKm > best.totalKm ? current : best), monthly[0]).month
  )} · ${monthly.reduce((best, current) => (current.totalKm > best.totalKm ? current : best), monthly[0]).totalKm.toFixed(2)} km`;
  document.getElementById("data-range").textContent = `${monthLabel(firstMonth)} to ${monthLabel(lastMonth)}`;
}

function renderLeaderboard(entries) {
  const container = document.getElementById("leaderboard");
  container.innerHTML = entries
    .map(
      (entry) => `
        <article class="leaderboard-row">
          <div class="leaderboard-rank">#${entry.rank}</div>
          <div class="leaderboard-main">
            <strong>${entry.name}</strong>
            <span>${formatDate(entry.date)} · ${entry.distanceKm.toFixed(2)} km</span>
          </div>
          <div class="leaderboard-metric">
            <strong>${entry.pace}/km</strong>
            <span>${paceToDuration(entry.paceMinKm, entry.distanceKm)}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderDistanceChart(entries) {
  const svg = document.getElementById("distance-chart");
  const width = 720;
  const height = 360;
  const margin = { top: 16, right: 20, bottom: 68, left: 54 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const maxDistance = Math.max(...entries.map((entry) => entry.distanceKm));
  const step = chartWidth / entries.length;
  const barWidth = Math.min(90, step * 0.62);

  const defs = `
    <defs>
      <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fc5200"></stop>
        <stop offset="100%" stop-color="#f3bc55"></stop>
      </linearGradient>
    </defs>
  `;

  const grid = Array.from({ length: 4 }, (_, index) => {
    const value = ((index + 1) * maxDistance) / 4;
    const y = margin.top + chartHeight - (value / maxDistance) * chartHeight;
    return `
      <line class="grid-line" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"></line>
      <text class="tick-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${value.toFixed(1)}</text>
    `;
  }).join("");

  const bars = entries
    .map((entry, index) => {
      const barHeight = (entry.distanceKm / maxDistance) * chartHeight;
      const x = margin.left + index * step + (step - barWidth) / 2;
      const y = margin.top + chartHeight - barHeight;
      const labelX = x + barWidth / 2;
      return `
        <g>
          <rect
            class="bar"
            x="${x}"
            y="${y}"
            width="${barWidth}"
            height="${barHeight}"
            rx="18"
            data-title="${escapeHtml(entry.name)}"
            data-detail="${entry.distanceKm.toFixed(2)} km · ${formatDate(entry.date)}"
          ></rect>
          <text class="axis-label" x="${labelX}" y="${height - 24}" text-anchor="middle">#${entry.rank}</text>
          <text class="tick-label" x="${labelX}" y="${height - 8}" text-anchor="middle">${formatShortDate(entry.date)}</text>
        </g>
      `;
    })
    .join("");

  svg.innerHTML = `
    ${defs}
    <line class="axis-line" x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}"></line>
    <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}"></line>
    ${grid}
    ${bars}
  `;

  attachTooltip(svg.querySelectorAll(".bar"));
}

function renderVolumeChart(entries) {
  const svg = document.getElementById("volume-chart");
  const width = 920;
  const height = 360;
  const margin = { top: 22, right: 20, bottom: 58, left: 54 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const values =
    state.volumeSeries === "distance"
      ? entries.map((entry) => entry.totalKm)
      : entries.map((entry) => entry.avgPaceDecimal);
  const maxValue = Math.max(...values) * 1.1;
  const minValue = 0;
  const xStep = chartWidth / Math.max(entries.length - 1, 1);
  const lineClass = state.volumeSeries === "distance" ? "line-path" : "line-path pace-path";
  const pointClass = state.volumeSeries === "distance" ? "point" : "point pace";

  const points = entries.map((entry, index) => {
    const value = state.volumeSeries === "distance" ? entry.totalKm : entry.avgPaceDecimal;
    const x = margin.left + index * xStep;
    const y = margin.top + chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;
    return { entry, x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${margin.top + chartHeight} L ${points[0].x} ${margin.top + chartHeight} Z`;

  const grid = Array.from({ length: 4 }, (_, index) => {
    const tickValue = maxValue * ((index + 1) / 4);
    const y = margin.top + chartHeight - (tickValue / maxValue) * chartHeight;
    return `
      <line class="grid-line" x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}"></line>
      <text class="tick-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${formatSeriesValue(tickValue)}</text>
    `;
  }).join("");

  const xLabels = points
    .map(
      (point) => `
        <text class="axis-label" x="${point.x}" y="${height - 16}" text-anchor="middle">${monthLabel(point.entry.month, "short")}</text>
      `
    )
    .join("");

  const circles = points
    .map(
      (point) => `
        <circle
          class="${pointClass}"
          cx="${point.x}"
          cy="${point.y}"
          r="7"
          data-title="${monthLabel(point.entry.month)}"
          data-detail="${tooltipDetail(point.entry)}"
        ></circle>
      `
    )
    .join("");

  svg.innerHTML = `
    <line class="axis-line" x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}"></line>
    <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}"></line>
    ${grid}
    <path class="area-path" d="${areaPath}"></path>
    <path class="${lineClass}" d="${linePath}"></path>
    ${circles}
    ${xLabels}
  `;

  attachTooltip(svg.querySelectorAll(".point"));
}

function bindControls(monthly) {
  document.querySelectorAll(".toggle").forEach((button) => {
    button.addEventListener("click", () => {
      state.volumeSeries = button.dataset.series;
      document.querySelectorAll(".toggle").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      renderVolumeChart(monthly);
    });
  });
}

function attachTooltip(nodes) {
  nodes.forEach((node) => {
    node.addEventListener("mouseenter", (event) => {
      const target = event.currentTarget;
      tooltip.innerHTML = `<strong>${target.dataset.title}</strong>${target.dataset.detail}`;
      tooltip.hidden = false;
    });
    node.addEventListener("mousemove", (event) => {
      tooltip.style.left = `${event.clientX + 16}px`;
      tooltip.style.top = `${event.clientY + 16}px`;
    });
    node.addEventListener("mouseleave", () => {
      tooltip.hidden = true;
    });
  });
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function monthLabel(date, month = "long") {
  return new Intl.DateTimeFormat("en-US", {
    month,
    year: "numeric",
  }).format(date);
}

function paceToDuration(paceMinKm, distanceKm) {
  const totalMinutes = paceMinKm * distanceKm;
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round((totalMinutes - minutes) * 60)
    .toString()
    .padStart(2, "0");
  return `Approx ${minutes}:${seconds} 5K`;
}

function formatSeriesValue(value) {
  if (state.volumeSeries === "distance") {
    return `${value.toFixed(0)} km`;
  }

  const minutes = Math.floor(value);
  const seconds = Math.round((value - minutes) * 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function tooltipDetail(entry) {
  if (state.volumeSeries === "distance") {
    return `${entry.totalKm.toFixed(2)} km total · Avg pace ${entry.avgPaceFormatted}/km`;
  }
  return `Avg pace ${entry.avgPaceFormatted}/km · ${entry.totalKm.toFixed(2)} km total`;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

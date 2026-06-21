// render-contributions.mjs
//
// Renders the "last ~9 weeks" GitHub contribution calendar for JoakimLarssen
// as a themed teal-on-near-black SVG (assets/contributions-2mo.svg).
//
// No npm dependencies. Uses global fetch (Node 18+).
//
// Auth: process.env.GH_TOKEN || process.env.GITHUB_TOKEN
//   - Private contribution COUNTS only appear if the user enabled
//     "Include private contributions on my profile" AND the token can read
//     them. The default GITHUB_TOKEN may omit private counts; a classic PAT
//     with scope read:user, stored as secret GH_TOKEN, fixes that. See SETUP.md.

import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const LOGIN = "JoakimLarssen";
const OUT = fileURLToPath(new URL("../assets/contributions-2mo.svg", import.meta.url));

// ---- palette ("Phosphor Field") ----------------------------------------
const BG = "#0D1011";
const EMPTY = "#14181A";
const TEXT = "#E6E7E8";
const TEXT_DIM = "#828B8F";
const RULE = "#22282B";
const ACCENT = "#5ED3C4";
const ACCENT_DIM = "#3C8C84";
// four teal steps, light -> bright (index 1..4); index 0 = EMPTY
const SCALE = ["#14181A", "#1d3b38", "#2f6b63", "#46a99c", "#5ED3C4"];

// ---- grid geometry ------------------------------------------------------
const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP; // 14
const PAD_L = 16;
const PAD_T = 56; // room for title + month labels
const FONT = "ui-monospace, 'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

// Map a contribution count to a scale index (0..4) using fixed absolute
// cutoffs (close to GitHub's own bucketing) rather than a window-relative
// max. Absolute bands keep the color honest: a quiet day stays dim instead
// of jumping to bright teal just because it happens to be the busiest day in
// a quiet stretch. The `max` argument is accepted but unused, so the call
// site does not need to change.
function levelFor(count) {
  if (count <= 0) return 0;
  if (count >= 10) return 4;
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  return 1; // 1..2
}

async function fetchCalendar(token, fromISO, toISO) {
  const query = `
    query($login:String!, $from:DateTime!, $to:DateTime!) {
      user(login:$login) {
        contributionsCollection(from:$from, to:$to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays { date contributionCount }
            }
          }
        }
      }
    }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "joakimlarssen-profile-contrib",
    },
    body: JSON.stringify({ query, variables: { login: LOGIN, from: fromISO, to: toISO } }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GraphQL HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors).slice(0, 400)}`);
  }
  const cal = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error("No contributionCalendar in response");
  return cal;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildSvg(weeks, total, fromISO, toISO) {
  // weeks: array of { contributionDays: [{date, contributionCount}, ...] }
  const cols = weeks.length;
  const gridW = cols * STEP - GAP;
  const gridH = 7 * STEP - GAP;

  const width = PAD_L * 2 + gridW;
  const titleY = 22;
  const monthY = PAD_T - 10;
  const gridTop = PAD_T;
  const legendY = gridTop + gridH + 26;
  const height = legendY + 14;

  const rects = [];

  // cells
  for (let x = 0; x < cols; x++) {
    const days = weeks[x].contributionDays;
    for (const d of days) {
      const dow = new Date(d.date + "T00:00:00Z").getUTCDay(); // 0 = Sun
      const cx = PAD_L + x * STEP;
      const cy = gridTop + dow * STEP;
      const lvl = levelFor(d.contributionCount);
      const fill = SCALE[lvl];
      rects.push(
        `<rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" fill="${fill}"><title>${d.date}: ${d.contributionCount}</title></rect>`
      );
    }
  }

  // month labels: place a label at the first column whose first day is in a new month
  const monthLabels = [];
  let lastMonth = -1;
  for (let x = 0; x < cols; x++) {
    const first = weeks[x].contributionDays[0];
    if (!first) continue;
    const m = new Date(first.date + "T00:00:00Z").getUTCMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      const lx = PAD_L + x * STEP;
      monthLabels.push(
        `<text x="${lx}" y="${monthY}" font-family="${FONT}" font-size="10" fill="${TEXT_DIM}">${MONTHS[m]}</text>`
      );
    }
  }

  // legend
  const legendLabelX = PAD_L;
  const lessX = legendLabelX;
  const swatchStartX = lessX + 34;
  const swatches = SCALE.map((c, i) => {
    const sx = swatchStartX + i * (CELL + 3);
    return `<rect x="${sx}" y="${legendY - CELL + 2}" width="${CELL}" height="${CELL}" fill="${c}"/>`;
  }).join("");
  const moreX = swatchStartX + SCALE.length * (CELL + 3) + 6;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub contributions, last ~9 weeks: ${total} contributions">
  <rect width="${width}" height="${height}" fill="${BG}"/>
  <text x="${PAD_L}" y="${titleY}" font-family="${FONT}" font-size="12" letter-spacing="0.5" fill="${ACCENT}">contributions</text>
  <rect x="${PAD_L}" y="${titleY + 8}" width="${gridW}" height="1" fill="${RULE}"/>
  ${monthLabels.join("\n  ")}
  ${rects.join("\n  ")}
  <text x="${lessX}" y="${legendY}" font-family="${FONT}" font-size="10" fill="${TEXT_DIM}">Less</text>
  ${swatches}
  <text x="${moreX}" y="${legendY}" font-family="${FONT}" font-size="10" fill="${TEXT_DIM}">More</text>
</svg>
`;
}

// Deterministic seeded fallback so the script never produces an empty widget
// (used only if no token / network is available, e.g. local dry-run).
function seededWeeks(fromISO, toISO) {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  // back up to the start of that week (Sunday)
  const start = new Date(from);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const weeks = [];
  let cursor = new Date(start);
  // simple LCG for reproducible pseudo-random counts
  let s = 1337;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  while (cursor <= to) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor);
      d.setUTCDate(d.getUTCDate() + i);
      let count = 0;
      if (d >= from && d <= to) {
        const dow = d.getUTCDay();
        const r = rnd();
        // Bands chosen so the seed exercises every scale level, including the
        // dimmest nonzero step (1..2 contributions -> level 1), so the
        // committed seed demonstrates the same swatches its legend shows.
        if (dow === 0 || dow === 6) {
          // weekends: usually idle, occasionally a light day
          count = r > 0.7 ? 1 + Math.floor(r * 4) : 0;
        } else if (r < 0.25) {
          count = 0; // quiet weekday
        } else if (r < 0.45) {
          count = 1 + Math.floor(r * 2); // light day: 1..2 (level 1)
        } else {
          count = 3 + Math.floor(r * 8); // working day: 3..10 (levels 2..4)
        }
      }
      days.push({ date: isoDate(d), contributionCount: count });
    }
    weeks.push({ contributionDays: days });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return weeks;
}

async function main() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 63); // ~9 weeks
  const fromISO = from.toISOString();
  const toISO = to.toISOString();

  let weeks, total;
  if (token) {
    try {
      const cal = await fetchCalendar(token, fromISO, toISO);
      weeks = cal.weeks;
      total = cal.totalContributions;
      console.log(`Fetched ${weeks.length} weeks, ${total} contributions.`);
    } catch (err) {
      console.error("Live fetch failed, using seeded fallback:", err.message);
      weeks = seededWeeks(fromISO, toISO);
      total = weeks.reduce((a, w) => a + w.contributionDays.reduce((b, d) => b + d.contributionCount, 0), 0);
    }
  } else {
    console.warn("No GH_TOKEN/GITHUB_TOKEN found; rendering seeded fallback.");
    weeks = seededWeeks(fromISO, toISO);
    total = weeks.reduce((a, w) => a + w.contributionDays.reduce((b, d) => b + d.contributionCount, 0), 0);
  }

  const svg = buildSvg(weeks, total, fromISO, toISO);
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, svg, "utf8");
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

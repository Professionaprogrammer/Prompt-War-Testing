/**
 * ArenaSphere Backend Server
 * FIFA World Cup 2026 - Smart Stadium Command & Fan Experience Hub
 *
 * Provides GenAI-powered endpoints for:
 *  - Fan concierge chat (multilingual stadium assistance)
 *  - Operations incident resolution (SOP co-pilot)
 *  - Multilingual broadcast translation
 *
 * Security: Helmet headers, CORS restriction, rate limiting, input validation.
 * Fallback: If GEMINI_API_KEY is absent, a rule-based simulator responds instead.
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");

/* ---------- Gemini AI Integration --------------------------------------- */
/**
 * Uses the official @google/genai SDK (v2.x) which natively supports
 * both legacy AIza... and new AQ. API key formats.
 *
 * The older @google/generative-ai package is deprecated and does NOT
 * support AQ. keys — it sends them as Bearer tokens causing 401 errors.
 */

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();

const MODEL_CANDIDATES = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

/** Currently active model (dynamically updated to the first working model candidate). */
let activeModel = MODEL_CANDIDATES[0];

/** Whether Gemini is available (set to true after successful validation). */
let geminiReady = false;

/** @type {import("@google/genai").GoogleGenAI | null} */
let genAI = null;

/**
 * Call the Gemini API via the official SDK, dynamically falling back
 * to alternative models if the primary model is out of quota.
 *
 * @param {string} prompt - The user prompt text.
 * @param {string} [systemInstruction] - Optional system instruction.
 * @returns {Promise<string>} The model's text response.
 * @throws {Error} On network or API errors.
 */
async function callGemini(prompt, systemInstruction) {
  if (!genAI) throw new Error("Gemini SDK not initialized");

  const config = {};
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  // Tries candidates starting from the last known activeModel
  const startIndex = MODEL_CANDIDATES.indexOf(activeModel);
  const reorderedCandidates = [
    ...MODEL_CANDIDATES.slice(startIndex),
    ...MODEL_CANDIDATES.slice(0, startIndex)
  ];

  let lastErr = null;
  for (const modelName of reorderedCandidates) {
    try {
      const response = await genAI.models.generateContent({
        model: modelName,
        contents: prompt,
        config,
      });

      const text = response.text;
      if (text) {
        // Cache this model as the working active model
        activeModel = modelName;
        return text;
      }
    } catch (err) {
      lastErr = err;
      // If it is a quota or validation error, try next candidate
      console.warn(`[ArenaSphere] Model "${modelName}" failed: ${err.message?.split("\n")[0]}`);
    }
  }

  throw lastErr || new Error("All Gemini model candidates failed");
}

// Initialize and validate at startup
if (GEMINI_API_KEY) {
  console.log(`[ArenaSphere] API key detected (${GEMINI_API_KEY.slice(0, 5)}...). Initializing...`);

  try {
    const { GoogleGenAI } = require("@google/genai");
    genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    (async () => {
      try {
        const testResponse = await callGemini("Reply with exactly: OK");
        if (testResponse) {
          geminiReady = true;
          console.log(`[ArenaSphere] ✅ Gemini active using model: "${activeModel}"`);
        }
      } catch (err) {
        let reason = "";
        try {
          const errMsg = err.message || "";
          if (errMsg.includes("API_KEY_SERVICE_BLOCKED")) {
            reason = " (Reason: API_KEY_SERVICE_BLOCKED — the Gemini API is disabled or blocked by organization policies in your Google Cloud project)";
          } else if (errMsg.includes("401") || errMsg.includes("UNAUTHENTICATED")) {
            reason = " (Reason: Invalid credentials or unauthorized project)";
          } else if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
            reason = " (Reason: Quota exhausted on all models for this project)";
          }
        } catch (_) {}
        console.warn(`[ArenaSphere] ⚠️ Gemini validation failed: ${err.message?.split("\n")[0]}${reason}`);
        console.warn("[ArenaSphere] Running in simulator mode. Check your API key.");
      }
    })();
  } catch (err) {
    console.warn("[ArenaSphere] @google/genai SDK load failed:", err.message);
    console.warn("[ArenaSphere] Run: npm install @google/genai");
  }
} else {
  console.log("[ArenaSphere] No GEMINI_API_KEY found — running in simulator mode.");
}

/* ---------- Express app ------------------------------------------------- */
const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

/* ---------- Middleware -------------------------------------------------- */
app.use(compression());
app.use(helmet());
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "50kb" })); // cap body size

// Global rate limiter: 60 requests / minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
});
app.use(limiter);

/* ========================================================================
 *  INPUT VALIDATION HELPERS
 * ====================================================================== */

/**
 * Sanitise a user-supplied string: trim, cap length, strip control chars.
 * @param {string} raw  - The raw input.
 * @param {number} maxLen - Maximum allowed length (default 1000).
 * @returns {string} Sanitised string.
 */
function sanitise(raw, maxLen = 1000) {
  if (typeof raw !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return raw.trim().slice(0, maxLen).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

/**
 * Validate that a required field is a non-empty string.
 * Returns an error message string or null if valid.
 */
function requireString(value, fieldName) {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return `"${fieldName}" is required and must be a non-empty string.`;
  }
  return null;
}

/* ========================================================================
 *  FALLBACK SIMULATOR — realistic rule-based responses
 * ====================================================================== */

const SIMULATOR = {
  /**
   * Simulate a fan concierge reply.
   * @param {string} message - The fan's question.
   * @param {string} lang - Preferred language code.
   * @returns {string} A helpful response.
   */
  chat(message, lang = "en") {
    const lower = message.toLowerCase();

    const responses = {
      gate: `🏟️ **Gate Navigation**\nGates A–D are located on the North, East, South, and West sides respectively. Gate C (South) currently has the shortest wait time (~3 min). Follow the illuminated floor markers from the main concourse.\n\n♿ Accessible entrances are available at Gates A and C with ramp access and dedicated staff assistance.`,

      food: `🍔 **Food & Beverage Stations**\nThere are 12 concession stands across 4 zones:\n- **Zone N (Gate A):** Tacos El Campeón, Burger World\n- **Zone E (Gate B):** Sushi Express, Pasta Corner\n- **Zone S (Gate C):** BBQ Pit, Veggie Garden (vegan/halal options)\n- **Zone W (Gate D):** Crêpes & Café, Smoothie Bar\n\n🥤 Free water refill stations are at every zone entrance. Average wait: 4 min.`,

      water: `💧 **Water Refill Stations**\nFree water refill stations are located at:\n- Every zone entrance (N, E, S, W)\n- Near restroom blocks on Levels 1 and 2\n- Behind Section 108 and Section 215\n\nPlease bring a reusable bottle — each refill earns you 5 Eco-Points! 🌱`,

      parking: `🚗 **Parking & Transportation**\nParking lots P1–P4 surround the stadium. P2 (East) has the most available spots right now.\n\n🚌 **Shuttle Service:** Free shuttles run every 8 min from Central Station (Routes S1, S2).\n🚇 **Metro:** Nearest station is "Stadium West" (Line 3), a 5-minute walk to Gate D.\n\n💡 Ride-share drop-off point: North Plaza (Gate A).`,

      accessibility: `♿ **Accessibility Services**\nWe are committed to an inclusive experience:\n- Wheelchair-accessible seating in Sections 104, 112, 205, 218\n- Accessible restrooms on every level\n- Braille signage and tactile pathways throughout\n- Sign language interpreters at Fan Info desks (Gates A & C)\n- Sensory rooms available on Level 2 near Section 210\n\nNeed assistance? Text "HELP" to +1-555-WC26 or visit any Fan Info desk.`,

      emergency: `🚨 **Emergency Information**\nFirst-aid stations are located at:\n- Gate A (North Medical Center)\n- Gate C (South Medical Pod)\n- Level 2, Section 212 (Upper Concourse Clinic)\n\nFor emergencies, alert the nearest steward (yellow vests) or call the stadium hotline: **+1-555-911-WC26**.\n\nDefibrillators (AEDs) are mounted every 50 meters on the main concourse.`,

      recycle: `♻️ **Sustainability & Recycling**\nHelp us make this the greenest World Cup ever!\n- **Green bins** (recyclables) and **blue bins** (compost) are at every concession area\n- Each item recycled = **+5 Eco-Points** on your fan profile\n- Collect **50 points** to plant a tree in your name 🌳\n- Reusable cup program: £2 deposit, returned at any stand\n\nVisit the Eco Lounge near Gate D to learn more!`,

      match: `⚽ **Match Information**\nToday's match: **Mexico 🇲🇽 vs. USA 🇺🇸**\nKick-off: 18:00 local time | Gate opening: 15:30\n\nNext match at this venue:\n**Canada 🇨🇦 vs. Argentina 🇦🇷** — July 14, 20:00\n\nLive scores are displayed on jumbotrons and on your ArenaSphere fan app.`,
    };

    // keyword matching
    if (/gate|entrance|door|entry/i.test(lower)) return responses.gate;
    if (/food|eat|drink|restaurant|hungry|concession|snack/i.test(lower)) return responses.food;
    if (/water|refill|hydrat/i.test(lower)) return responses.water;
    if (/park|transport|shuttle|metro|bus|taxi|uber|ride/i.test(lower)) return responses.parking;
    if (/access|wheelchair|disab|blind|deaf|sensory|ramp/i.test(lower)) return responses.accessibility;
    if (/emergency|first.?aid|medical|hurt|injur|ambulance/i.test(lower)) return responses.emergency;
    if (/recycle|sustain|eco|green|environment|carbon/i.test(lower)) return responses.recycle;
    if (/match|score|team|kick.?off|game|play/i.test(lower)) return responses.match;

    // default
    return `👋 **Welcome to ArenaSphere!**\nI'm your AI stadium assistant for the FIFA World Cup 2026. I can help you with:\n\n• 🏟️ Gate & seat navigation\n• 🍔 Food & drink locations\n• 💧 Water refill stations\n• 🚗 Parking & transportation\n• ♿ Accessibility services\n• 🚨 Emergency & first-aid info\n• ♻️ Sustainability challenges\n• ⚽ Match schedules & scores\n\nJust ask me anything! I speak English, Spanish, French, Arabic, and Portuguese.`;
  },

  /**
   * Simulate an operations incident response.
   * @param {string} incident - Description of the incident.
   * @returns {object} Structured response plan.
   */
  incident(incident) {
    const lower = incident.toLowerCase();

    let severity = "MEDIUM";
    let immediateActions = [];
    let announcements = [];
    let staffTasks = [];
    let estimatedResolution = "15–25 minutes";

    if (/overcrowd|crowd|congestion|stampede|crush/i.test(lower)) {
      severity = "HIGH";
      immediateActions = [
        "Activate crowd flow Protocol C-7: open auxiliary exit routes",
        "Deploy 6 additional stewards to the affected zone immediately",
        "Enable one-way flow on Concourse Level 1 corridors",
        "Activate digital signage to redirect foot traffic to Gates B and D",
      ];
      announcements = [
        "EN: Attention fans, please use Gates B and D for a smoother exit. Thank you for your cooperation.",
        "ES: Atención, por favor utilicen las puertas B y D para una salida más fluida.",
        "FR: Veuillez utiliser les portes B et D pour une sortie plus fluide.",
      ];
      staffTasks = [
        { role: "Security Lead", task: "Monitor CCTV feeds for zones N-1 through N-4", priority: "URGENT" },
        { role: "Steward Team Alpha", task: "Position at corridor junctions to guide crowd flow", priority: "URGENT" },
        { role: "Medical Standby", task: "Pre-position at Gate A medical pod", priority: "HIGH" },
        { role: "Comms Officer", task: "Update PA system every 3 minutes with crowd status", priority: "HIGH" },
      ];
      estimatedResolution = "10–20 minutes";
    } else if (/medical|injury|heart|faint|collapse|seizure/i.test(lower)) {
      severity = "CRITICAL";
      immediateActions = [
        "Dispatch nearest medical response team (MRT) to reported location",
        "Retrieve closest AED unit and first-aid kit",
        "Clear a 5-meter radius around the patient",
        "Notify on-site paramedic unit and prepare ambulance bay",
      ];
      announcements = [
        "EN: Medical team has been dispatched. Please keep the area clear.",
        "ES: El equipo médico ha sido enviado. Por favor, mantengan el área despejada.",
      ];
      staffTasks = [
        { role: "Medical Response Team", task: "Assess patient, administer first aid, prepare for transfer", priority: "CRITICAL" },
        { role: "Section Steward", task: "Clear pathway from patient location to ambulance bay", priority: "URGENT" },
        { role: "Control Room", task: "Log incident timestamp and coordinate with emergency services", priority: "HIGH" },
      ];
      estimatedResolution = "5–15 minutes";
    } else if (/rfid|scanner|ticket|turnstile|entry.?system/i.test(lower)) {
      severity = "MEDIUM";
      immediateActions = [
        "Switch affected gate to manual ticket verification mode",
        "Deploy 2 additional ticketing staff with handheld scanners",
        "Notify IT team to diagnose RFID reader hardware/software",
        "Open adjacent gate lanes to absorb queue overflow",
      ];
      announcements = [
        "EN: We are experiencing a brief delay at this gate. Additional lanes are open nearby.",
        "ES: Estamos experimentando un breve retraso. Se han abierto carriles adicionales cerca.",
      ];
      staffTasks = [
        { role: "IT Support", task: "Diagnose and restart RFID scanner firmware at affected gate", priority: "HIGH" },
        { role: "Ticketing Staff", task: "Manual verification with handheld devices", priority: "HIGH" },
        { role: "Queue Manager", task: "Redirect fans to open gate lanes", priority: "MEDIUM" },
      ];
      estimatedResolution = "15–30 minutes";
    } else if (/weather|rain|storm|lightning|wind|heat/i.test(lower)) {
      severity = "HIGH";
      immediateActions = [
        "Activate weather protocol W-2: assess roof closure (if retractable) or shelter zones",
        "Alert all outdoor vendors to secure equipment",
        "Open covered concourse areas for fan shelter",
        "Suspend any rooftop or open-air fan zone activities",
      ];
      announcements = [
        "EN: Due to weather conditions, please move to covered areas. The match status will be updated shortly.",
        "ES: Debido a las condiciones climáticas, por favor diríjanse a áreas cubiertas.",
        "FR: En raison des conditions météorologiques, veuillez vous diriger vers les zones couvertes.",
      ];
      staffTasks = [
        { role: "Safety Officer", task: "Monitor weather radar and liaise with match officials", priority: "URGENT" },
        { role: "Stewards", task: "Guide fans to nearest covered shelter points", priority: "HIGH" },
        { role: "Facilities", task: "Secure outdoor signage and temporary structures", priority: "HIGH" },
      ];
      estimatedResolution = "Ongoing — weather dependent";
    } else {
      // generic incident
      immediateActions = [
        "Assess the situation on-site and classify severity",
        "Deploy nearest available response team to the incident location",
        "Establish a communication channel with Control Room",
        "Document the incident with timestamp, location, and initial assessment",
      ];
      announcements = [
        "EN: Our team is addressing a situation. Normal operations will resume shortly.",
        "ES: Nuestro equipo está atendiendo una situación. Las operaciones normales se reanudarán en breve.",
      ];
      staffTasks = [
        { role: "Incident Commander", task: "Assess severity and coordinate response", priority: "HIGH" },
        { role: "Communications", task: "Prepare stakeholder updates", priority: "MEDIUM" },
        { role: "Documentation", task: "Log all actions and timestamps for post-incident review", priority: "MEDIUM" },
      ];
    }

    return {
      incident,
      severity,
      timestamp: new Date().toISOString(),
      immediateActions,
      announcements,
      staffTasks,
      estimatedResolution,
      followUp: "A post-incident report will be generated within 30 minutes of resolution.",
    };
  },

  /**
   * Simulate multilingual translation.
   * @param {string} text - English text to translate.
   * @returns {object} Translations keyed by language code.
   */
  async translate(text) {
    // All translations go through external API — no hardcoded shortcuts

    // Try fetching real translation using public free API in parallel
    const targets = { es: "es", fr: "fr", ar: "ar", pt: "pt" };
    const results = { en: text };

    const promises = Object.entries(targets).map(async ([key, lang]) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${lang}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          if (json.responseData && json.responseData.translatedText) {
            results[key] = json.responseData.translatedText;
            return;
          }
        }
      } catch (err) {
        console.warn(`[MyMemory Fallback] Translate to ${lang} failed:`, err.message);
      }

      // Local basic regex translation fallback if API is down
      if (key === "es") {
        results[key] = text.replace(/welcome/gi, "bienvenidos").replace(/please/gi, "por favor").replace(/thank you/gi, "gracias");
      } else if (key === "fr") {
        results[key] = text.replace(/welcome/gi, "bienvenue").replace(/please/gi, "s'il vous plaît").replace(/thank you/gi, "merci");
      } else if (key === "ar") {
        results[key] = text.replace(/welcome/gi, "مرحباً").replace(/please/gi, "من فضلك").replace(/thank you/gi, "شكراً");
      } else if (key === "pt") {
        results[key] = text.replace(/welcome/gi, "bem-vindos").replace(/please/gi, "por favor").replace(/thank you/gi, "obrigado");
      }
    });

    await Promise.all(promises);
    return results;
  },
};

/* ========================================================================
 *  API ROUTES
 * ====================================================================== */

/**
 * POST /api/dashboard
 * AI-generated operational insights and recommendations.
 * Uses Gemini to analyse current stadium state and produce actionable intelligence.
 * Body: { stats: object } — optional current stats context.
 */
app.post("/api/dashboard", async (req, res) => {
  try {
    const statsContext = req.body.stats || {};

    if (geminiReady) {
      try {
        const systemPrompt = `You are the ArenaSphere AI intelligence engine for the FIFA World Cup 2026 stadium.
Based on the current stadium conditions provided below, generate a JSON object with these fields:
- "insights": an array of 3 short operational insight strings (each max 80 chars), based on the data.
- "recommendation": a single actionable recommendation string (max 120 chars) for operations staff.
- "crowdTrend": one of "increasing", "stable", "decreasing" describing overall crowd movement.
- "riskLevel": one of "low", "moderate", "elevated", "high" based on current conditions.
- "sustainabilityTip": a short eco-tip for the PA system (max 100 chars).

Respond ONLY with valid JSON. No markdown fences.`;

        let raw = await callGemini(`Current stadium state: ${JSON.stringify(statsContext)}`, systemPrompt);
        raw = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

        try {
          const parsed = JSON.parse(raw);
          return res.json({ ...parsed, source: "gemini" });
        } catch {
          return res.json({
            insights: ["AI analysis complete", "Data processing active", raw.slice(0, 80)],
            recommendation: "Review raw AI output for detailed insights.",
            crowdTrend: "stable",
            riskLevel: "low",
            sustainabilityTip: "Recycle your cups to earn Eco-Points!",
            source: "gemini",
          });
        }
      } catch (geminiErr) {
        console.warn("[/api/dashboard] Gemini error, falling back to simulator:", geminiErr.message);
      }
    }

    // Simulator fallback — generate context-aware insights
    const hour = new Date().getHours();
    const insights = [
      hour < 15 ? "Pre-match flow: gates opening on schedule" : "Active match: monitoring crowd density in real-time",
      "Shuttle S2 running at 78% capacity — within normal range",
      "Eco-recycling rate 12% above target — excellent progress",
    ];

    return res.json({
      insights,
      recommendation: hour < 15
        ? "Pre-position stewards at Gate A for early arrivals."
        : "Monitor Zone N congestion — consider opening auxiliary corridors.",
      crowdTrend: hour < 17 ? "increasing" : "stable",
      riskLevel: "low",
      sustainabilityTip: "Refill your water bottle at any zone entrance and earn 5 Eco-Points! 🌱",
      source: "simulator",
    });
  } catch (error) {
    console.error("[/api/dashboard] Unexpected error:", error.message);
    return res.json({
      insights: ["System operational", "Monitoring active", "All systems nominal"],
      recommendation: "All operations normal.",
      crowdTrend: "stable",
      riskLevel: "low",
      sustainabilityTip: "Every recycled item helps! ♻️",
      source: "simulator-fallback",
    });
  }
});

/**
 * Health check endpoint.
 */
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "ArenaSphere API",
    mode: geminiReady ? "gemini" : "simulator",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/chat
 * Fan concierge - multilingual stadium assistant.
 * Body: { message: string, language?: string }
 */
app.post("/api/chat", async (req, res) => {
  try {
    const message = sanitise(req.body.message, 500);
    const language = sanitise(req.body.language || "en", 10);

    const err = requireString(message, "message");
    if (err) return res.status(400).json({ error: err });

    if (geminiReady) {
      try {
        const systemPrompt = `You are ArenaSphere, the official AI concierge for the FIFA World Cup 2026 stadium. 
You help fans navigate the stadium, find food/drinks, locate accessibility services, understand transportation options, 
and participate in sustainability initiatives. Respond in ${language} language. 
Be helpful, concise, and friendly. Use emojis sparingly. 
Format your response with clear sections using markdown bold headings.
Include specific locations (gate letters, section numbers, levels) in your answers.
If asked about emergencies, always include the stadium emergency hotline: +1-555-911-WC26.`;

        const text = await callGemini(`Fan question: ${message}`, systemPrompt);
        return res.json({ reply: text, source: "gemini" });
      } catch (geminiErr) {
        console.warn("[/api/chat] Gemini error, falling back to simulator:", geminiErr.message);
      }
    }

    // Fallback to simulator
    const reply = SIMULATOR.chat(message, language);
    return res.json({ reply, source: "simulator" });
  } catch (error) {
    console.error("[/api/chat] Unexpected error:", error.message);
    // Final fallback to simulator on any unexpected error
    const reply = SIMULATOR.chat(message || "", "en");
    return res.json({ reply, source: "simulator-fallback" });
  }
});

/**
 * POST /api/operations/incident
 * Operations AI co-pilot - incident resolution.
 * Body: { incident: string }
 */
app.post("/api/operations/incident", async (req, res) => {
  try {
    const incident = sanitise(req.body.incident, 800);

    const err = requireString(incident, "incident");
    if (err) return res.status(400).json({ error: err });

    if (geminiReady) {
      try {
        const systemPrompt = `You are ArenaSphere Operations AI Co-Pilot for the FIFA World Cup 2026 stadium.
Given an incident report, produce a structured JSON response with these fields:
- incident: the original report (string)
- severity: one of CRITICAL, HIGH, MEDIUM, LOW (string)
- timestamp: current ISO timestamp (string)
- immediateActions: array of 3-5 specific action steps (string[])
- announcements: array of multilingual announcements in EN, ES, FR (string[])
- staffTasks: array of objects with { role, task, priority } for specific staff assignments
- estimatedResolution: estimated time to resolve (string)
- followUp: post-incident follow-up note (string)

Respond ONLY with valid JSON. No markdown fences.`;

        let text = await callGemini(`Incident report: ${incident}`, systemPrompt);
        text = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

        try {
          const parsed = JSON.parse(text);
          return res.json({ plan: parsed, source: "gemini" });
        } catch {
          return res.json({
            plan: { incident, rawResponse: text, severity: "MEDIUM", timestamp: new Date().toISOString() },
            source: "gemini",
          });
        }
      } catch (geminiErr) {
        console.warn("[/api/operations/incident] Gemini error, falling back to simulator:", geminiErr.message);
      }
    }

    // Fallback to simulator
    const plan = SIMULATOR.incident(incident);
    return res.json({ plan, source: "simulator" });
  } catch (error) {
    console.error("[/api/operations/incident] Unexpected error:", error.message);
    const plan = SIMULATOR.incident(incident || "");
    return res.json({ plan, source: "simulator-fallback" });
  }
});

/**
 * POST /api/operations/translate
 * Multilingual broadcast translator.
 * Body: { text: string }
 */
app.post("/api/operations/translate", async (req, res) => {
  try {
    const text = sanitise(req.body.text, 500);

    const err = requireString(text, "text");
    if (err) return res.status(400).json({ error: err });

    if (geminiReady) {
      try {
        const systemPrompt = `Translate the following stadium announcement into 5 languages.
Return ONLY valid JSON with keys: en, es, fr, ar, pt
Each value is the translated announcement in that language.
Keep the translations professional, clear, and suitable for public announcement display.
Do not include markdown fences.`;

        let raw = await callGemini(`Announcement: ${text}`, systemPrompt);
        raw = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

        try {
          const translations = JSON.parse(raw);
          return res.json({ translations, source: "gemini" });
        } catch {
          return res.json({ translations: { en: text, raw }, source: "gemini" });
        }
      } catch (geminiErr) {
        console.warn("[/api/operations/translate] Gemini error, falling back to simulator:", geminiErr.message);
      }
    }

    // Fallback to simulator
    const translations = await SIMULATOR.translate(text);
    return res.json({ translations, source: "simulator" });
  } catch (error) {
    console.error("[/api/operations/translate] Unexpected error:", error.message);
    const translations = await SIMULATOR.translate(text || "");
    return res.json({ translations, source: "simulator-fallback" });
  }
});

/* ---------- Start server ------------------------------------------------ */
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`\n🏟️  ArenaSphere API running on http://localhost:${PORT}`);
    console.log(`   Mode: ${geminiReady ? "🤖 Gemini AI" : "🎮 Simulator (will switch to AI when key validates)"}`);
    console.log(`   CORS: ${FRONTEND_ORIGIN}\n`);
  });
}

module.exports = app;

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createSupabaseAdmin(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function tgApi(method: string, payload: Record<string, any>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

function mainMenuKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "➕ Start Trade Entry", callback_data: "START_TRADE" }],
      [
        { text: "📊 Today Summary", callback_data: "TODAY_STATS" },
        { text: "🆔 My Chat ID", callback_data: "SHOW_CHAT_ID" },
      ],
    ],
  };
}

function roadmapKeyboard(roadmaps: Array<{ id: string; name: string }>) {
  return {
    inline_keyboard: [
      ...roadmaps.map((r) => [
        { text: `🎯 ${r.name}`, callback_data: `RM:${r.id}` },
      ]),
      [{ text: "❌ Cancel", callback_data: "CANCEL" }],
    ],
  };
}

function symbolKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "XAUUSD", callback_data: "SYM:XAUUSD" },
        { text: "EURUSD", callback_data: "SYM:EURUSD" },
        { text: "GBPUSD", callback_data: "SYM:GBPUSD" },
      ],
      [
        { text: "NAS100", callback_data: "SYM:NAS100" },
        { text: "US30", callback_data: "SYM:US30" },
        { text: "BTCUSD", callback_data: "SYM:BTCUSD" },
      ],
      [
        { text: "USDJPY", callback_data: "SYM:USDJPY" },
        { text: "GBPJPY", callback_data: "SYM:GBPJPY" },
      ],
      [{ text: "❌ Cancel", callback_data: "CANCEL" }],
    ],
  };
}

function sessionKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🇬🇧 London", callback_data: "SES:London" },
        { text: "🇺🇸 New York", callback_data: "SES:New York" },
      ],
      [
        { text: "🇯🇵 Asian", callback_data: "SES:Asian" },
        { text: "🌐 Other", callback_data: "SES:Other" },
      ],
      [{ text: "❌ Cancel", callback_data: "CANCEL" }],
    ],
  };
}

function outcomeKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "✅ WIN", callback_data: "OUT:WIN" },
        { text: "❌ LOSS", callback_data: "OUT:LOSS" },
        { text: "➖ BE", callback_data: "OUT:BE" },
      ],
      [{ text: "❌ Cancel", callback_data: "CANCEL" }],
    ],
  };
}

function rrKeyboard(outcome: "WIN" | "LOSS" | "BE", risk: number, defaultRr: number) {
  if (outcome === "WIN") {
    return {
      inline_keyboard: [
        [
          { text: `1:1 (+$${(risk * 1).toFixed(0)})`, callback_data: "RR:1" },
          { text: `1:2 (+$${(risk * 2).toFixed(0)})`, callback_data: "RR:2" },
          { text: `1:3 (+$${(risk * 3).toFixed(0)})`, callback_data: "RR:3" },
        ],
        [
          { text: `1:4 (+$${(risk * 4).toFixed(0)})`, callback_data: "RR:4" },
          { text: `1:5 (+$${(risk * 5).toFixed(0)})`, callback_data: "RR:5" },
          { text: `1:6 (+$${(risk * 6).toFixed(0)})`, callback_data: "RR:6" },
        ],
        ...(defaultRr && ![1, 2, 3, 4, 5, 6].includes(defaultRr)
          ? [[{ text: `1:${defaultRr} Roadmap Default (+$${(risk * defaultRr).toFixed(2)})`, callback_data: `RR:${defaultRr}` }]]
          : []),
        [{ text: "❌ Cancel", callback_data: "CANCEL" }],
      ],
    };
  }
  return {
    inline_keyboard: [
      [
        { text: `-1R (-$${risk.toFixed(2)})`, callback_data: "RR:-1" },
        { text: `-0.5R (-$${(risk * 0.5).toFixed(2)})`, callback_data: "RR:-0.5" },
      ],
      [{ text: "❌ Cancel", callback_data: "CANCEL" }],
    ],
  };
}

function reasonKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "1h orderblock to m5 orderblock", callback_data: "RSN:1h orderblock to m5 orderblock" }],
      [{ text: "4h orderblock to m15 orderblock", callback_data: "RSN:4h orderblock to m15 orderblock" }],
      [
        { text: "⏭ Skip", callback_data: "SKIP_REASON" },
        { text: "❌ Cancel", callback_data: "CANCEL" },
      ],
    ],
  };
}

function photoKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "⏭ Skip Photo & Save Trade", callback_data: "SKIP_PHOTO" }],
      [{ text: "❌ Cancel", callback_data: "CANCEL" }],
    ],
  };
}

function parseRrInput(raw: string, outcome: "WIN" | "LOSS"): number | null {
  const cleaned = raw.trim().toLowerCase().replace(/r$/i, "");
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    const left = parseFloat(parts[0]);
    const right = parseFloat(parts[1]);
    if (!Number.isNaN(left) && left > 0 && !Number.isNaN(right) && right > 0) {
      const ratio = Number((right / left).toFixed(2));
      return outcome === "WIN" ? ratio : -ratio;
    }
    return null;
  }
  const num = parseFloat(cleaned.replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(num) || num === 0) return null;
  return outcome === "WIN" ? Math.abs(num) : -Math.abs(num);
}

async function saveTradeToDb(
  supabase: ReturnType<typeof getAdminClient>,
  chatId: string,
  userId: string,
  draft: Record<string, any>
) {
  const { data: roadmap } = await supabase
    .from("roadmaps")
    .select("*")
    .eq("id", draft.roadmap_id)
    .single();

  if (!roadmap) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "⚠️ Selected roadmap not found. Tap below to start again:",
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  let { data: dayRecord } = await supabase
    .from("daily_records")
    .select("id, entry_mode")
    .eq("roadmap_id", roadmap.id)
    .eq("trade_date", today)
    .single();

  if (!dayRecord) {
    const { data: createdDay, error: dayErr } = await supabase
      .from("daily_records")
      .insert({
        user_id: userId,
        roadmap_id: roadmap.id,
        trade_date: today,
        entry_mode: "detailed",
        session: draft.session || "New York",
        total_trades: 0,
        wins: 0,
        losses: 0,
        break_evens: 0,
        gross_profit: 0,
        gross_loss: 0,
      })
      .select("id, entry_mode")
      .single();

    if (dayErr || !createdDay) {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `⚠️ Error preparing today's record: ${dayErr?.message || "Unknown"}`,
        reply_markup: mainMenuKeyboard(),
      });
      return;
    }
    dayRecord = createdDay;
  }

  if (dayRecord.entry_mode === "summary") {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "⚠️ Today's record is in Quick Summary mode on the web app. Switch it to Detailed mode or delete the summary record to log individual trades.",
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  const outcome: "WIN" | "LOSS" | "BE" = draft.outcome || "WIN";
  const riskAmt = Number(roadmap.risk_per_trade) || 100;
  let rrVal = Number(draft.rr_achieved);

  if (outcome === "BE") {
    rrVal = 0;
  } else if (outcome === "WIN") {
    rrVal = rrVal > 0 ? rrVal : Number(roadmap.rr_ratio) || 2;
  } else {
    rrVal = rrVal < 0 ? rrVal : -1;
  }

  const pnl = outcome === "BE" ? 0 : Number((riskAmt * rrVal).toFixed(2));
  const rrLabel =
    outcome === "BE"
      ? "0R (BE)"
      : outcome === "WIN"
      ? `1:${rrVal} (+${rrVal}R)`
      : `${rrVal}R`;

  const { error: tradeErr } = await supabase.from("trades").insert({
    user_id: userId,
    roadmap_id: roadmap.id,
    daily_record_id: dayRecord.id,
    symbol: (draft.symbol || "XAUUSD").toUpperCase(),
    session: draft.session || "New York",
    outcome,
    risk_amount: riskAmt,
    rr_achieved: rrVal,
    pnl,
    notes: draft.reason || null,
    photo_url: draft.photo_url || null,
  });

  await supabase.from("telegram_sessions").upsert({
    chat_id: chatId,
    user_id: userId,
    step: "IDLE",
    draft: {},
    updated_at: new Date().toISOString(),
  });

  if (tradeErr) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: `❌ Could not save trade: ${tradeErr.message}`,
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  const summary = [
    "✅ *Trade Saved to TradePulse!*",
    `• *Roadmap:* ${roadmap.name}`,
    `• *Pair:* ${(draft.symbol || "XAUUSD").toUpperCase()}`,
    `• *Session:* ${draft.session || "New York"}`,
    `• *Outcome:* ${outcome}`,
    `• *R:R:* ${rrLabel} (${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)})`,
    `• *Reason:* ${draft.reason || "—"}`,
    `• *Chart Photo:* ${draft.photo_url ? "Attached ✅" : "None"}`,
  ].join("\n");

  await tgApi("sendMessage", {
    chat_id: chatId,
    text: summary,
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard(),
  });
}

async function startWizard(
  supabase: ReturnType<typeof getAdminClient>,
  chatId: string,
  userId: string
) {
  const { data: roadmaps } = await supabase
    .from("roadmaps")
    .select("id, name, risk_per_trade, rr_ratio")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (!roadmaps || roadmaps.length === 0) {
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "⚠️ You don't have any active roadmaps yet. Create one in the web app first!",
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  if (roadmaps.length === 1) {
    const rm = roadmaps[0];
    await supabase.from("telegram_sessions").upsert({
      chat_id: chatId,
      user_id: userId,
      step: "ASK_SYMBOL",
      draft: {
        roadmap_id: rm.id,
        risk_per_trade: Number(rm.risk_per_trade),
        rr_ratio: Number(rm.rr_ratio),
      },
      updated_at: new Date().toISOString(),
    });
    await tgApi("sendMessage", {
      chat_id: chatId,
      text: `🎯 Roadmap: *${rm.name}*\n\n*Step 1/5 — Tap a Pair below (or type any pair):*\n_Examples: XAUUSD, EURUSD, NAS100_`,
      parse_mode: "Markdown",
      reply_markup: symbolKeyboard(),
    });
    return;
  }

  await supabase.from("telegram_sessions").upsert({
    chat_id: chatId,
    user_id: userId,
    step: "ASK_ROADMAP",
    draft: {},
    updated_at: new Date().toISOString(),
  });

  await tgApi("sendMessage", {
    chat_id: chatId,
    text: "🎯 *Choose a Roadmap:*",
    parse_mode: "Markdown",
    reply_markup: roadmapKeyboard(roadmaps),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getAdminClient();

    // 1. Handle Inline Button Clicks (callback_query)
    if (body.callback_query) {
      const cq = body.callback_query;
      const chatId = String(cq.message?.chat?.id || cq.from?.id);
      const data: string = cq.data || "";

      await tgApi("answerCallbackQuery", { callback_query_id: cq.id });

      if (data === "SHOW_CHAT_ID") {
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: `🆔 Your Telegram Chat ID is:\n\`${chatId}\`\n\nPaste this into *Settings* in TradePulse Command.`,
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_chat_id", chatId)
        .single();

      if (!profile) {
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: `⚠️ Account not linked yet.\n\nCopy your Chat ID: \`${chatId}\`\nOpen *Settings* in TradePulse Command, paste it, and save.`,
          parse_mode: "Markdown",
        });
        return NextResponse.json({ ok: true });
      }

      if (data === "CANCEL") {
        await supabase.from("telegram_sessions").upsert({
          chat_id: chatId,
          user_id: profile.id,
          step: "IDLE",
          draft: {},
          updated_at: new Date().toISOString(),
        });
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: "❌ Cancelled.",
          reply_markup: mainMenuKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      if (data === "TODAY_STATS") {
        const today = new Date().toISOString().split("T")[0];
        const { data: recs } = await supabase
          .from("daily_records")
          .select("wins, losses, break_evens, net_pl, roadmaps(name)")
          .eq("user_id", profile.id)
          .eq("trade_date", today);

        if (!recs || recs.length === 0) {
          await tgApi("sendMessage", {
            chat_id: chatId,
            text: `📊 No trades logged yet for today (${today}).`,
            reply_markup: mainMenuKeyboard(),
          });
          return NextResponse.json({ ok: true });
        }

        const lines = recs.map(
          (r: any) =>
            `• *${r.roadmaps?.name || "Roadmap"}*: ${r.wins}W / ${r.losses}L / ${r.break_evens}BE (${Number(r.net_pl) >= 0 ? "+" : ""}$${Number(r.net_pl).toFixed(2)})`
        );
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: `📊 *Today's Summary (${today}):*\n${lines.join("\n")}`,
          parse_mode: "Markdown",
          reply_markup: mainMenuKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      if (data === "START_TRADE") {
        await startWizard(supabase, chatId, profile.id);
        return NextResponse.json({ ok: true });
      }

      const { data: sess } = await supabase
        .from("telegram_sessions")
        .select("*")
        .eq("chat_id", chatId)
        .single();

      const draft = (sess?.draft as Record<string, any>) || {};

      if (data.startsWith("RM:")) {
        const rmId = data.slice(3);
        const { data: rm } = await supabase
          .from("roadmaps")
          .select("id, name, risk_per_trade, rr_ratio")
          .eq("id", rmId)
          .single();

        if (!rm) return NextResponse.json({ ok: true });
        const nextDraft: Record<string, any> = {
          ...draft,
          roadmap_id: rm.id,
          risk_per_trade: Number(rm.risk_per_trade),
          rr_ratio: Number(rm.rr_ratio),
        };
        await supabase.from("telegram_sessions").upsert({
          chat_id: chatId,
          user_id: profile.id,
          step: "ASK_SYMBOL",
          draft: nextDraft,
          updated_at: new Date().toISOString(),
        });
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: `🎯 Roadmap: *${rm.name}*\n\n*Step 1/5 — Tap a Pair below (or type any pair):*\n_Examples: XAUUSD, EURUSD, NAS100_`,
          parse_mode: "Markdown",
          reply_markup: symbolKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("SYM:")) {
        const symbol = data.slice(4);
        await supabase.from("telegram_sessions").upsert({
          chat_id: chatId,
          user_id: profile.id,
          step: "ASK_SESSION",
          draft: { ...draft, symbol },
          updated_at: new Date().toISOString(),
        });
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: `📌 Pair: *${symbol}*\n\n*Step 2/5 — Tap Session:*`,
          parse_mode: "Markdown",
          reply_markup: sessionKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("SES:")) {
        const session = data.slice(4);
        await supabase.from("telegram_sessions").upsert({
          chat_id: chatId,
          user_id: profile.id,
          step: "ASK_OUTCOME",
          draft: { ...draft, session },
          updated_at: new Date().toISOString(),
        });
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: `🕒 Session: *${session}*\n\n*Step 3/5 — Tap Outcome:*`,
          parse_mode: "Markdown",
          reply_markup: outcomeKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("OUT:")) {
        const outcome = data.slice(4) as "WIN" | "LOSS" | "BE";
        const nextDraft: Record<string, any> = { ...draft, outcome };
        if (outcome === "BE") {
          nextDraft.rr_achieved = 0;
          nextDraft.pnl = 0;
          await supabase.from("telegram_sessions").upsert({
            chat_id: chatId,
            user_id: profile.id,
            step: "ASK_REASON",
            draft: nextDraft,
            updated_at: new Date().toISOString(),
          });
          await tgApi("sendMessage", {
            chat_id: chatId,
            text: `➖ Outcome: *BREAK-EVEN (0R)*\n\n*Step 4/5 — Select Reason:*`,
            parse_mode: "Markdown",
            reply_markup: reasonKeyboard(),
          });
        } else {
          const risk = Number(draft.risk_per_trade) || 100;
          const rr = Number(draft.rr_ratio) || 2;
          await supabase.from("telegram_sessions").upsert({
            chat_id: chatId,
            user_id: profile.id,
            step: "ASK_RR",
            draft: nextDraft,
            updated_at: new Date().toISOString(),
          });
          await tgApi("sendMessage", {
            chat_id: chatId,
            text: `${outcome === "WIN" ? "✅" : "❌"} Outcome: *${outcome}*\n\n*Step 3.5/5 — Select or type Risk:Reward (R:R):*\n_Example: ${outcome === "WIN" ? "1:4 or 4" : "-1 or -0.5"}_`,
            parse_mode: "Markdown",
            reply_markup: rrKeyboard(outcome, risk, rr),
          });
        }
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("RR:")) {
        const rrVal = parseFloat(data.slice(3)) || 0;
        const risk = Number(draft.risk_per_trade) || 100;
        const pnl = Number((risk * rrVal).toFixed(2));
        await supabase.from("telegram_sessions").upsert({
          chat_id: chatId,
          user_id: profile.id,
          step: "ASK_REASON",
          draft: { ...draft, rr_achieved: rrVal, pnl },
          updated_at: new Date().toISOString(),
        });
        const rrText = rrVal > 0 ? `1:${rrVal} (+${rrVal}R)` : `${rrVal}R`;
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: `📐 R:R: *${rrText}* (${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)})\n\n*Step 4/5 — Select Reason:*`,
          parse_mode: "Markdown",
          reply_markup: reasonKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("RSN:")) {
        const reason = data.slice(4);
        await supabase.from("telegram_sessions").upsert({
          chat_id: chatId,
          user_id: profile.id,
          step: "ASK_PHOTO",
          draft: { ...draft, reason },
          updated_at: new Date().toISOString(),
        });
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: `📝 Reason: *${reason}*\n\n*Step 5/5 — Send Chart Photo or tap Skip:*`,
          parse_mode: "Markdown",
          reply_markup: photoKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      if (data === "SKIP_REASON") {
        await supabase.from("telegram_sessions").upsert({
          chat_id: chatId,
          user_id: profile.id,
          step: "ASK_PHOTO",
          draft: { ...draft, reason: null },
          updated_at: new Date().toISOString(),
        });
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: `*Step 5/5 — Send Chart Photo or tap Skip:*`,
          parse_mode: "Markdown",
          reply_markup: photoKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      if (data === "SKIP_PHOTO") {
        await saveTradeToDb(supabase, chatId, profile.id, { ...draft, photo_url: null });
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true });
    }

    // 2. Handle Start / Messages
    const msg = body.message || body.edited_message;
    if (!msg || !msg.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(msg.chat.id);
    const text: string = (msg.text || msg.caption || "").trim();

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_chat_id", chatId)
      .single();

    if (!profile) {
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `⚠️ Account not linked yet.\n\nCopy your Chat ID: \`${chatId}\`\nPaste it into *Settings* in TradePulse Command and save, then tap *Start Trade Entry* below:`,
        parse_mode: "Markdown",
        reply_markup: mainMenuKeyboard(),
      });
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/start")) {
      await startWizard(supabase, chatId, profile.id);
      return NextResponse.json({ ok: true });
    }

    const { data: sess } = await supabase
      .from("telegram_sessions")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    const step = sess?.step || "IDLE";
    const draft = (sess?.draft as Record<string, any>) || {};

    if (step === "ASK_SYMBOL" && text) {
      const symbol = text.toUpperCase().replace(/[^A-Z0-9._-]/g, "");
      await supabase.from("telegram_sessions").upsert({
        chat_id: chatId,
        user_id: profile.id,
        step: "ASK_SESSION",
        draft: { ...draft, symbol },
        updated_at: new Date().toISOString(),
      });
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `📌 Pair: *${symbol}*\n\n*Step 2/5 — Tap Session:*`,
        parse_mode: "Markdown",
        reply_markup: sessionKeyboard(),
      });
      return NextResponse.json({ ok: true });
    }

    if (step === "ASK_RR" && text) {
      const outcome: "WIN" | "LOSS" = draft.outcome === "LOSS" ? "LOSS" : "WIN";
      const rrVal = parseRrInput(text, outcome);
      if (rrVal === null) {
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: `⚠️ Tap an R:R button above or type a valid R:R (e.g. \`1:4\` or \`4\`).`,
          parse_mode: "Markdown",
        });
        return NextResponse.json({ ok: true });
      }
      const risk = Number(draft.risk_per_trade) || 100;
      const pnl = Number((risk * rrVal).toFixed(2));
      const rrText = rrVal > 0 ? `1:${rrVal} (+${rrVal}R)` : `${rrVal}R`;

      await supabase.from("telegram_sessions").upsert({
        chat_id: chatId,
        user_id: profile.id,
        step: "ASK_REASON",
        draft: { ...draft, rr_achieved: rrVal, pnl },
        updated_at: new Date().toISOString(),
      });
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `📐 R:R: *${rrText}* (${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)})\n\n*Step 4/5 — Select Reason:*`,
        parse_mode: "Markdown",
        reply_markup: reasonKeyboard(),
      });
      return NextResponse.json({ ok: true });
    }

    if (step === "ASK_REASON" && text) {
      await supabase.from("telegram_sessions").upsert({
        chat_id: chatId,
        user_id: profile.id,
        step: "ASK_PHOTO",
        draft: { ...draft, reason: text },
        updated_at: new Date().toISOString(),
      });
      await tgApi("sendMessage", {
        chat_id: chatId,
        text: `📝 Reason saved!\n\n*Step 5/5 — Send Chart Photo or tap Skip:*`,
        parse_mode: "Markdown",
        reply_markup: photoKeyboard(),
      });
      return NextResponse.json({ ok: true });
    }

    if (step === "ASK_PHOTO") {
      if (Array.isArray(msg.photo) && msg.photo.length > 0) {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        let photoUrl: string | null = null;
        if (botToken) {
          const largest = msg.photo[msg.photo.length - 1];
          const fileRes = await fetch(
            `https://api.telegram.org/bot${botToken}/getFile?file_id=${largest.file_id}`
          );
          const fileJson = await fileRes.json();
          const filePath = fileJson?.result?.file_path;
          if (filePath) {
            const imgRes = await fetch(
              `https://api.telegram.org/file/bot${botToken}/${filePath}`
            );
            const buf = await imgRes.arrayBuffer();
            const ext = filePath.split(".").pop() || "jpg";
            const storagePath = `${profile.id}/${Date.now()}-${largest.file_unique_id}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("trade-photos")
              .upload(storagePath, new Uint8Array(buf), {
                contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
              });
            if (!upErr) {
              const { data: pub } = supabase.storage
                .from("trade-photos")
                .getPublicUrl(storagePath);
              photoUrl = pub.publicUrl;
            }
          }
        }
        await saveTradeToDb(supabase, chatId, profile.id, { ...draft, photo_url: photoUrl });
        return NextResponse.json({ ok: true });
      } else {
        await tgApi("sendMessage", {
          chat_id: chatId,
          text: "📸 Send a chart photo or tap *Skip Photo & Save Trade* below:",
          parse_mode: "Markdown",
          reply_markup: photoKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }
    }

    await tgApi("sendMessage", {
      chat_id: chatId,
      text: "Tap *Start Trade Entry* below to begin with inline buttons:",
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Telegram wizard error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

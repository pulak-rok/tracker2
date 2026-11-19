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

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

function parseTradeCommand(rawText: string) {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const [headerPart, ...reasonParts] = trimmed.split("|");
  const reason = reasonParts.join("|").trim() || null;
  const tokens = headerPart.trim().split(/\s+/);

  if (tokens.length < 2) return null;

  const symbol = tokens[0].toUpperCase();
  const outcomeToken = tokens[1].toUpperCase();
  let outcome: "WIN" | "LOSS" | "BE" = "WIN";
  if (outcomeToken === "WIN" || outcomeToken === "W") outcome = "WIN";
  else if (outcomeToken === "LOSS" || outcomeToken === "L") outcome = "LOSS";
  else if (outcomeToken === "BE" || outcomeToken === "B") outcome = "BE";
  else return null;

  let rawAmount = tokens[2] ? parseFloat(tokens[2].replace(/[^0-9.-]/g, "")) : NaN;
  if (Number.isNaN(rawAmount)) {
    rawAmount = outcome === "BE" ? 0 : 100;
  }

  let pnl = rawAmount;
  if (outcome === "WIN") pnl = Math.abs(rawAmount) || 100;
  else if (outcome === "LOSS") pnl = -(Math.abs(rawAmount) || 100);
  else pnl = 0;

  return { symbol, outcome, pnl, reason };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const msg = body.message || body.edited_message || body.channel_post;
    if (!msg || !msg.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(msg.chat.id);
    const text: string = (msg.text || msg.caption || "").trim();
    const supabase = getAdminClient();

    if (text.startsWith("/start") || text.startsWith("/chatid")) {
      await sendTelegramMessage(
        chatId,
        `Your Telegram Chat ID is: ${chatId}\n\nPaste this ID into Settings in TradePulse Command to link your account.\n\nSend a trade anytime:\nXAUUSD WIN 250 | London sweep & BOS\nEURUSD LOSS -100 | Entered early\nBTCUSD BE 0 | Moved SL to BE\n(Attach a chart photo with caption to save it too!)`
      );
      return NextResponse.json({ ok: true });
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("telegram_chat_id", chatId)
      .single();

    if (profileErr || !profile) {
      await sendTelegramMessage(
        chatId,
        `Telegram chat ${chatId} is not linked to any TradePulse account yet. Add Chat ID "${chatId}" in Terminal Settings.`
      );
      return NextResponse.json({ ok: true });
    }

    const { data: roadmaps } = await supabase
      .from("roadmaps")
      .select("*")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    const activeRoadmap = roadmaps?.[0];
    if (!activeRoadmap) {
      await sendTelegramMessage(
        chatId,
        "No active roadmap found in your account. Create an active roadmap first."
      );
      return NextResponse.json({ ok: true });
    }

    const parsed = parseTradeCommand(text || "XAUUSD BE 0 | Photo trade");
    if (!parsed) {
      await sendTelegramMessage(
        chatId,
        "Format: SYMBOL WIN/LOSS/BE [PNL] | reason\nExample: XAUUSD WIN 250 | Clean 15m breakout"
      );
      return NextResponse.json({ ok: true });
    }

    let photoUrl: string | null = null;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (Array.isArray(msg.photo) && msg.photo.length > 0 && botToken) {
      const largestPhoto = msg.photo[msg.photo.length - 1];
      const fileRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${largestPhoto.file_id}`
      );
      const fileJson = await fileRes.json();
      const filePath = fileJson?.result?.file_path;
      if (filePath) {
        const imgRes = await fetch(
          `https://api.telegram.org/file/bot${botToken}/${filePath}`
        );
        const arrayBuf = await imgRes.arrayBuffer();
        const ext = filePath.split(".").pop() || "jpg";
        const storagePath = `${profile.id}/${Date.now()}-${largestPhoto.file_unique_id}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("trade-photos")
          .upload(storagePath, new Uint8Array(arrayBuf), {
            contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
            upsert: false,
          });
        if (!uploadErr) {
          const { data: pub } = supabase.storage
            .from("trade-photos")
            .getPublicUrl(storagePath);
          photoUrl = pub.publicUrl;
        }
      }
    }

    const today = new Date().toISOString().split("T")[0];
    let { data: dayRecord } = await supabase
      .from("daily_records")
      .select("id, entry_mode")
      .eq("roadmap_id", activeRoadmap.id)
      .eq("trade_date", today)
      .single();

    if (!dayRecord) {
      const { data: createdDay, error: dayErr } = await supabase
        .from("daily_records")
        .insert({
          user_id: profile.id,
          roadmap_id: activeRoadmap.id,
          trade_date: today,
          entry_mode: "detailed",
          session: "New York",
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
        await sendTelegramMessage(chatId, `Failed to prepare trading day: ${dayErr?.message || "Unknown error"}`);
        return NextResponse.json({ ok: true });
      }
      dayRecord = createdDay;
    }

    if (dayRecord.entry_mode === "summary") {
      await sendTelegramMessage(
        chatId,
        "Today's record is set to Quick Summary mode. Switch it to Detailed mode in the web app to log individual trades."
      );
      return NextResponse.json({ ok: true });
    }

    const riskAmt = Number(activeRoadmap.risk_per_trade) || Math.abs(parsed.pnl) || 100;
    const rrVal =
      parsed.outcome === "WIN" && riskAmt > 0
        ? Number((parsed.pnl / riskAmt).toFixed(2))
        : parsed.outcome === "LOSS"
        ? -1
        : 0;

    const { error: tradeErr } = await supabase.from("trades").insert({
      user_id: profile.id,
      roadmap_id: activeRoadmap.id,
      daily_record_id: dayRecord.id,
      symbol: parsed.symbol,
      session: "New York",
      outcome: parsed.outcome,
      risk_amount: riskAmt,
      rr_achieved: rrVal,
      pnl: parsed.pnl,
      notes: parsed.reason,
      photo_url: photoUrl,
    });

    if (tradeErr) {
      await sendTelegramMessage(chatId, `Trade save failed: ${tradeErr.message}`);
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(
      chatId,
      `Logged ${parsed.symbol} ${parsed.outcome} (${parsed.pnl >= 0 ? "+" : ""}${parsed.pnl.toFixed(2)}) on "${activeRoadmap.name}"${parsed.reason ? `\nReason: ${parsed.reason}` : ""}${photoUrl ? "\nPhoto saved to Supabase Storage" : ""}`
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Telegram webhook error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

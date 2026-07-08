"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { useMember } from "@/lib/use-member";
import type { Ticket } from "@/lib/types";

type TicketWithEvent = Ticket & {
  events: {
    name: string;
    location: string | null;
    event_time: string;
    end_time: string | null;
  } | null;
};

type Category = "valid" | "pending" | "expired" | "used";

function getCategory(t: TicketWithEvent): Category | null {
  if (t.payment_status === "rejected") return null;
  if (t.status === "used") return "used";
  if (t.payment_status === "pending") return "pending";
  const endTime = t.events?.end_time ?? t.events?.event_time;
  if (endTime && new Date(endTime) < new Date()) return "expired";
  return "valid";
}

const CATEGORY_LABELS: Record<Category, string> = {
  valid: "Valid",
  pending: "Pending",
  expired: "Expired",
  used: "Used",
};

const COLORS = {
  background: "#faf9f7",
  foreground: "#2b2824",
  muted: "#8a8580",
  accent: "#d4714a",
  primary: "#1d9e75",
  border: "#e8e4de",
};

function drawTicketImage(
  qrCanvas: HTMLCanvasElement,
  ticket: TicketWithEvent,
  holderName: string,
  category: Category
): HTMLCanvasElement {
  const scale = 2;
  const width = 360 * scale;
  const badgeColor = category === "valid" ? COLORS.primary : COLORS.border;
  const badgeTextColor = category === "valid" ? "#ffffff" : COLORS.muted;
  const subtitleLine =
    (ticket.events?.event_time ? new Date(ticket.events.event_time).toLocaleString() : "") +
    (ticket.events?.location ? ` · ${ticket.events.location}` : "");

  const topHeight = 190 * scale;
  const qrSize = 150 * scale;
  const bottomHeight = qrSize + 80 * scale;
  const height = topHeight + bottomHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  function roundedRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // card background
  roundedRect(0, 0, width, height, 20 * scale);
  ctx.fillStyle = COLORS.background;
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // status badge
  ctx.font = `${12 * scale}px sans-serif`;
  const badgeText = CATEGORY_LABELS[category].toUpperCase();
  const badgeTextWidth = ctx.measureText(badgeText).width;
  const badgePaddingX = 12 * scale;
  const badgeWidth = badgeTextWidth + badgePaddingX * 2;
  const badgeHeight = 24 * scale;
  const badgeX = width / 2 - badgeWidth / 2;
  const badgeY = 20 * scale;
  roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
  ctx.fillStyle = badgeColor;
  ctx.fill();
  ctx.fillStyle = badgeTextColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, width / 2, badgeY + badgeHeight / 2 + 1);

  // event name
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `600 ${18 * scale}px sans-serif`;
  ctx.fillText(ticket.events?.name ?? "", width / 2, badgeY + badgeHeight + 26 * scale);

  // holder name
  ctx.fillStyle = COLORS.muted;
  ctx.font = `${14 * scale}px sans-serif`;
  ctx.fillText(holderName, width / 2, badgeY + badgeHeight + 52 * scale);

  // date / location
  ctx.fillText(subtitleLine, width / 2, badgeY + badgeHeight + 74 * scale);

  // dashed divider with notches
  const dividerY = topHeight;
  ctx.save();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1 * scale;
  ctx.setLineDash([6 * scale, 6 * scale]);
  ctx.beginPath();
  ctx.moveTo(0, dividerY);
  ctx.lineTo(width, dividerY);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(0, dividerY, 12 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width, dividerY, 12 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // QR code
  const qrX = width / 2 - qrSize / 2;
  const qrY = dividerY + 30 * scale;
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  return canvas;
}

function TicketCard({
  ticket,
  holderName,
  category,
}: {
  ticket: TicketWithEvent;
  holderName: string;
  category: Category;
}) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [sharing, setSharing] = useState(false);

  async function share() {
    const qrCanvas = qrRef.current;
    if (!qrCanvas || sharing) return;
    setSharing(true);

    try {
      const canvas = drawTicketImage(qrCanvas, ticket, holderName, category);
      const fileName = `${ticket.events?.name ?? "ticket"}.png`;

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!blob) throw new Error("Could not generate image");

      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: ticket.events?.name ?? "Ticket" });
        } catch {
          // user cancelled the share sheet, nothing to do
        }
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
      }
    } catch (err) {
      console.error("Failed to generate ticket image", err);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      className={`snap-center shrink-0 w-full relative rounded-2xl border border-border overflow-hidden bg-background ${
        category !== "valid" ? "opacity-50" : ""
      }`}
    >
      <div className="p-5 flex flex-col items-center gap-1 text-center">
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full mb-1 ${
            category === "valid" ? "bg-primary text-white" : "bg-border text-foreground/60"
          }`}
        >
          {CATEGORY_LABELS[category].toUpperCase()}
        </span>
        <p className="font-semibold text-lg">{ticket.events?.name}</p>
        <p className="text-sm text-foreground/60">{holderName}</p>
        <p className="text-sm text-foreground/60">
          {ticket.events?.event_time
            ? new Date(ticket.events.event_time).toLocaleString()
            : ""}
          {ticket.events?.location ? ` · ${ticket.events.location}` : ""}
        </p>
      </div>

      <div className="relative border-t border-dashed border-border">
        <span className="absolute -left-3 top-0 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border" />
        <span className="absolute -right-3 top-0 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border" />
        <div className="p-5 flex flex-col items-center gap-3">
          <QRCodeCanvas ref={qrRef} value={`ticket:${ticket.id}`} size={150} />
          <button
            onClick={share}
            disabled={sharing}
            className="text-sm text-accent font-medium border border-border rounded-xl px-4 py-1.5 disabled:opacity-50"
          >
            {sharing ? "Preparing..." : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}

function groupByEvent(tickets: TicketWithEvent[]) {
  const groups = new Map<string, TicketWithEvent[]>();
  for (const t of tickets) {
    const existing = groups.get(t.event_id) ?? [];
    existing.push(t);
    groups.set(t.event_id, existing);
  }
  return [...groups.values()];
}

export default function TicketsPage() {
  const { member, loading } = useMember();
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>("valid");

  useEffect(() => {
    if (!loading && !member) router.push("/login");
  }, [loading, member, router]);

  useEffect(() => {
    if (!member) return;
    supabase
      .from("tickets")
      .select("*, events(name, location, event_time, end_time)")
      .eq("member_id", member.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setTickets((data as unknown as TicketWithEvent[]) ?? []));
  }, [member]);

  if (loading || !member) {
    return <p className="text-center text-foreground/60">Loading...</p>;
  }

  const categories: Category[] = ["valid", "pending", "expired", "used"];
  const byCategory: Record<Category, TicketWithEvent[]> = {
    valid: [],
    pending: [],
    expired: [],
    used: [],
  };
  for (const t of tickets) {
    const category = getCategory(t);
    if (category) byCategory[category].push(t);
  }

  const activeGroups = groupByEvent(byCategory[activeCategory]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">My Tickets</h1>

      <div className="flex gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium border ${
              activeCategory === category
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-foreground/60"
            }`}
          >
            {CATEGORY_LABELS[category]} ({byCategory[category].length})
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {activeGroups.map((group) => (
          <div key={group[0].event_id} className="flex flex-col gap-2">
            {group.length > 1 && (
              <p className="text-xs text-foreground/40 text-center">
                Swipe to see guest ticket &rarr;
              </p>
            )}
            <div className="no-scrollbar flex overflow-x-auto snap-x snap-mandatory gap-3 -mx-4 px-4">
              {group.map((t) => (
                <TicketCard
                  key={t.id}
                  ticket={t}
                  category={activeCategory}
                  holderName={t.guest_name ? `${t.guest_name} (Guest)` : member.name}
                />
              ))}
            </div>
          </div>
        ))}
        {activeGroups.length === 0 && (
          <p className="text-sm text-foreground/60">
            No {CATEGORY_LABELS[activeCategory].toLowerCase()} tickets.
          </p>
        )}
      </div>
    </div>
  );
}

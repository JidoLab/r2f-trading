import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { readFile } from "@/lib/github";

export const dynamic = "force-dynamic";

// All drip template keys and their target segments
const TEMPLATE_META: Record<string, { displayName: string; segments: string[] }> = {
  beginnerMistakes: { displayName: "Beginner Mistakes", segments: ["cold", "warm"] },
  ictConcepts: { displayName: "ICT Concepts", segments: ["cold"] },
  successStory: { displayName: "Success Story", segments: ["cold"] },
  coachingCta: { displayName: "Coaching CTA", segments: ["cold"] },
  socialProof: { displayName: "Social Proof", segments: ["warm", "hot"] },
  bookCallSoft: { displayName: "Book Call (Soft)", segments: ["warm"] },
  bookCallUrgent: { displayName: "Book Call (Urgent)", segments: ["hot"] },
  limitedSpots: { displayName: "Limited Spots", segments: ["warm", "hot"] },
};

interface TemplateStats {
  name: string;
  displayName: string;
  sentCount: number;
  segments: string[];
  openRate: string;
  clickRate: string;
}

interface OverallStats {
  totalSent: number;
  avgPerSub: string;
  completedAll: number;
  inProgress: number;
  totalSubscribers: number;
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let subscribers: Record<string, unknown>[] = [];
  try {
    const raw = await readFile("data/subscribers.json");
    subscribers = JSON.parse(raw);
  } catch {
    return NextResponse.json({
      templateStats: [],
      overallStats: { totalSent: 0, avgPerSub: "0", completedAll: 0, inProgress: 0, totalSubscribers: 0 },
    });
  }

  // Count per-template sends from dripsHistory
  const templateCounts: Record<string, number> = {};
  for (const key of Object.keys(TEMPLATE_META)) {
    templateCounts[key] = 0;
  }

  let totalDripsSent = 0;
  let completedAll = 0;
  let inProgress = 0;

  // Cold sequence has 4 drips, warm has 4, hot has 3
  // A subscriber who has sent all drips in their segment's sequence is "completed"
  const SEQUENCE_LENGTHS: Record<string, number> = { cold: 4, warm: 4, hot: 3 };

  for (const sub of subscribers) {
    const dripsHistory = (sub.dripsHistory as string[]) || [];
    const dripsSent = (sub.dripsSent as number) || dripsHistory.length || 0;
    const segment = (sub.segment as string) || "cold";

    totalDripsSent += dripsSent;

    // Count each template
    for (const templateKey of dripsHistory) {
      if (templateCounts[templateKey] !== undefined) {
        templateCounts[templateKey]++;
      } else {
        // Unknown template — still count it
        templateCounts[templateKey] = (templateCounts[templateKey] || 0) + 1;
      }
    }

    // Check completion
    const seqLen = SEQUENCE_LENGTHS[segment] || 4;
    if (dripsSent >= seqLen) {
      completedAll++;
    } else if (dripsSent > 0) {
      inProgress++;
    }
  }

  // Load email analytics for open/click rates
  let emailAnalytics: Record<string, {
    subjects: Record<string, { delivered: number; opened: number; clicked: number }>;
  }> = {};
  try {
    emailAnalytics = JSON.parse(await readFile("data/email-analytics.json"));
  } catch {}

  // Aggregate open/click rates per template by matching subject lines
  const SUBJECT_TO_TEMPLATE: Record<string, string> = {
    "3 mistakes killing your trading": "beginnerMistakes",
    "The ICT concepts that changed": "ictConcepts",
    "How one student went from": "successStory",
    "coaching spots": "coachingCta",
    "traders are saying": "socialProof",
    "Let's chat about your": "bookCallSoft",
    "Quick question for you": "bookCallUrgent",
    "spots left": "limitedSpots",
  };

  const templateOpenClicks: Record<string, { delivered: number; opened: number; clicked: number }> = {};
  for (const recipient of Object.values(emailAnalytics)) {
    for (const [subject, stats] of Object.entries(recipient.subjects || {})) {
      const subjectLower = subject.toLowerCase();
      for (const [keyword, templateKey] of Object.entries(SUBJECT_TO_TEMPLATE)) {
        if (subjectLower.includes(keyword.toLowerCase())) {
          if (!templateOpenClicks[templateKey]) templateOpenClicks[templateKey] = { delivered: 0, opened: 0, clicked: 0 };
          templateOpenClicks[templateKey].delivered += stats.delivered;
          templateOpenClicks[templateKey].opened += stats.opened;
          templateOpenClicks[templateKey].clicked += stats.clicked;
          break;
        }
      }
    }
  }

  // Build template stats with real open/click rates where available
  const templateStats: TemplateStats[] = Object.entries(TEMPLATE_META).map(([key, meta]) => {
    const analytics = templateOpenClicks[key];
    const delivered = analytics?.delivered || 0;
    const opened = analytics?.opened || 0;
    const clicked = analytics?.clicked || 0;

    return {
      name: key,
      displayName: meta.displayName,
      sentCount: templateCounts[key] || 0,
      segments: meta.segments,
      openRate: delivered > 0 ? `${Math.round((opened / delivered) * 100)}%` : "N/A",
      clickRate: delivered > 0 ? `${Math.round((clicked / delivered) * 100)}%` : "N/A",
    };
  });

  // Sort by sentCount descending
  templateStats.sort((a, b) => b.sentCount - a.sentCount);

  const overallStats: OverallStats = {
    totalSent: totalDripsSent,
    avgPerSub: subscribers.length > 0 ? (totalDripsSent / subscribers.length).toFixed(1) : "0",
    completedAll,
    inProgress,
    totalSubscribers: subscribers.length,
  };

  return NextResponse.json({ templateStats, overallStats });
}

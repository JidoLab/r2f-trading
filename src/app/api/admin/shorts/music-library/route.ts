import { NextRequest, NextResponse } from "next/server";
import { verifyAdminOrCron } from "@/lib/admin-auth";
import {
  loadMusicLibrary,
  saveMusicLibrary,
  newTrackId,
  normalizeTrackUrl,
  MusicMood,
  MusicTrack,
} from "@/lib/shorts-music";

export const maxDuration = 30;

const VALID_MOODS: MusicMood[] = ["hype", "chill", "cinematic", "suspense", "uplift"];

export async function GET(req: NextRequest) {
  const admin = await verifyAdminOrCron(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lib = await loadMusicLibrary();
  return NextResponse.json(lib);
}

/**
 * POST body:
 *   { action: "add", url: string, name: string, mood: MusicMood }
 *   { action: "toggle-track", id: string }
 *   { action: "toggle-library", enabled: boolean }
 *   { action: "delete", id: string }
 *   { action: "update-settings", baseVolumeDb?: number, duckRatio?: number }
 */
export async function POST(req: NextRequest) {
  const admin = await verifyAdminOrCron(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const lib = await loadMusicLibrary();

  switch (action) {
    case "add": {
      const url = normalizeTrackUrl(String(body.url || ""));
      const name = String(body.name || "").trim();
      const mood = VALID_MOODS.includes(body.mood) ? body.mood : "chill";
      if (!url || !name) {
        return NextResponse.json({ error: "url and name required" }, { status: 400 });
      }
      if (!/^https?:\/\//.test(url)) {
        return NextResponse.json({ error: "url must start with http(s)://" }, { status: 400 });
      }
      const id = newTrackId(url);
      if (lib.tracks.some((t) => t.id === id)) {
        return NextResponse.json({ error: "Track with this URL already exists" }, { status: 409 });
      }
      const track: MusicTrack = {
        id,
        url,
        name,
        mood,
        enabled: true,
        addedAt: new Date().toISOString(),
        usageCount: 0,
      };
      lib.tracks.push(track);
      await saveMusicLibrary(lib);
      return NextResponse.json({ track, library: lib });
    }

    case "toggle-track": {
      const id = String(body.id || "");
      const t = lib.tracks.find((x) => x.id === id);
      if (!t) return NextResponse.json({ error: "track not found" }, { status: 404 });
      t.enabled = !t.enabled;
      await saveMusicLibrary(lib);
      return NextResponse.json({ library: lib });
    }

    case "toggle-library": {
      lib.enabled = !!body.enabled;
      await saveMusicLibrary(lib);
      return NextResponse.json({ library: lib });
    }

    case "delete": {
      const id = String(body.id || "");
      lib.tracks = lib.tracks.filter((t) => t.id !== id);
      await saveMusicLibrary(lib);
      return NextResponse.json({ library: lib });
    }

    case "update-settings": {
      if (typeof body.baseVolumeDb === "number") {
        lib.baseVolumeDb = Math.max(-40, Math.min(0, body.baseVolumeDb));
      }
      if (typeof body.duckRatio === "number") {
        lib.duckRatio = Math.max(1, Math.min(20, body.duckRatio));
      }
      await saveMusicLibrary(lib);
      return NextResponse.json({ library: lib });
    }

    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
}

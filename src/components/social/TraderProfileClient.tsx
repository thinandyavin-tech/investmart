"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FeedSection } from "@/components/social/FeedSection";
import { useUser } from "@/lib/userContext";

interface TraderProfile {
  id:             string;
  name:           string | null;
  username:       string | null;
  bio:            string | null;
  cashThb:        number;
  createdAt:      string;
  postCount:      number;
  followerCount:  number;
  followingCount: number;
  tradeCount:     number;
  isFollowing:    boolean;
  isSelf:         boolean;
}

interface TraderProfileClientProps {
  username: string;
}

export function TraderProfileClient({ username }: TraderProfileClientProps) {
  const { user: viewer } = useUser();
  const [profile, setProfile]     = useState<TraderProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [following, setFollowing] = useState(false);
  const [follCount, setFollCount] = useState(0);
  const [busy, setBusy]           = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${encodeURIComponent(username)}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return; }
        const data = (await res.json()) as TraderProfile;
        setProfile(data);
        setFollowing(data.isFollowing);
        setFollCount(data.followerCount);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  async function toggleFollow() {
    if (!profile || busy) return;
    setBusy(true);
    const prev = following;
    setFollowing(!prev);
    setFollCount((c) => (prev ? c - 1 : c + 1));
    try {
      const res = await fetch(`/api/follow/${encodeURIComponent(username)}`, { method: "POST" });
      const data = (await res.json()) as { following?: boolean; followerCount?: number };
      if (res.ok) {
        setFollowing(data.following ?? !prev);
        setFollCount(data.followerCount ?? follCount);
      } else {
        setFollowing(prev);
        setFollCount((c) => (prev ? c + 1 : c - 1));
      }
    } catch {
      setFollowing(prev);
      setFollCount((c) => (prev ? c + 1 : c - 1));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-4" aria-busy="true">
        <div className="animate-pulse space-y-3">
          <div className="h-16 w-16 rounded-full bg-[#E8E2D4]" />
          <div className="h-4 w-32 bg-[#E8E2D4] rounded" />
          <div className="h-3 w-48 bg-[#E8E2D4] rounded" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-lg mx-auto p-4 text-center py-16">
        <p className="text-sm font-bold mb-1">ไม่พบผู้ใช้</p>
        <p className="text-xs text-[#8A8378] mb-4">@{username}</p>
        <Link href="/" className="text-xs text-[#8B5CF6] hover:underline">กลับหน้าหลัก</Link>
      </div>
    );
  }

  const displayName = profile.username ?? profile.name ?? "ผู้ใช้";
  const shortId     = `#${profile.id.slice(-4)}`;
  const initial     = (profile.name?.[0] ?? "U").toUpperCase();
  const isTrader    = profile.tradeCount > 0;

  return (
    <div className="max-w-lg mx-auto">
      {/* Profile header */}
      <div className="p-4 border-b border-[#E8E2D4]">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: "#5B8A2A" }}
            aria-hidden="true"
          >
            {initial}
          </div>

          {!profile.isSelf && viewer && (
            <button
              onClick={toggleFollow}
              disabled={busy}
              className={`px-4 py-1.5 text-xs font-bold border transition-colors disabled:opacity-40 ${
                following
                  ? "border-[#1F1A14] bg-[#F3EDE0] text-[#1F1A14] hover:bg-[#1F1A14] hover:text-white"
                  : "border-[#1F1A14] bg-[#1F1A14] text-white shadow-offset-lime"
              }`}
              aria-pressed={following}
            >
              {following ? "ติดตามอยู่" : "+ ติดตาม"}
            </button>
          )}
          {profile.isSelf && (
            <Link
              href="/profile/edit"
              className="px-4 py-1.5 text-xs font-bold border border-[#1F1A14] bg-[#F3EDE0] hover:bg-[#1F1A14] hover:text-white transition-colors"
            >
              แก้ไขโปรไฟล์
            </Link>
          )}
        </div>

        <p className="text-sm font-bold">{displayName}</p>
        <p className="text-[10px] text-[#8A8378]">{shortId}</p>

        {isTrader && (
          <span
            className="inline-block mt-1 text-[9px] px-1.5 py-0.5 font-bold border rounded-sm"
            style={{ borderColor: "#8B5CF6", color: "#8B5CF6" }}
          >
            TRADER
          </span>
        )}

        {profile.bio && (
          <p className="text-xs text-[#1F1A14] mt-2 leading-relaxed">{profile.bio}</p>
        )}

        <div className="flex gap-4 mt-3">
          {[
            { label: "โพสต์",   value: profile.postCount },
            { label: "ผู้ติดตาม", value: follCount },
            { label: "กำลังติดตาม", value: profile.followingCount },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-sm font-bold" style={{ fontFamily: "var(--font-mono)" }}>{value}</p>
              <p className="text-[9px] text-[#8A8378]">{label}</p>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-[#8A8378] mt-2">
          พอร์ตหุ้นอเมริกา ·{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {profile.cashThb.toLocaleString("th-TH")} ฿
          </span>
          {" "}· {profile.tradeCount} ออเดอร์
        </p>
      </div>

      {/* User's posts */}
      <FeedSection userId={profile.id} showComposer={false} />
    </div>
  );
}

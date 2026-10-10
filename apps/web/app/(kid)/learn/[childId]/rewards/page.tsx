"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  fetchPoints,
  fetchRedemptions,
  fetchRewards,
  PointsData,
  redeemReward,
  RedemptionData,
  RewardData,
} from "@/lib/api";

export default function KidRewardsPage() {
  const params = useParams<{ childId: string }>();
  const childId = params.childId;
  const [points, setPoints] = useState<PointsData | null>(null);
  const [rewards, setRewards] = useState<RewardData[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionData[]>([]);
  const [confirming, setConfirming] = useState<RewardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [pointsData, rewardData, redemptionData] = await Promise.all([
        fetchPoints(childId),
        fetchRewards(childId),
        fetchRedemptions(childId, "PENDING"),
      ]);
      setPoints(pointsData);
      setRewards(rewardData);
      setRedemptions(redemptionData);
    } catch {
      setError("Could not load rewards right now.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [childId]);

  async function handleRedeem() {
    if (!confirming) return;
    try {
      await redeemReward(childId, confirming.id);
      setConfirming(null);
      await load();
    } catch {
      setError("That reward could not be requested.");
    }
  }

  return (
    <main className="flex w-full flex-1 flex-col justify-center">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-waypoint">Your rewards</p>
          <h1 className="mt-1 font-display text-4xl text-ink">Save for something great</h1>
        </div>
        <p className="font-display text-2xl text-ink">⭐ {points?.balance ?? "—"}</p>
      </div>
      {error ? <p className="mb-4 rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral-deep">{error}</p> : null}
      {rewards.length === 0 ? (
        <div className="rounded-3xl bg-card px-6 py-8 text-ink-soft">Your parent has not added a reward yet.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rewards.map((reward) => {
            const pending = redemptions.some((item) => item.rewardId === reward.id);
            const affordable = (points?.balance ?? 0) >= reward.cost;
            return (
              <article key={reward.id} className="rounded-3xl bg-card px-5 py-5 shadow-[0_8px_28px_rgba(46,42,92,0.07)]">
                <div className="text-4xl">{reward.emoji}</div>
                <h2 className="mt-3 font-display text-2xl text-ink">{reward.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">{reward.cost} ⭐</p>
                <button
                  type="button"
                  disabled={!affordable || pending}
                  onClick={() => setConfirming(reward)}
                  className="btn-tactile btn-primary mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
                >
                  {pending ? "Waiting for parent…" : affordable ? "Ask for it" : `Need ${reward.cost - (points?.balance ?? 0)} more ⭐`}
                </button>
              </article>
            );
          })}
        </div>
      )}
      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-6">
          <div className="w-full max-w-sm rounded-3xl bg-card px-6 py-6">
            <p className="font-display text-2xl text-ink">Use {confirming.cost} ⭐ for {confirming.name}?</p>
            <p className="mt-2 text-sm leading-6 text-ink-soft">Your parent will be asked to approve it.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setConfirming(null)} className="btn-tactile flex-1 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-ink">Not yet</button>
              <button type="button" onClick={() => void handleRedeem()} className="btn-tactile btn-primary flex-1 rounded-xl px-4 py-3 text-sm font-semibold">Ask for it</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

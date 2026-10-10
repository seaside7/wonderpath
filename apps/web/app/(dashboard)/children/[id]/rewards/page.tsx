"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ChildProfile,
  createReward,
  getChild,
  fetchPoints,
  fetchRedemptions,
  fetchRewards,
  PointsData,
  RedemptionData,
  resolveRedemption,
  RewardData,
  setPointGoal,
} from "@/lib/api";

const SUGGESTIONS = [
  ["Pick the weekend movie", "🎬", 300],
  ["Park trip", "🌳", 500],
  ["Extra 30 min play time", "⏰", 250],
  ["Ice cream", "🍦", 180],
] as const;

export default function ParentRewardsPage() {
  const params = useParams<{ id: string }>();
  const childId = params.id;
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [points, setPoints] = useState<PointsData | null>(null);
  const [rewards, setRewards] = useState<RewardData[]>([]);
  const [requests, setRequests] = useState<RedemptionData[]>([]);
  const [period, setPeriod] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [target, setTarget] = useState(500);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [childData, pointsData, rewardData, requestData] = await Promise.all([
        getChild(childId),
        fetchPoints(childId),
        fetchRewards(childId),
        fetchRedemptions(childId, "PENDING"),
      ]);
      setChild(childData);
      setPoints(pointsData);
      setRewards(rewardData);
      setRequests(requestData);
      if (pointsData.goal) {
        setPeriod(pointsData.goal.period);
        setTarget(pointsData.goal.target);
      }
    } catch {
      setError("Could not load goals and rewards.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [childId]);

  async function saveGoal() {
    try {
      await setPointGoal(childId, { period, targetPoints: target });
      await load();
    } catch {
      setError("Could not save the goal.");
    }
  }

  async function addReward(name: string, emoji: string, cost: number) {
    try {
      await createReward(childId, { name, emoji, cost });
      await load();
    } catch {
      setError("Could not add that reward.");
    }
  }

  async function resolve(id: string, action: "approve" | "decline") {
    try {
      await resolveRedemption(id, action);
      await load();
    } catch {
      setError("That request was already resolved or could not be updated.");
    }
  }

  return (
    <main>
      <h1 className="font-display text-4xl text-ink">Goals &amp; rewards</h1>
      <p className="mt-2 text-ink-soft">Set a target and make learning effort feel visible for {child?.nickname ?? child?.fullName ?? "your child"}.</p>
      {error ? <p className="mt-4 rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral-deep">{error}</p> : null}
      <section className="mt-8 rounded-3xl bg-card px-6 py-6">
        <h2 className="font-display text-2xl text-ink">Point goal</h2>
        <p className="mt-1 text-sm text-ink-soft">A 15-minute session earns about 100–130 ⭐.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((option) => (
            <button key={option} type="button" onClick={() => setPeriod(option)} className={`btn-tactile rounded-xl border-2 px-4 py-2 text-sm font-semibold ${period === option ? "border-coral bg-coral/10" : "border-line"}`}>
              {option[0] + option.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <input type="number" min={1} max={100000} value={target} onChange={(event) => setTarget(Number(event.target.value))} className="field-glow w-36 px-3 py-2" />
          <button type="button" onClick={() => void saveGoal()} className="btn-tactile btn-primary rounded-xl px-4 py-2 text-sm font-semibold">Save goal</button>
        </div>
        {points?.goal ? <p className="mt-3 text-sm text-ink-soft">Progress: {points.goal.progress} / {points.goal.target} ⭐</p> : null}
      </section>
      <section className="mt-6 rounded-3xl bg-card px-6 py-6">
        <h2 className="font-display text-2xl text-ink">Rewards</h2>
        <p className="mt-1 text-sm text-ink-soft">Experiences and time together make strong default rewards.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map(([name, emoji, cost]) => <button key={name} type="button" onClick={() => void addReward(name, emoji, cost)} className="btn-tactile rounded-xl border border-line px-4 py-3 text-left text-sm font-semibold text-ink">{emoji} {name} · {cost} ⭐</button>)}
        </div>
        <ul className="mt-5 space-y-2">{rewards.map((reward) => <li key={reward.id} className="flex items-center justify-between border-b border-line py-3 text-sm"><span>{reward.emoji} {reward.name}</span><span className="font-semibold">{reward.cost} ⭐</span></li>)}</ul>
      </section>
      <section className="mt-6 rounded-3xl bg-card px-6 py-6">
        <h2 className="font-display text-2xl text-ink">Requests</h2>
        {requests.length === 0 ? <p className="mt-3 text-sm text-ink-soft">No pending requests.</p> : <ul className="mt-3 space-y-3">{requests.map((request) => <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3"><span>{request.reward.emoji} {request.reward.name} · {request.cost} ⭐</span><span className="flex gap-2"><button type="button" onClick={() => void resolve(request.id, "approve")} className="btn-tactile rounded-lg bg-trail px-3 py-2 text-xs font-semibold">Approve</button><button type="button" onClick={() => void resolve(request.id, "decline")} className="btn-tactile rounded-lg border border-line px-3 py-2 text-xs font-semibold">Decline</button></span></li>)}</ul>}
      </section>
    </main>
  );
}

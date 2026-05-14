"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Plus,
  Wrench,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  TrendingUp,
  Layers,
  DollarSign,
  AlertTriangle,
  Clock,
  Users,
  Trash2,
  Coins,
} from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { AppShell } from "@/components/AppShell";
import { TopStrip } from "@/components/TopStrip";
import { StatTile } from "@/components/BentoTiles";
import { useAdmin } from "@/hooks/useAdmin";
import { useAdminActions } from "@/hooks/useAdminActions";
import { useMarkets } from "@/hooks/useMarkets";
import { useFees } from "@/hooks/useFees";
import { fmtUSD, fmtDate, timeUntil, CATEGORY_META } from "@/lib/format";
import { MarketStatus } from "@/lib/contracts";

const ARC_EXPLORER = "https://testnet.arcscan.app";

type Tab = "create" | "manage" | "curators" | "fees";

export default function AdminPage() {
  const { isConnected } = useAccount();
  const { isOwner, isCurator, isAuthorized, ownerAddress, isLoading: adminLoading } = useAdmin();
  const [tab, setTab] = useState<Tab>("create");

  if (!isConnected) {
    return (
      <AppShell>
        <TopStrip />
        <NotConnectedState />
      </AppShell>
    );
  }

  if (adminLoading) {
    return (
      <AppShell>
        <TopStrip />
        <main className="px-6 py-6 max-w-[1400px] mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 size={24} className="ink-3 animate-spin mb-3" />
            <div className="text-[12px] ink-3 font-mono">Verifying admin access...</div>
          </div>
        </main>
      </AppShell>
    );
  }

  if (!isAuthorized) {
    return (
      <AppShell>
        <TopStrip />
        <NotAuthorizedState ownerAddress={ownerAddress} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopStrip />

      <main className="px-6 py-6 max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start justify-between gap-4 flex-wrap"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} style={{ color: "#A855F7" }} />
              <h1 className="font-display text-3xl font-bold tracking-tight">Admin</h1>
            </div>
            <p className="ink-2 text-[13px]">
              Create new markets, resolve ended ones, manage curators, and collect fees.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isOwner && (
              <span
                className="pill"
                style={{
                  borderColor: "rgba(168, 85, 247, 0.4)",
                  color: "#A855F7",
                  background: "rgba(168, 85, 247, 0.08)",
                }}
              >
                <Shield size={10} />
                Owner
              </span>
            )}
            {isCurator && !isOwner && (
              <span
                className="pill"
                style={{
                  borderColor: "rgba(34, 211, 238, 0.4)",
                  color: "#22D3EE",
                  background: "rgba(34, 211, 238, 0.08)",
                }}
              >
                <Wrench size={10} />
                Curator
              </span>
            )}
          </div>
        </motion.div>

        <AdminStats />

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-lg mt-6 mb-4 w-fit overflow-x-auto"
          style={{ background: "rgb(var(--surface-2))" }}
        >
          <TabButton tab="create" current={tab} onClick={setTab} icon={Plus} label="Create market" />
          <TabButton tab="manage" current={tab} onClick={setTab} icon={Wrench} label="Manage markets" />
          {/* Curators + Fees are owner-only */}
          {isOwner && (
            <>
              <TabButton tab="curators" current={tab} onClick={setTab} icon={Users} label="Curators" />
              <TabButton tab="fees" current={tab} onClick={setTab} icon={Coins} label="Fees" />
            </>
          )}
        </div>

        {tab === "create" && <CreateMarketForm />}
        {tab === "manage" && <ManageMarketsPanel />}
        {tab === "curators" && isOwner && <CuratorsPanel />}
        {tab === "fees" && isOwner && <FeesPanel />}
      </main>
    </AppShell>
  );
}

function TabButton({
  tab,
  current,
  onClick,
  icon: Icon,
  label,
}: {
  tab: Tab;
  current: Tab;
  onClick: (t: Tab) => void;
  icon: any;
  label: string;
}) {
  const active = tab === current;
  return (
    <button
      onClick={() => onClick(tab)}
      className="px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap"
      style={{
        background: active ? "rgb(var(--surface))" : "transparent",
        color: active ? "rgb(var(--ink))" : "rgb(var(--ink-3))",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
      }}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

// ============ STATS DASHBOARD ============

function AdminStats() {
  const { markets, count } = useMarkets();

  const totalLiquidity = markets.reduce((sum, m) => sum + m.liquidity, 0);
  const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0);
  const openCount = markets.filter((m) => !m.resolution).length;
  const resolvedCount = markets.filter((m) => m.resolution).length;
  const endedNotResolved = markets.filter(
    (m) => !m.resolution && m.endsAt < Date.now()
  ).length;

  return (
    <section className="bento">
      <div className="col-span-3 lg:col-span-3 sm:col-span-1">
        <StatTile
          label="Total Markets"
          value={String(count)}
          sub={`${openCount} open · ${resolvedCount} resolved`}
          icon={<Layers size={11} className="ink-3" />}
        />
      </div>
      <div className="col-span-3 lg:col-span-3 sm:col-span-1">
        <StatTile
          label="Total Liquidity"
          value={fmtUSD(totalLiquidity)}
          sub="Across pools"
          icon={<DollarSign size={11} className="ink-3" />}
          accent="#22D3EE"
        />
      </div>
      <div className="col-span-3 lg:col-span-3 sm:col-span-1">
        <StatTile
          label="Outstanding Vol"
          value={fmtUSD(totalVolume)}
          sub="In active shares"
          icon={<TrendingUp size={11} className="ink-3" />}
        />
      </div>
      <div className="col-span-3 lg:col-span-3 sm:col-span-1">
        <StatTile
          label="Awaiting Resolution"
          value={String(endedNotResolved)}
          sub="Past end date"
          icon={<AlertTriangle size={11} className="ink-3" />}
          accent={endedNotResolved > 0 ? "#F59E0B" : undefined}
        />
      </div>
    </section>
  );
}

// ============ CREATE MARKET FORM ============

function CreateMarketForm() {
  const { step, createMarket, reset } = useAdminActions();
  const { refetch: refetchMarkets } = useMarkets();

  const [question, setQuestion] = useState("");
  const [criteria, setCriteria] = useState("");
  const [category, setCategory] = useState("crypto");
  const [endsAt, setEndsAt] = useState("");
  const [liquidity, setLiquidity] = useState("500");

  const isWorking =
    step.kind === "checking_allowance" ||
    step.kind === "approving" ||
    step.kind === "creating";

  const isValid =
    question.length >= 10 &&
    criteria.length >= 20 &&
    !!endsAt &&
    new Date(endsAt).getTime() > Date.now() &&
    parseFloat(liquidity) >= 100;

  useEffect(() => {
    if (step.kind !== "success") return;
    if (step.action !== "create") return;
    const t = setTimeout(() => refetchMarkets(), 500);
    return () => clearTimeout(t);
  }, [step, refetchMarkets]);

  const handleSubmit = () => {
    if (!isValid) return;
    const endsAtSec = Math.floor(new Date(endsAt).getTime() / 1000);
    createMarket({
      question,
      resolutionCriteria: criteria,
      category,
      endsAt: endsAtSec,
      initialLiquidity: liquidity,
    });
  };

  const handleReset = () => {
    setQuestion("");
    setCriteria("");
    setCategory("crypto");
    setEndsAt("");
    setLiquidity("500");
    reset();
  };

  const minDate = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5">
      <div className="tile p-6">
        <div className="space-y-5">
          <div>
            <label className="label-overline mb-2 block">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will Bitcoin close above $200,000 by end of 2026?"
              maxLength={140}
              disabled={isWorking}
              className="input"
            />
            <div className="flex items-center justify-between mt-1.5">
              <div className="text-[11px] ink-3">Phrase as a yes/no question. Be specific.</div>
              <div className="text-[10.5px] font-mono ink-3">{question.length}/140</div>
            </div>
          </div>

          <div>
            <label className="label-overline mb-2 block">Resolution criteria</label>
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="Resolves YES if BTC/USD spot closes above $200,000 on December 31, 2026 (UTC) per Coinbase exchange data."
              rows={4}
              maxLength={500}
              disabled={isWorking}
              className="input resize-none"
              style={{ fontFamily: "Inter Tight, sans-serif" }}
            />
            <div className="flex items-center justify-between mt-1.5">
              <div className="text-[11px] ink-3 leading-relaxed max-w-md">
                Spell out exactly when this resolves YES, when NO, and what data source you'll use.
              </div>
              <div className="text-[10.5px] font-mono ink-3">{criteria.length}/500</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-overline mb-2 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isWorking}
                className="input cursor-pointer"
              >
                <option value="crypto">Crypto</option>
                <option value="arc">Arc</option>
                <option value="macro">Macro</option>
                <option value="tech">Tech</option>
                <option value="politics">Politics</option>
                <option value="sports">Sports</option>
                <option value="culture">Culture</option>
                <option value="science">Science</option>
              </select>
            </div>
            <div>
              <label className="label-overline mb-2 block">End date & time (UTC)</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                min={minDate}
                disabled={isWorking}
                className="input"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>

          <div>
            <label className="label-overline mb-2 block">Initial liquidity (USDC)</label>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border"
              style={{ borderColor: "rgb(var(--line))", background: "rgb(var(--surface-2))" }}
            >
              <input
                type="text"
                value={liquidity}
                onChange={(e) => setLiquidity(e.target.value.replace(/[^0-9.]/g, ""))}
                disabled={isWorking}
                className="flex-1 bg-transparent outline-none font-display text-2xl font-semibold"
              />
              <div className="flex items-center gap-1.5">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "#2775CA" }}
                >
                  $
                </span>
                <span className="font-mono font-semibold text-sm">USDC</span>
              </div>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[100, 250, 500, 1000, 2500].map((v) => (
                <button
                  key={v}
                  onClick={() => setLiquidity(String(v))}
                  disabled={isWorking}
                  className="flex-1 py-1.5 rounded-md text-[11px] font-mono ink-2 hover:text-ink transition-colors"
                  style={{ background: "rgb(var(--surface-2))" }}
                >
                  ${v}
                </button>
              ))}
            </div>
            <div className="text-[11px] ink-3 mt-2 leading-relaxed">
              Minimum $100. Seeds both YES and NO sides. You'll sign two transactions (approve +
              create).
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={!isValid || isWorking}
              className="btn btn-primary flex-1 py-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {step.kind === "checking_allowance" && <Loader2 size={14} className="animate-spin" />}
              {step.kind === "approving" && <Loader2 size={14} className="animate-spin" />}
              {step.kind === "creating" && <Loader2 size={14} className="animate-spin" />}
              {step.kind === "checking_allowance"
                ? "Checking..."
                : step.kind === "approving"
                ? "Approving USDC..."
                : step.kind === "creating"
                ? "Creating market..."
                : "Create market"}
            </button>
            {(step.kind === "success" || step.kind === "error") && (
              <button onClick={handleReset} className="btn">
                {step.kind === "success" ? "Create another" : "Reset"}
              </button>
            )}
          </div>

          <StepFeedback step={step} />
        </div>
      </div>

      <div>
        <div className="label-overline mb-2">Live preview</div>
        <div className="tile p-5 sticky top-20">
          <div className="flex items-center gap-2 mb-3">
            {category && CATEGORY_META[category] && (
              <span
                className="pill"
                style={{
                  borderColor: CATEGORY_META[category].color + "40",
                  color: CATEGORY_META[category].color,
                  background: CATEGORY_META[category].color + "10",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: CATEGORY_META[category].color }}
                />
                {CATEGORY_META[category].label}
              </span>
            )}
            {endsAt && new Date(endsAt).getTime() > Date.now() && (
              <span className="pill">
                <Clock size={9} />
                {timeUntil(new Date(endsAt).getTime())}
              </span>
            )}
          </div>
          <h3 className="font-display font-semibold text-[15.5px] leading-snug min-h-[44px]">
            {question || (
              <span className="ink-3 italic font-normal">Your question appears here</span>
            )}
          </h3>
          <div className="mt-4">
            <div className="font-display text-3xl font-bold leading-none mb-3">
              50<span className="text-base ink-3 font-medium ml-0.5">%</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="px-3 py-1.5 rounded-md text-center text-[11.5px] font-bold"
                style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.2)" }}
              >
                YES 50¢
              </div>
              <div
                className="px-3 py-1.5 rounded-md text-center text-[11.5px] font-bold"
                style={{ background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
              >
                NO 50¢
              </div>
            </div>
            <div className="flex justify-between mt-3 text-[10.5px] ink-3 font-mono">
              <span>Vol $0</span>
              <span>Liq ${parseFloat(liquidity || "0").toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ MANAGE MARKETS PANEL ============

function ManageMarketsPanel() {
  const { markets, isLoading, refetch } = useMarkets();
  const { step, resolveMarket, reset } = useAdminActions();
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...markets].sort((a, b) => {
      const aEnded = !a.resolution && a.endsAt < Date.now();
      const bEnded = !b.resolution && b.endsAt < Date.now();
      if (aEnded && !bEnded) return -1;
      if (!aEnded && bEnded) return 1;
      const aOpen = !a.resolution;
      const bOpen = !b.resolution;
      if (aOpen && !bOpen) return -1;
      if (!aOpen && bOpen) return 1;
      return a.endsAt - b.endsAt;
    });
  }, [markets]);

  const handleResolve = async (marketId: string, status: MarketStatus) => {
    setResolvingId(marketId);
    await resolveMarket(marketId, status);
    refetch();
  };

  useEffect(() => {
    if (step.kind !== "success") return;
    if (step.action !== "resolve") return;
    const t = setTimeout(() => {
      setResolvingId(null);
      reset();
    }, 3000);
    return () => clearTimeout(t);
  }, [step, reset]);

  if (isLoading && markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={20} className="ink-3 animate-spin mb-3" />
        <div className="text-[12px] ink-3 font-mono">Loading markets...</div>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="tile p-12 text-center">
        <div className="font-display text-lg font-semibold mb-1">No markets yet</div>
        <div className="text-[13px] ink-2">Switch to the Create tab to deploy your first one.</div>
      </div>
    );
  }

  return (
    <div className="tile overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: "rgb(var(--line))" }}
      >
        <div className="label-overline">All markets</div>
        <div className="text-[11px] font-mono ink-3">{markets.length} total</div>
      </div>
      <div>
        {sorted.map((m) => {
          const ended = m.endsAt < Date.now();
          const isResolved = !!m.resolution;
          const cat = CATEGORY_META[m.category];
          const isCurrentlyResolving = resolvingId === m.id;

          let statusBadge: { color: string; label: string };
          if (isResolved) {
            statusBadge =
              m.resolution === "yes"
                ? { color: "#10B981", label: "Resolved YES" }
                : { color: "#EF4444", label: "Resolved NO" };
          } else if (ended) {
            statusBadge = { color: "#F59E0B", label: "Awaiting resolution" };
          } else {
            statusBadge = { color: "#22D3EE", label: "Open" };
          }

          return (
            <div
              key={m.id}
              className="px-5 py-4 border-b"
              style={{ borderColor: "rgb(var(--line))" }}
            >
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className="pill"
                      style={{
                        borderColor: cat.color + "40",
                        color: cat.color,
                        background: cat.color + "10",
                      }}
                    >
                      {cat.label}
                    </span>
                    <span
                      className="pill"
                      style={{
                        borderColor: statusBadge.color + "40",
                        color: statusBadge.color,
                        background: statusBadge.color + "10",
                      }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                  <div className="font-display font-semibold text-[14px] line-clamp-1">
                    {m.question}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] ink-3 font-mono flex-wrap">
                    <span>Ends {fmtDate(m.endsAt)}</span>
                    <span>·</span>
                    <span>Liq {fmtUSD(m.liquidity)}</span>
                    <span>·</span>
                    <a
                      href={`${ARC_EXPLORER}/address/${m.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ink flex items-center gap-1"
                    >
                      {m.id.slice(0, 6)}…{m.id.slice(-4)}
                      <ExternalLink size={9} />
                    </a>
                  </div>
                </div>
                {ended && !isResolved && (
                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                    <button
                      onClick={() => handleResolve(m.id, MarketStatus.RESOLVED_YES)}
                      disabled={isCurrentlyResolving}
                      className="btn btn-sm btn-yes disabled:opacity-60"
                    >
                      {isCurrentlyResolving && step.kind === "resolving" ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        "Resolve YES"
                      )}
                    </button>
                    <button
                      onClick={() => handleResolve(m.id, MarketStatus.RESOLVED_NO)}
                      disabled={isCurrentlyResolving}
                      className="btn btn-sm btn-no disabled:opacity-60"
                    >
                      Resolve NO
                    </button>
                    <button
                      onClick={() => handleResolve(m.id, MarketStatus.RESOLVED_INVALID)}
                      disabled={isCurrentlyResolving}
                      className="btn btn-sm disabled:opacity-60"
                      title="Refunds users pro-rata if the question turned out to be ambiguous"
                    >
                      Invalid
                    </button>
                  </div>
                )}
                {!ended && !isResolved && (
                  <div className="text-[11px] ink-3 font-mono flex-shrink-0">
                    Resolves in {timeUntil(m.endsAt)}
                  </div>
                )}
              </div>
              {isCurrentlyResolving && (
                <div className="mt-3">
                  <StepFeedback step={step} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ CURATORS PANEL ============

interface CuratorEntry {
  address: string;
  addedAt: number; // ms timestamp from localStorage
}

const CURATORS_STORAGE_KEY = "arcmarkets:admin:curators";

function loadCuratorsList(): CuratorEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CURATORS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveCuratorsList(list: CuratorEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CURATORS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function CuratorsPanel() {
  const { step, addCurator, removeCurator, reset } = useAdminActions();
  const [newAddress, setNewAddress] = useState("");
  const [curatorList, setCuratorList] = useState<CuratorEntry[]>([]);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  useEffect(() => {
    setCuratorList(loadCuratorsList());
  }, []);

  // After successful add/remove, refresh list and clear input
  useEffect(() => {
    if (step.kind !== "success") return;
    if (step.action === "add_curator") {
      // Add to local list (we don't have an on-chain enumeration of curators)
      const addr = activeAction;
      if (addr) {
        const updated = [
          { address: addr.toLowerCase(), addedAt: Date.now() },
          ...curatorList.filter((c) => c.address.toLowerCase() !== addr.toLowerCase()),
        ];
        setCuratorList(updated);
        saveCuratorsList(updated);
        setNewAddress("");
      }
    } else if (step.action === "remove_curator") {
      const addr = activeAction;
      if (addr) {
        const updated = curatorList.filter(
          (c) => c.address.toLowerCase() !== addr.toLowerCase()
        );
        setCuratorList(updated);
        saveCuratorsList(updated);
      }
    }
    const t = setTimeout(() => {
      setActiveAction(null);
      reset();
    }, 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.kind]);

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(newAddress.trim());
  const isWorking = step.kind === "adding_curator" || step.kind === "removing_curator";

  const handleAdd = () => {
    if (!isValidAddress) return;
    setActiveAction(newAddress.trim());
    addCurator(newAddress.trim());
  };

  const handleRemove = (addr: string) => {
    setActiveAction(addr);
    removeCurator(addr);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5">
      <div className="tile overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: "rgb(var(--line))" }}
        >
          <div className="flex items-center gap-2">
            <Users size={14} className="ink-2" />
            <span className="label-overline">Tracked curators</span>
          </div>
          <span className="text-[11px] font-mono ink-3">
            {curatorList.length} {curatorList.length === 1 ? "address" : "addresses"}
          </span>
        </div>

        {curatorList.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-[13px] ink-2 font-medium mb-1">No curators added yet</div>
            <div className="text-[11.5px] ink-3 max-w-md mx-auto leading-relaxed">
              Add a wallet address on the right to grant curator permissions. Curators can create
              and resolve markets, but can't add/remove other curators or collect fees.
            </div>
          </div>
        ) : (
          <div>
            {curatorList.map((c) => {
              const isCurrentlyRemoving =
                activeAction?.toLowerCase() === c.address.toLowerCase() &&
                step.kind === "removing_curator";
              return (
                <div
                  key={c.address}
                  className="flex items-center gap-3 px-5 py-3 border-b"
                  style={{ borderColor: "rgb(var(--line))" }}
                >
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgb(var(--surface-2))",
                      border: "1px solid rgb(var(--line))",
                    }}
                  >
                    <Wrench size={12} className="ink-2" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={`${ARC_EXPLORER}/address/${c.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[12px] hover:underline truncate block"
                    >
                      {c.address}
                    </a>
                    <div className="text-[10.5px] ink-3 font-mono mt-0.5">
                      Added {new Date(c.addedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(c.address)}
                    disabled={isWorking}
                    className="btn btn-sm disabled:opacity-60"
                    style={{ color: "#EF4444" }}
                    title="Remove curator"
                  >
                    {isCurrentlyRemoving ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={11} />
                        Remove
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {(step.kind === "success" &&
          (step.action === "add_curator" || step.action === "remove_curator")) ||
        step.kind === "error" ? (
          <div className="px-5 py-3 border-t" style={{ borderColor: "rgb(var(--line))" }}>
            <StepFeedback step={step} />
          </div>
        ) : null}
      </div>

      <div>
        <div className="label-overline mb-2">Add curator</div>
        <div className="tile p-5">
          <p className="text-[12px] ink-2 leading-relaxed mb-4">
            Curators can create and resolve markets. Only the owner can manage curators.
          </p>

          <label className="label-overline mb-2 block">Wallet address</label>
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value.trim())}
            placeholder="0x..."
            disabled={isWorking}
            className="input font-mono text-[12px] mb-3"
          />

          <button
            onClick={handleAdd}
            disabled={!isValidAddress || isWorking}
            className="btn btn-primary w-full py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {step.kind === "adding_curator" ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus size={12} />
                Add curator
              </>
            )}
          </button>

          <div
            className="rounded-lg p-3 text-[11px] ink-2 leading-relaxed mt-4"
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
            }}
          >
            <strong className="font-semibold">Heads up:</strong> The list of curators above is
            tracked in your browser's localStorage, not on-chain. The actual permission lives on
            the contract — clearing this list locally doesn't revoke their curator role. To revoke,
            click Remove, which calls{" "}
            <code className="font-mono text-[10.5px]">factory.removeCurator()</code> on-chain.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ FEES PANEL ============

function FeesPanel() {
  const { markets } = useMarkets();
  const { fees, totalCollectableUsdc, marketsWithFees, isLoading, refetch } = useFees(markets);
  const { step, collectFees, reset } = useAdminActions();
  const [collectingId, setCollectingId] = useState<string | null>(null);

  const handleCollect = async (marketAddr: string) => {
    setCollectingId(marketAddr);
    await collectFees(marketAddr);
    refetch();
  };

  useEffect(() => {
    if (step.kind !== "success") return;
    if (step.action !== "collect_fees") return;
    const t = setTimeout(() => {
      setCollectingId(null);
      reset();
    }, 3000);
    return () => clearTimeout(t);
  }, [step, reset]);

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <section className="bento">
        <div className="col-span-4 lg:col-span-4 sm:col-span-2">
          <StatTile
            label="Total Collectable"
            value={fmtUSD(totalCollectableUsdc)}
            sub="USDC accumulated across all markets"
            icon={<Coins size={11} className="ink-3" />}
            accent={totalCollectableUsdc > 0 ? "#10B981" : undefined}
          />
        </div>
        <div className="col-span-4 lg:col-span-4 sm:col-span-2">
          <StatTile
            label="Markets with Fees"
            value={String(marketsWithFees)}
            sub={`Of ${fees.length} total`}
            icon={<Layers size={11} className="ink-3" />}
          />
        </div>
        <div className="col-span-4 lg:col-span-4 sm:col-span-2">
          <StatTile
            label="Fee Rate"
            value="2.00%"
            sub="200 BPS per trade"
            icon={<TrendingUp size={11} className="ink-3" />}
          />
        </div>
      </section>

      {/* Fees table */}
      <div className="tile overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: "rgb(var(--line))" }}
        >
          <div className="flex items-center gap-2">
            <Coins size={14} className="ink-2" />
            <span className="label-overline">Per-market fees</span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="btn btn-sm"
          >
            {isLoading ? <Loader2 size={11} className="animate-spin" /> : "Refresh"}
          </button>
        </div>

        {isLoading && fees.length === 0 ? (
          <div className="p-10 text-center">
            <Loader2 size={18} className="ink-3 animate-spin mx-auto mb-2" />
            <div className="text-[12px] ink-3 font-mono">Reading fee balances...</div>
          </div>
        ) : fees.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-[13px] ink-2">No markets to display</div>
          </div>
        ) : (
          <div>
            {fees.map((f) => {
              const hasFees = f.accumulatedFees > 0n;
              const isCurrentlyCollecting =
                collectingId === f.market.id && step.kind === "collecting_fees";
              const cat = CATEGORY_META[f.market.category];

              return (
                <div
                  key={f.market.id}
                  className="px-5 py-3.5 border-b"
                  style={{
                    borderColor: "rgb(var(--line))",
                    opacity: hasFees ? 1 : 0.55,
                  }}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="pill"
                          style={{
                            borderColor: cat.color + "40",
                            color: cat.color,
                            background: cat.color + "10",
                          }}
                        >
                          {cat.label}
                        </span>
                        {f.market.resolution && (
                          <span
                            className="pill"
                            style={{ borderColor: "rgb(var(--line))", color: "rgb(var(--ink-3))" }}
                          >
                            Resolved
                          </span>
                        )}
                      </div>
                      <div className="font-display font-semibold text-[13.5px] line-clamp-1">
                        {f.market.question}
                      </div>
                      <a
                        href={`${ARC_EXPLORER}/address/${f.market.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10.5px] font-mono ink-3 hover:text-ink mt-0.5 inline-flex items-center gap-1"
                      >
                        {f.market.id.slice(0, 6)}…{f.market.id.slice(-4)}
                        <ExternalLink size={9} />
                      </a>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div
                        className="font-mono text-[15px] font-bold"
                        style={{ color: hasFees ? "#10B981" : "rgb(var(--ink-3))" }}
                      >
                        {hasFees ? "+" : ""}
                        ${f.accumulatedFeesUsdc.toFixed(2)}
                      </div>
                      <div className="text-[10.5px] font-mono ink-3 mt-0.5">USDC pending</div>
                    </div>

                    <button
                      onClick={() => handleCollect(f.market.id)}
                      disabled={!hasFees || isCurrentlyCollecting || step.kind === "collecting_fees"}
                      className="btn btn-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={
                        hasFees
                          ? {
                              background: "rgba(16, 185, 129, 0.12)",
                              color: "#10B981",
                              borderColor: "rgba(16, 185, 129, 0.35)",
                            }
                          : undefined
                      }
                    >
                      {isCurrentlyCollecting ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          Collecting...
                        </>
                      ) : (
                        <>
                          <Coins size={11} />
                          Collect
                        </>
                      )}
                    </button>
                  </div>

                  {isCurrentlyCollecting && (
                    <div className="mt-3">
                      <StepFeedback step={step} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step.kind === "success" && step.action === "collect_fees" && !collectingId && (
          <div className="px-5 py-3 border-t" style={{ borderColor: "rgb(var(--line))" }}>
            <StepFeedback step={step} />
          </div>
        )}
      </div>

      <div
        className="rounded-lg p-3 text-[11.5px] ink-2 leading-relaxed"
        style={{
          background: "rgba(34, 211, 238, 0.05)",
          border: "1px solid rgba(34, 211, 238, 0.2)",
        }}
      >
        <strong className="font-semibold">How this works:</strong> Each trade accumulates a 2%
        fee in the market contract. Click "Collect" to call{" "}
        <code className="font-mono text-[10.5px]">factory.collectFees(marketAddr)</code> — this
        pulls the fees from the market into the factory, where the owner can withdraw them. Only
        the factory owner can collect fees.
      </div>
    </div>
  );
}

// ============ STEP FEEDBACK ============

function StepFeedback({ step }: { step: ReturnType<typeof useAdminActions>["step"] }) {
  if (step.kind === "idle") return null;

  if (step.kind === "error") {
    return (
      <div
        className="p-2.5 rounded-lg text-[11.5px] flex items-start gap-2"
        style={{
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.25)",
          color: "#EF4444",
        }}
      >
        <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
        <span className="break-words">{step.message}</span>
      </div>
    );
  }

  if (step.kind === "success") {
    const labelMap: Record<string, string> = {
      create: "Market created!",
      resolve: "Market resolved!",
      add_curator: "Curator added!",
      remove_curator: "Curator removed!",
      collect_fees: "Fees collected!",
    };
    return (
      <div
        className="p-2.5 rounded-lg text-[11.5px] flex items-center gap-2"
        style={{
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          color: "#10B981",
        }}
      >
        <CheckCircle2 size={12} className="flex-shrink-0" />
        <span className="flex-1">{labelMap[step.action] ?? "Success!"}</span>
        <a
          href={`${ARC_EXPLORER}/tx/${step.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 underline opacity-90 hover:opacity-100"
        >
          View tx <ExternalLink size={10} />
        </a>
      </div>
    );
  }

  if ("txHash" in step && step.txHash) {
    return (
      <div
        className="p-2.5 rounded-lg text-[11.5px] flex items-center gap-2"
        style={{
          background: "rgb(var(--surface-2))",
          border: "1px solid rgb(var(--line))",
          color: "rgb(var(--ink-2))",
        }}
      >
        <Loader2 size={12} className="animate-spin flex-shrink-0" />
        <span className="flex-1">Waiting for confirmation...</span>
        <a
          href={`${ARC_EXPLORER}/tx/${step.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 underline opacity-80 hover:opacity-100"
        >
          View tx <ExternalLink size={10} />
        </a>
      </div>
    );
  }

  return null;
}

// ============ EMPTY STATES ============

function NotConnectedState() {
  return (
    <main className="px-6 py-20 text-center max-w-md mx-auto">
      <div
        className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(34, 211, 238, 0.15))",
        }}
      >
        <Lock size={20} className="ink-2" />
      </div>
      <div className="font-display text-xl font-bold mb-2">Connect to access admin</div>
      <p className="text-[13px] ink-2 mb-5 max-w-sm mx-auto leading-relaxed">
        Admin actions require an authorized wallet (factory owner or curator).
      </p>
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button onClick={openConnectModal} className="btn btn-primary">
            Connect wallet
          </button>
        )}
      </ConnectButton.Custom>
    </main>
  );
}

function NotAuthorizedState({ ownerAddress }: { ownerAddress?: string }) {
  return (
    <main className="px-6 py-20 text-center max-w-md mx-auto">
      <div
        className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: "rgba(239, 68, 68, 0.12)", color: "#EF4444" }}
      >
        <Lock size={20} />
      </div>
      <div className="font-display text-xl font-bold mb-2">Not authorized</div>
      <p className="text-[13px] ink-2 mb-3 max-w-sm mx-auto leading-relaxed">
        Your wallet isn't the factory owner and isn't on the curator list.
      </p>
      {ownerAddress && (
        <div className="text-[11px] font-mono ink-3 mb-5">
          Factory owner: {ownerAddress.slice(0, 6)}…{ownerAddress.slice(-4)}
        </div>
      )}
      <Link href="/" className="btn">
        Back to markets
      </Link>
    </main>
  );
}

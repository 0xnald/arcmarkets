import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { TopStrip } from "@/components/TopStrip";

export default function NotFound() {
  return (
    <AppShell>
      <TopStrip />
      <main className="px-6 py-32 text-center max-w-2xl mx-auto">
        <div className="font-mono text-[11px] tracking-wider ink-3 mb-3">ERR_404</div>
        <h1 className="font-display text-6xl font-bold tracking-tight mb-4">
          Not <span className="text-gradient">found</span>
        </h1>
        <p className="ink-2 mb-8">The page you're looking for doesn't exist.</p>
        <Link href="/" className="btn btn-primary">Back to markets</Link>
      </main>
    </AppShell>
  );
}

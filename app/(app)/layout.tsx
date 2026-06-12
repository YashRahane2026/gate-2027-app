import { CountdownBar } from "@/components/countdown-bar";
import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CountdownBar />
      <div className="flex min-h-screen pt-12">
        <Sidebar />
        <main className="flex-1 pl-60 transition-all duration-300 min-h-screen">
          <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
        </main>
      </div>
    </>
  );
}

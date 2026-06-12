export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-white/10 rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-96 bg-white/10 rounded-2xl animate-pulse" />
        <div className="h-96 bg-white/10 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

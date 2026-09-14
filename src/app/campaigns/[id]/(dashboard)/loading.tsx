export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-48 rounded-xl bg-slate-200" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 rounded-xl bg-slate-200" />
        <div className="h-64 rounded-xl bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-96 rounded-xl bg-slate-200" />
    </div>
  );
}

export default function UCPPage() {
  return (
    <div className="max-w-2xl mx-auto min-h-[60vh] px-6 pb-6 pt-2 flex items-center justify-center">
      <div className="glass-card card-anime-float rounded-xl p-10 w-full text-center space-y-6">
        <h1 className="text-5xl font-bold text-foreground font-heading tracking-tight">
          Coming Soon
        </h1>
        <p className="text-muted-foreground">
          Connect Immortel to Gemini via Universal Context Protocol for cross-platform AI integrations. Seamlessly bring Immortel data into your Gemini workflows.
        </p>
        <div className="flex justify-center">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold tier-badge tier-badge-business">
            Gemini
          </span>
        </div>
      </div>
    </div>
  );
}

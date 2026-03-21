export default function ACPPage() {
  return (
    <div className="max-w-2xl mx-auto min-h-[60vh] px-6 pb-6 pt-2 flex items-center justify-center">
      <div className="glass-card card-anime-float rounded-xl p-10 w-full text-center space-y-6">
        <h1 className="text-5xl font-bold text-foreground font-heading tracking-tight">
          Coming Soon
        </h1>
        <p className="text-muted-foreground">
          Connect Immortel to ChatGPT via App Context Protocol for richer app integrations and workflows. Extend your ChatGPT experience with Immortel&apos;s capabilities.
        </p>
        <div className="flex justify-center">
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold tier-badge tier-badge-pro">
            ChatGPT
          </span>
        </div>
      </div>
    </div>
  );
}

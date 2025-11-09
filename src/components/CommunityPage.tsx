export const CommunityPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md mx-auto text-center space-y-4 animate-fade-in">
        <h2 className="text-xl font-medium text-foreground/90">
          Matching with lookalike professionals on similar paths and journeys
          <span className="inline-flex gap-0.5 ml-1">
            <span className="animate-pulse">.</span>
            <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>
              .
            </span>
            <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>
              .
            </span>
          </span>
        </h2>
        <p className="text-sm text-muted-foreground">This feature is coming soon. Stay tuned as we gather more data.</p>
      </div>
    </div>
  );
};

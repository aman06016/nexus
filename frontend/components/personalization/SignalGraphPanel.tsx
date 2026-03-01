import { SignalGraphSnapshot } from "@/lib/personalization/behavior";

type SignalGraphPanelProps = {
  snapshot: SignalGraphSnapshot;
};

function shortNodeId(id: string): string {
  const [, value = id] = id.split(":");
  return value;
}

export function SignalGraphPanel({ snapshot }: SignalGraphPanelProps) {
  const sourceNodes = snapshot.nodes.filter((node) => node.type === "source").slice(0, 3);
  const topicNodes = snapshot.nodes.filter((node) => node.type === "topic").slice(0, 4);
  const categoryNodes = snapshot.nodes.filter((node) => node.type === "category").slice(0, 3);
  const hotEdges = snapshot.edges
    .filter((edge) => edge.from.startsWith("source:") && edge.to.startsWith("topic:"))
    .slice(0, 5);

  return (
    <section className="rounded-md border border-borderSoft bg-bgTertiary/65 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-textPrimary">Personalized Signal Graph</h3>
        <span className="rounded-full border border-borderSoft bg-bgPrimary px-2 py-0.5 text-[11px] text-textSecondary">
          {snapshot.nodeCount} nodes • {snapshot.edgeCount} edges
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-textTertiary">Source Nodes</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sourceNodes.length === 0 ? (
              <span className="text-xs text-textSecondary">Learning...</span>
            ) : (
              sourceNodes.map((node) => (
                <span
                  key={node.id}
                  className="rounded-full border border-borderSoft bg-bgPrimary px-2 py-0.5 text-xs text-textSecondary"
                >
                  {node.label}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-textTertiary">Topic Nodes</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {topicNodes.length === 0 ? (
              <span className="text-xs text-textSecondary">Learning...</span>
            ) : (
              topicNodes.map((node) => (
                <span
                  key={node.id}
                  className="rounded-full border border-borderSoft bg-bgPrimary px-2 py-0.5 text-xs text-textSecondary"
                >
                  {node.label}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-textTertiary">Category Nodes</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {categoryNodes.length === 0 ? (
              <span className="text-xs text-textSecondary">Learning...</span>
            ) : (
              categoryNodes.map((node) => (
                <span
                  key={node.id}
                  className="rounded-full border border-borderSoft bg-bgPrimary px-2 py-0.5 text-xs text-textSecondary"
                >
                  {node.label}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-textTertiary">Hot Source → Topic Paths</p>
        {hotEdges.length === 0 ? (
          <p className="mt-1 text-xs text-textSecondary">No strong paths yet.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-xs text-textSecondary">
            {hotEdges.map((edge) => (
              <li key={`${edge.from}-${edge.to}`}>
                {shortNodeId(edge.from)} → {shortNodeId(edge.to)} ({edge.weight.toFixed(1)})
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

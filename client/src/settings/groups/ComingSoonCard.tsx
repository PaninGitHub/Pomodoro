interface Props { title: string; phase: number; }

export function ComingSoonCard({ title, phase }: Props): JSX.Element {
  return (
    <section className="border border-border rounded p-4 bg-bg-secondary/60">
      <h3 className="text-lg text-text-primary">{title}</h3>
      <p className="text-sm text-text-secondary italic mt-2">Coming in Phase {phase}.</p>
    </section>
  );
}

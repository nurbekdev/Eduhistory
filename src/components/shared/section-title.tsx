export function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 space-y-2">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">{title}</h1>
      {description ? <p className="text-sm text-slate-500 dark:text-slate-400 sm:text-base">{description}</p> : null}
    </div>
  );
}

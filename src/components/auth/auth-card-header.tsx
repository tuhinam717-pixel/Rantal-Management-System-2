export function AuthCardHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-7 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
        {title}
      </h1>
      <p className="mt-2 text-sm text-ink-500">{subtitle}</p>
    </div>
  );
}

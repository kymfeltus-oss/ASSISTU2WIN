type PlaceholderScreenProps = {
  readonly title: string;
};

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-[color:var(--text-primary)] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          This page is under construction.
        </p>
      </div>
    </div>
  );
}

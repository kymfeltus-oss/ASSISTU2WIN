type AppBrandProps = {
  readonly variant?: "header" | "auth";
};

export function AppBrand({ variant = "header" }: AppBrandProps) {
  if (variant === "auth") {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Assist U 2 Win
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-400">
          The Home Buying Collective
        </p>
      </div>
    );
  }

  return (
    <div className="leading-tight">
      <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-lg font-bold tracking-tight text-transparent sm:text-xl">
        Assist U 2 Win
      </span>
      <p className="text-[10px] font-medium tracking-wide text-slate-500">
        The Home Buying Collective
      </p>
    </div>
  );
}

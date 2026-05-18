import type { BottomNavIconKind } from "@/lib/navigation/bottom-nav";
import {
  FileCheck,
  Handshake,
  Home,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

const ICONS: Record<BottomNavIconKind, typeof Home> = {
  home: Home,
  clients: UserCheck,
  leads: Users,
  closing: FileCheck,
  pipeline: TrendingUp,
  winmeeting: Handshake,
};

type BottomNavIconProps = {
  readonly kind: BottomNavIconKind;
  readonly className?: string;
};

export function BottomNavIcon({ kind, className = "h-5 w-5" }: BottomNavIconProps) {
  const Icon = ICONS[kind];
  return <Icon className={className} strokeWidth={1.75} aria-hidden />;
}

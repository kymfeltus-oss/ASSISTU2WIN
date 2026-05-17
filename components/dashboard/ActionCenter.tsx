"use client";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AppointmentStatus =
  | "scheduled"
  | "starting"
  | "live"
  | "completed"
  | "failed";

export type Appointment = {
  readonly id: string;
  readonly title: string;
  readonly scheduled_at: string;
  readonly status: AppointmentStatus;
  readonly livekit_room_id: string | null;
};

export type LaunchLiveRoomPayload = {
  readonly token: string;
  readonly roomName: string;
  readonly appointmentId: string;
};

export type ActionCenterProps = {
  readonly initialAppointments: Appointment[];
  readonly onLaunchLiveRoom?: (payload: LaunchLiveRoomPayload) => void;
};

type GoLiveSuccessPayload = LaunchLiveRoomPayload & {
  readonly status: "live";
};

type GoLiveErrorPayload = {
  readonly error?: string;
  readonly code?: string;
};

function isGoLiveSuccessPayload(
  value: GoLiveSuccessPayload | GoLiveErrorPayload | null,
): value is GoLiveSuccessPayload {
  return (
    value !== null &&
    typeof value.token === "string" &&
    typeof value.roomName === "string" &&
    typeof value.appointmentId === "string"
  );
}

/** Watched by go-live-regression CI (path filter). */
const PANEL_CLASS =
  "rounded-2xl border border-slate-800/60 bg-slate-950/40 backdrop-blur-xl";

const LABEL_CLASS =
  "text-xs font-semibold uppercase tracking-wider text-slate-400";

function sortByScheduledAt(rows: readonly Appointment[]): Appointment[] {
  return [...rows].sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
}

function isDbAppointmentStatus(
  value: unknown,
): value is Exclude<AppointmentStatus, "starting" | "failed"> {
  return (
    value === "scheduled" ||
    value === "live" ||
    value === "completed"
  );
}

function normalizeRemoteStatus(value: unknown): AppointmentStatus {
  if (value === "starting" || value === "failed") {
    return value;
  }
  if (isDbAppointmentStatus(value)) {
    return value;
  }
  return "scheduled";
}

function coerceAppointmentFromRecord(
  record: Record<string, unknown>,
): Appointment | null {
  const id = typeof record.id === "string" ? record.id : null;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const scheduledAt =
    typeof record.scheduled_at === "string"
      ? record.scheduled_at
      : typeof record.start_time === "string"
        ? record.start_time
        : null;
  const livekitRoomId =
    typeof record.livekit_room_id === "string"
      ? record.livekit_room_id
      : null;

  if (!id || !title || !scheduledAt) {
    return null;
  }

  return {
    id,
    title,
    scheduled_at: scheduledAt,
    status: normalizeRemoteStatus(record.status),
    livekit_room_id: livekitRoomId,
  };
}

function formatSessionTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadgeLabel(status: AppointmentStatus): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "starting":
      return "Starting";
    case "live":
      return "Live";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function ActionCenter({
  initialAppointments,
  onLaunchLiveRoom,
}: ActionCenterProps) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    sortByScheduledAt(initialAppointments),
  );
  const [pendingById, setPendingById] = useState<Record<string, boolean>>({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const abortRef = useRef<AbortController | null>(null);
  const pendingByIdRef = useRef(pendingById);

  useEffect(() => {
    pendingByIdRef.current = pendingById;
  }, [pendingById]);

  const mergeAppointment = useCallback((incoming: Appointment) => {
    setAppointments((current) => {
      const index = current.findIndex((row) => row.id === incoming.id);
      if (index === -1) {
        return sortByScheduledAt([...current, incoming]);
      }
      const next = [...current];
      next[index] = incoming;
      return sortByScheduledAt(next);
    });
  }, []);

  useEffect(() => {
    setAppointments(sortByScheduledAt(initialAppointments));
  }, [initialAppointments]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("appointments-action-center")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        (payload) => {
          const record =
            payload.eventType === "DELETE"
              ? null
              : (payload.new as Record<string, unknown> | null);

          if (payload.eventType === "DELETE" && payload.old) {
            const oldId =
              typeof (payload.old as Record<string, unknown>).id === "string"
                ? (payload.old as Record<string, unknown>).id
                : null;
            if (oldId) {
              setAppointments((current) =>
                current.filter((row) => row.id !== oldId),
              );
            }
            return;
          }

          if (!record) {
            return;
          }

          const parsed = coerceAppointmentFromRecord(record);
          if (!parsed) {
            return;
          }

          const status = pendingByIdRef.current[parsed.id]
            ? ("starting" as const)
            : parsed.status;
          mergeAppointment({ ...parsed, status });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mergeAppointment]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleGoLive = useCallback(
    async (appointmentId: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setPendingById((current) => ({ ...current, [appointmentId]: true }));
      setErrorById((current) => {
        const next = { ...current };
        delete next[appointmentId];
        return next;
      });

      setAppointments((current) =>
        current.map((row) =>
          row.id === appointmentId ? { ...row, status: "starting" } : row,
        ),
      );

      try {
        const response = await fetch("/api/appointments/go-live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId }),
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as
          | GoLiveSuccessPayload
          | GoLiveErrorPayload
          | null;

        if (!response.ok) {
          const message =
            payload && "error" in payload && typeof payload.error === "string"
              ? payload.error
              : "Unable to start session.";

          setErrorById((current) => ({ ...current, [appointmentId]: message }));
          setAppointments((current) =>
            current.map((row) =>
              row.id === appointmentId ? { ...row, status: "failed" } : row,
            ),
          );
          return;
        }

        if (!isGoLiveSuccessPayload(payload)) {
          setErrorById((current) => ({
            ...current,
            [appointmentId]: "Invalid server response.",
          }));
          setAppointments((current) =>
            current.map((row) =>
              row.id === appointmentId ? { ...row, status: "failed" } : row,
            ),
          );
          return;
        }

        setAppointments((current) =>
          current.map((row) =>
            row.id === appointmentId
              ? {
                  ...row,
                  status: "live",
                  livekit_room_id: payload.roomName,
                }
              : row,
          ),
        );

        const launchPayload: LaunchLiveRoomPayload = {
          token: payload.token,
          roomName: payload.roomName,
          appointmentId: payload.appointmentId,
        };

        if (onLaunchLiveRoom) {
          onLaunchLiveRoom(launchPayload);
        } else {
          router.push(
            `/meet/${encodeURIComponent(payload.roomName)}?name=Derrick`,
          );
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setErrorById((current) => ({
          ...current,
          [appointmentId]: "Network error while starting session.",
        }));
        setAppointments((current) =>
          current.map((row) =>
            row.id === appointmentId ? { ...row, status: "failed" } : row,
          ),
        );
      } finally {
        setPendingById((current) => {
          const next = { ...current };
          delete next[appointmentId];
          return next;
        });
      }
    },
    [onLaunchLiveRoom, router],
  );

  const hasSessions = appointments.length > 0;

  const rows = useMemo(() => appointments, [appointments]);

  return (
    <section className={cn(PANEL_CLASS, "font-sans text-slate-100")}>
      <header className="border-b border-slate-800/60 px-5 py-4">
        <p className={LABEL_CLASS}>Action center</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
          Today&apos;s sessions
        </h2>
      </header>

      {!hasSessions ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          No meetings scheduled for today.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800/60">
          {rows.map((appointment) => {
            const isPending = Boolean(pendingById[appointment.id]);
            const isLive = appointment.status === "live";
            const isStarting =
              appointment.status === "starting" || isPending;
            const isCompleted = appointment.status === "completed";
            const rowError = errorById[appointment.id];

            return (
              <li
                key={appointment.id}
                className={cn(
                  "px-5 py-4 transition-colors",
                  isLive &&
                    "bg-emerald-950/20 ring-1 ring-inset ring-emerald-500/35",
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {appointment.title}
                      </p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          isLive &&
                            "border-emerald-500/40 bg-emerald-600/15 text-emerald-300",
                          appointment.status === "scheduled" &&
                            "border-slate-700 bg-slate-900/60 text-slate-400",
                          isStarting &&
                            "border-amber-500/30 bg-amber-950/40 text-amber-200",
                          appointment.status === "completed" &&
                            "border-slate-700 bg-slate-900/50 text-slate-500",
                          appointment.status === "failed" &&
                            "border-rose-500/30 bg-rose-950/30 text-rose-300",
                        )}
                      >
                        {statusBadgeLabel(
                          isStarting ? "starting" : appointment.status,
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatSessionTime(appointment.scheduled_at)}
                    </p>
                    {rowError ? (
                      <p className="text-xs text-rose-400" role="alert">
                        {rowError}
                      </p>
                    ) : null}
                  </div>

                  <div className="shrink-0">
                    {(appointment.status === "scheduled" ||
                      appointment.status === "failed") &&
                    !isPending ? (
                      <button
                        type="button"
                        onClick={() => void handleGoLive(appointment.id)}
                        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 px-4 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
                      >
                        Go Live
                      </button>
                    ) : null}

                    {isStarting ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-600/15 px-4 text-sm font-semibold text-emerald-300 animate-pulse"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Starting...
                      </button>
                    ) : null}

                    {isCompleted && !isPending ? (
                      <span className="inline-flex min-h-10 items-center px-2 text-xs text-slate-500">
                        {statusBadgeLabel(appointment.status)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

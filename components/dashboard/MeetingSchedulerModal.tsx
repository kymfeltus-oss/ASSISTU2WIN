"use client";

import { createClient } from "@/lib/supabase/client";
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

export const APPOINTMENT_TYPES = [
  "virtual_showing",
  "consultation",
  "doc_review",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];

const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  virtual_showing: "Virtual Showing",
  consultation: "Consultation",
  doc_review: "Doc Review",
};

const DURATION_OPTIONS = [15, 30, 45, 60] as const;

type MeetingSchedulerModalProps = {
  readonly leadId: string;
  readonly onClose: () => void;
};

type SubmitStatus = "idle" | "loading" | "success" | "error";

type SchedulerForm = {
  readonly title: string;
  readonly appointmentType: AppointmentType;
  readonly startTime: string;
  readonly durationMinutes: number;
  readonly targetZipOrAddress: string;
};

const INITIAL_FORM: SchedulerForm = {
  title: "",
  appointmentType: "virtual_showing",
  startTime: "",
  durationMinutes: 30,
  targetZipOrAddress: "",
};

const fieldClassName =
  "min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-slate-100 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/25";

const labelClassName = "text-sm font-medium text-slate-300";

function generateLiveKitRoomId(leadId: string): string {
  const leadSegment = leadId.replace(/-/g, "").slice(0, 8).toLowerCase();
  const randomSegment = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toLowerCase();
  return `appt-${leadSegment}-${randomSegment}`;
}

function toIsoStartTime(localValue: string): string | null {
  if (!localValue.trim()) {
    return null;
  }
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export function MeetingSchedulerModal({
  leadId,
  onClose,
}: MeetingSchedulerModalProps) {
  const [form, setForm] = useState<SchedulerForm>(INITIAL_FORM);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    window.setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setStatus("error");
      setErrorMessage("Meeting title is required.");
      return;
    }

    const isoStartTime = toIsoStartTime(form.startTime);
    if (!isoStartTime) {
      setStatus("error");
      setErrorMessage("Select a valid start date and time.");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user?.id) {
        setStatus("error");
        setErrorMessage("Sign in required to schedule a meeting.");
        return;
      }

      const livekitRoomId = generateLiveKitRoomId(leadId);

      const { error: insertError } = await supabase.from("appointments").insert({
        lead_id: leadId,
        title: trimmedTitle,
        type: form.appointmentType,
        status: "scheduled",
        target_zip_or_address: form.targetZipOrAddress.trim() || null,
        start_time: isoStartTime,
        duration_minutes: form.durationMinutes,
        livekit_room_id: livekitRoomId,
      });

      if (insertError) {
        console.error("[MEETING_SCHEDULER_INSERT]", {
          message: insertError.message,
        });
        setStatus("error");
        setErrorMessage(insertError.message || "Unable to schedule meeting.");
        return;
      }

      setStatus("success");

      window.setTimeout(() => {
        handleDismiss();
      }, 1400);
    } catch (error: unknown) {
      console.error("[MEETING_SCHEDULER_EXCEPTION]", { error });
      setStatus("error");
      setErrorMessage("Unexpected error scheduling meeting.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-scheduler-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close scheduler"
        onClick={handleDismiss}
      />

      <div
        className={`relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl shadow-black/50 transition-transform duration-300 ease-out sm:rounded-2xl ${
          isVisible ? "translate-y-0" : "translate-y-full sm:translate-y-4 sm:opacity-0"
        }`}
      >
        <header className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400/90">
              Schedule
            </p>
            <h2 id="meeting-scheduler-title" className="text-lg font-semibold">
              New meeting
            </h2>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition hover:text-slate-100"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4 overflow-y-auto px-5 py-4"
        >
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="meeting-title">
              Title
            </label>
            <input
              id="meeting-title"
              type="text"
              required
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className={fieldClassName}
              placeholder="Virtual tour of 123 Main St"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className={labelClassName}>Meeting type</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup">
              {APPOINTMENT_TYPES.map((type) => {
                const isActive = form.appointmentType === type;
                return (
                  <label
                    key={type}
                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm font-medium transition ${
                      isActive
                        ? "border-cyan-400 bg-cyan-950/60 text-cyan-100"
                        : "border-slate-700 bg-slate-950 text-slate-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="appointment_type"
                      value={type}
                      checked={isActive}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          appointmentType: type,
                        }))
                      }
                      className="sr-only"
                    />
                    {APPOINTMENT_TYPE_LABELS[type]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label className={labelClassName} htmlFor="meeting-start">
              Start time
            </label>
            <input
              id="meeting-start"
              type="datetime-local"
              required
              value={form.startTime}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  startTime: event.target.value,
                }))
              }
              className={fieldClassName}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className={labelClassName}>Duration (minutes)</legend>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((minutes) => {
                const isActive = form.durationMinutes === minutes;
                return (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        durationMinutes: minutes,
                      }))
                    }
                    className={`min-h-11 rounded-xl border text-sm font-semibold transition ${
                      isActive
                        ? "border-cyan-400 bg-cyan-950/60 text-cyan-100"
                        : "border-slate-700 bg-slate-950 text-slate-400"
                    }`}
                  >
                    {minutes}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <label className={labelClassName} htmlFor="meeting-location">
              Property or area
            </label>
            <input
              id="meeting-location"
              type="text"
              value={form.targetZipOrAddress}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  targetZipOrAddress: event.target.value,
                }))
              }
              className={fieldClassName}
              placeholder="75024 or 123 Main St, Plano TX"
            />
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-400" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {status === "success" ? (
            <p
              className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-center text-sm font-medium text-emerald-300"
              role="status"
            >
              Meeting scheduled successfully.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "loading"}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cyan-600 text-base font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden />
                Scheduling…
              </>
            ) : (
              "Schedule Meeting"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

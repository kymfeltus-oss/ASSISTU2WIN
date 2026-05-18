"use client";

import { CommunicationPlanFields } from "@/components/leads/CommunicationPlanFields";
import {
  communicationPlanToDbUpdate,
  type CommunicationPlanData,
} from "@/lib/leads/communication-plan";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useRef, useState } from "react";

type CommunicationPlanProps = {
  readonly leadId: string;
  readonly initialData: CommunicationPlanData;
  readonly onSaved?: (data: CommunicationPlanData) => void;
};

export default function CommunicationPlan({
  leadId,
  initialData,
  onSaved,
}: CommunicationPlanProps) {
  const supabase = createClient();
  const [settings, setSettings] = useState<CommunicationPlanData>(initialData);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(settings);

  useEffect(() => {
    setSettings(initialData);
    latestRef.current = initialData;
  }, [initialData, leadId]);

  useEffect(() => {
    latestRef.current = settings;
  }, [settings]);

  const persist = useCallback(
    async (next: CommunicationPlanData) => {
      setLoading(true);
      setErrorMessage(null);

      try {
        const { error } = await supabase
          .from("leads")
          .update(communicationPlanToDbUpdate(next))
          .eq("id", leadId);

        if (error) {
          console.error("[COMMUNICATION_PLAN_UPDATE]", {
            leadId,
            message: error.message,
          });
          setErrorMessage("Unable to save communication plan.");
          return;
        }

        onSaved?.(next);
      } catch (error: unknown) {
        console.error("[COMMUNICATION_PLAN_UPDATE_EXCEPTION]", { leadId, error });
        setErrorMessage("Unable to save communication plan.");
      } finally {
        setLoading(false);
      }
    },
    [leadId, onSaved, supabase],
  );

  const handleChange = useCallback(
    (next: CommunicationPlanData) => {
      setSettings(next);
      latestRef.current = next;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        void persist(next);
      }, 450);
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="min-w-0 max-w-2xl">
      <CommunicationPlanFields
        value={settings}
        onChange={handleChange}
        disabled={loading}
        variant="full"
      />
      {errorMessage ? (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

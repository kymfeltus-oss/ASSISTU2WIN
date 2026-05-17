"use client";

import type {
  CommandReportDataState,
  CommandReportMetrics,
} from "./command-report-types";
import styles from "./analytics-command-report.module.css";
import { useCallback, useState } from "react";

type AnalyticsCommandReportProps = {
  readonly metrics: CommandReportMetrics;
  readonly dataState: CommandReportDataState;
};

const EMPTY_STATE_COPY: Readonly<
  Record<Exclude<CommandReportDataState, "available">, { readonly title: string; readonly body: string }>
> = {
  empty: {
    title: "No active buyers yet",
    body: "Add buyers from intake or your command hub. This report will populate as soon as pipeline data is available.",
  },
  unavailable: {
    title: "Buyer analytics unavailable",
    body: "We could not load leads from your workspace. Confirm admin access and connection, then refresh this page.",
  },
};

function toneClass(tone: "cyan" | "green" | "amber" | "red" | "muted"): string {
  if (tone === "cyan") return styles.cyan;
  if (tone === "green") return styles.green;
  if (tone === "amber") return styles.amber;
  if (tone === "red") return styles.red;
  return styles.muted;
}

function pillClass(pill: "red" | "amber" | "cyan" | "green"): string {
  if (pill === "red") return styles.pillRed;
  if (pill === "amber") return styles.pillAmber;
  if (pill === "green") return styles.pillGreen;
  return styles.pillCyan;
}

export function AnalyticsCommandReport({
  metrics,
  dataState,
}: AnalyticsCommandReportProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handlePdf = useCallback(() => {
    window.alert("PDF export coming soon");
  }, []);

  const handleCsv = useCallback(() => {
    window.alert("CSV export coming soon");
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(metrics.copySummary);
      setFeedback("Executive summary copied.");
    } catch {
      setFeedback("Copy failed — select text manually.");
    }
  }, [metrics.copySummary]);

  return (
    <div
      className={styles.report}
      style={{ ["--donut-gradient" as string]: metrics.donutGradient }}
    >
      <header className={styles.header}>
        <div>
          <h1>Leads Analytics Intelligence</h1>
          <p>
            Revenue, readiness, risk, financing friction, and buyer demand in one executive
            report.
          </p>
          <div className={styles.notice}>
            Report generated today · Agent view · Assist U2 Win
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={handlePrint}>
            Print Report
          </button>
          <button type="button" className={styles.btn} onClick={handlePdf}>
            Download PDF
          </button>
          <button type="button" className={styles.btn} onClick={handleCsv}>
            Download CSV
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => void handleCopy()}
          >
            Copy Summary
          </button>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className={`${styles.btn} ${styles.btnSignOut}`}>
              Sign out
            </button>
          </form>
        </div>
      </header>

      {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

      {dataState !== "available" ? (
        <div
          className={`${styles.dataStateBanner} ${styles.panel} ${
            dataState === "unavailable" ? styles.dataStateUnavailable : styles.dataStateEmpty
          }`}
          role="status"
        >
          <strong>{EMPTY_STATE_COPY[dataState].title}</strong>
          <p>{EMPTY_STATE_COPY[dataState].body}</p>
        </div>
      ) : null}

      <section className={styles.snapshot}>
        {metrics.executiveSnapshot.map((kpi) => (
          <div
            key={kpi.label}
            className={`${styles.kpi} ${styles.panel} ${kpi.featured ? styles.featured : ""}`}
          >
            <small>{kpi.label}</small>
            <strong className={toneClass(kpi.tone)}>{kpi.display}</strong>
          </div>
        ))}
      </section>

      <section className={styles.grid}>
        <div className={`${styles.card} ${styles.panel}`}>
          <div className={styles.cardHead}>
            <h2>Revenue Intelligence</h2>
            <span>Weighted forecast</span>
          </div>
          <div className={styles.revenueMain}>
            <div className={styles.donut}>
              <div className={styles.donutInner}>
                <strong>{metrics.projectedCommissionDisplay}</strong>
                <small>forecast</small>
              </div>
            </div>
            <div className={styles.rows}>
              {metrics.revenueGroups.map((group) => (
                <div key={group.label} className={styles.row}>
                  <div>
                    <strong>{group.label}</strong>
                    <small>{group.subtitle}</small>
                  </div>
                  <strong className={toneClass(group.tone)}>{group.volumeDisplay}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`${styles.card} ${styles.panel}`}>
          <div className={styles.cardHead}>
            <h2>Conversion Funnel</h2>
            <span>Stage velocity</span>
          </div>
          <div className={styles.funnel}>
            {metrics.conversionFunnel.map((stage) => (
              <div key={stage.label} className={styles.stage}>
                <span className={styles.stageLabel}>{stage.label}</span>
                <div className={styles.bar}>
                  <div
                    className={styles.fill}
                    style={{ width: `${stage.barPct}%` }}
                  />
                </div>
                <strong className={styles.stageCount}>{stage.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.grid}>
        <div className={`${styles.card} ${styles.panel}`}>
          <div className={styles.cardHead}>
            <h2>Buyer Readiness Matrix</h2>
            <span>Stage readiness</span>
          </div>
          <div className={styles.matrix}>
            {metrics.readinessMatrix.map((item) => (
              <div key={item.label} className={styles.matrixCard}>
                <small>{item.label}</small>
                <strong className={toneClass(item.tone)}>{item.display}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.card} ${styles.panel}`}>
          <div className={styles.cardHead}>
            <h2>Financing Friction Map</h2>
            <span>Blocker analysis</span>
          </div>
          <div className={styles.frictionGrid}>
            {metrics.financingFriction.map((item) => (
              <div key={item.label} className={styles.friction}>
                <strong className={toneClass(item.tone)}>
                  {item.display} {item.label}
                </strong>
                <span>{item.description}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.aiBrief} ${styles.panel} ${styles.featured}`}>
        <h2>AI Analytics Briefing</h2>
        <p>{metrics.briefingNarrative}</p>
        <div className={styles.briefGrid}>
          <div className={styles.brief}>
            <strong>Money Move</strong>
            <span>{metrics.briefing.moneyMove}</span>
          </div>
          <div className={styles.brief}>
            <strong>Leak Detected</strong>
            <span>{metrics.briefing.leakDetected}</span>
          </div>
          <div className={styles.brief}>
            <strong>Urgency</strong>
            <span>{metrics.briefing.urgency}</span>
          </div>
          <div className={styles.brief}>
            <strong>Focus</strong>
            <span>{metrics.briefing.focus}</span>
          </div>
        </div>
      </section>

      <section className={styles.grid}>
        <div className={`${styles.card} ${styles.panel}`}>
          <div className={styles.cardHead}>
            <h2>Follow-Up Risk Queue</h2>
            <span>Recovery list</span>
          </div>
          <div className={styles.riskList}>
            {metrics.followUpRisk.map((item) => (
              <div key={item.label} className={styles.risk}>
                <div className={styles.dot} />
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </div>
                <div className={`${styles.pill} ${pillClass(item.pill)}`}>
                  {item.display}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.card} ${styles.panel}`}>
          <div className={styles.cardHead}>
            <h2>Market Buyer Signals</h2>
            <span>ZIP intelligence</span>
          </div>
          <div className={styles.marketGrid}>
            {metrics.marketSignals.map((signal) => (
              <div key={signal.label} className={`${styles.market} ${styles.panel}`}>
                <strong className={toneClass(signal.tone)}>{signal.value}</strong>
                <span className={styles.marketLabel}>{signal.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';

const STORAGE_KEY = 'villa_finance_onboarding_v1';

type Step = {
  title: string;
  body: string;
};

export function ClientOnboarding({
  t,
  onReplayRef,
}: {
  t: Dictionary;
  onReplayRef?: (open: () => void) => void;
}) {
  const steps: Step[] = [
    { title: t.onboardingStep1Title, body: t.onboardingStep1Body },
    { title: t.onboardingStep2Title, body: t.onboardingStep2Body },
    { title: t.onboardingStep3Title, body: t.onboardingStep3Body },
    { title: t.onboardingStep4Title, body: t.onboardingStep4Body },
    { title: t.onboardingStep5Title, body: t.onboardingStep5Body },
  ];

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const openTour = useCallback(() => {
    setStep(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    onReplayRef?.(openTour);
  }, [onReplayRef, openTour]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, []);

  if (!open) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="vf-onboarding-overlay fixed inset-0 z-50 flex items-center justify-center bg-[var(--text-primary)]/40 p-4">
      <div
        className="vf-onboarding-modal vf-panel w-full max-w-lg p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="vf-onboarding-kicker mb-1 text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
          {t.onboardingLabel} · {step + 1}/{steps.length}
        </div>
        <h2 id="onboarding-title" className="text-xl font-semibold text-[var(--text-primary)]">
          {current.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{current.body}</p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={finish}
          >
            {t.onboardingSkip}
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                className="vf-onboarding-secondary rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                onClick={() => setStep((s) => s - 1)}
              >
                {t.onboardingBack}
              </button>
            )}
            <button
              type="button"
              className="vf-btn-accent"
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            >
              {isLast ? t.onboardingDone : t.onboardingNext}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

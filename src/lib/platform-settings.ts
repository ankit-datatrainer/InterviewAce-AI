import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  logoUrl: string | null;
  currency: string;
  currencySymbol: string;
  taxPercent: number;
  taxLabel: string;
  freeTrialDays: number;
  termsContent: string;
  privacyContent: string;
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'InterviewAce AI',
  supportEmail: 'support@interviewace.ai',
  logoUrl: null,
  currency: 'INR',
  currencySymbol: '₹',
  taxPercent: 18,
  taxLabel: 'GST',
  freeTrialDays: 0,
  termsContent: '',
  privacyContent: '',
};

function fromRow(r: any): PlatformSettings {
  return {
    platformName: r.platform_name ?? DEFAULT_SETTINGS.platformName,
    supportEmail: r.support_email ?? DEFAULT_SETTINGS.supportEmail,
    logoUrl: r.logo_url ?? null,
    currency: r.currency ?? DEFAULT_SETTINGS.currency,
    currencySymbol: r.currency_symbol ?? DEFAULT_SETTINGS.currencySymbol,
    taxPercent: Number(r.tax_percent ?? DEFAULT_SETTINGS.taxPercent),
    taxLabel: r.tax_label ?? DEFAULT_SETTINGS.taxLabel,
    freeTrialDays: Number(r.free_trial_days ?? 0),
    termsContent: r.terms_content ?? '',
    privacyContent: r.privacy_content ?? '',
  };
}

/** Reads the single platform-settings row. Falls back to defaults if the
 *  table doesn't exist yet (i.e. the phase-3 migration hasn't been run). */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    if (error || !data) return DEFAULT_SETTINGS;
    return fromRow(data);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updatePlatformSettings(patch: Partial<PlatformSettings>): Promise<void> {
  const supabase = createClient();
  const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.platformName !== undefined) dbPatch.platform_name = patch.platformName;
  if (patch.supportEmail !== undefined) dbPatch.support_email = patch.supportEmail;
  if (patch.logoUrl !== undefined) dbPatch.logo_url = patch.logoUrl;
  if (patch.currency !== undefined) dbPatch.currency = patch.currency;
  if (patch.currencySymbol !== undefined) dbPatch.currency_symbol = patch.currencySymbol;
  if (patch.taxPercent !== undefined) dbPatch.tax_percent = patch.taxPercent;
  if (patch.taxLabel !== undefined) dbPatch.tax_label = patch.taxLabel;
  if (patch.freeTrialDays !== undefined) dbPatch.free_trial_days = patch.freeTrialDays;
  if (patch.termsContent !== undefined) dbPatch.terms_content = patch.termsContent;
  if (patch.privacyContent !== undefined) dbPatch.privacy_content = patch.privacyContent;
  // upsert so it also works if the seed row is somehow missing.
  const { error } = await supabase
    .from('platform_settings')
    .upsert({ id: 'default', ...dbPatch }, { onConflict: 'id' });
  if (error) throw error;
}

/** Client hook: loads settings once, returns defaults until they arrive. */
export function usePlatformSettings(): { settings: PlatformSettings; loading: boolean } {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    getPlatformSettings().then((s) => { if (alive) { setSettings(s); setLoading(false); } });
    return () => { alive = false; };
  }, []);
  return { settings, loading };
}

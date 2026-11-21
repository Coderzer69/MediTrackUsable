// Transactional email through Brevo (https://developers.brevo.com/reference/sendtransacemail).
//
// Env vars:
//   BREVO_API_KEY       Brevo API key (v3). Without it, emails are skipped (logged once).
//   EMAIL_FROM_ADDRESS  Sender address. Must be a verified sender in Brevo.
//   EMAIL_FROM_NAME     Sender name (default "MediTrack").
//   APP_URL             Public URL of the patient app, used for the "Open MediTrack" link.
//
// Never log email bodies: they contain medical information.

import type { LocalizedTreatment } from './prescriptionTranslation';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export type PrescriptionEmailInput = {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorSpecialization?: string | null;
  issuedAt: Date;
  treatmentId: string;
  isUpdate?: boolean;
  // Text in the patient's language (medicine names stay in English).
  localized: LocalizedTreatment;
  hasAudio?: boolean;
};

export type EmailResult = { sent: true; messageId?: string } | { sent: false; reason: string };

let warnedMissingConfig = false;

export const isEmailConfigured = () => !!(process.env.BREVO_API_KEY && process.env.EMAIL_FROM_ADDRESS);

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const withDr = (name: string) => (/^dr\.?\s/i.test(name.trim()) ? name.trim() : `Dr. ${name.trim()}`);

const LOCALES: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', mr: 'mr-IN', ta: 'ta-IN', te: 'te-IN',
  gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-IN',
};

const formatDate = (d: Date, lang: string) => {
  try {
    return d.toLocaleDateString(LOCALES[lang] || 'en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  } catch {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  }
};

const fill = (template: string, vars: Record<string, string>) =>
  template.replace(/\{(name|doctor)\}/g, (_, k) => vars[k] ?? '');

export const buildPrescriptionEmail = (input: PrescriptionEmailInput) => {
  const loc = input.localized;
  const L = loc.labels;
  const doctor = withDr(input.doctorName);
  const vars = { name: input.patientName, doctor };
  const date = formatDate(input.issuedAt, loc.language);
  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  const dir = loc.language === 'ur' ? 'rtl' : 'ltr';
  const subject = fill(input.isUpdate ? L.subjectUpdate : L.subject, vars);

  const cell = 'padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;vertical-align:top;';
  const head = 'padding:10px 12px;border-bottom:2px solid #d1d5db;font-size:12px;color:#6b7280;text-align:start;';

  const rows = loc.prescriptions
    .map((p, i) => {
      const details = [p.strength, p.route].filter(Boolean).map(escapeHtml).join(' · ');
      return `<tr>
        <td style="${cell}">${i + 1}</td>
        <td style="${cell}"><strong dir="ltr">${escapeHtml(p.medicineName)}</strong>${details ? `<br><span style="color:#6b7280;font-size:13px;">${details}</span>` : ''}${p.instructions ? `<br><span style="color:#374151;font-size:13px;">${escapeHtml(p.instructions)}</span>` : ''}</td>
        <td style="${cell}">${escapeHtml(p.dosage || '–')}</td>
        <td style="${cell}">${escapeHtml(p.frequency || '–')}</td>
        <td style="${cell}">${escapeHtml(p.duration || '–')}</td>
      </tr>`;
    })
    .join('');

  const infoRow = (label: string, value?: string | null) =>
    value ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;">${escapeHtml(label)}</td><td style="padding:4px 0;color:#111827;font-size:14px;">${escapeHtml(value)}</td></tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="${loc.language}" dir="${dir}"><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,'Noto Sans',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#0f5132;padding:20px 28px;color:#ffffff;">
    <div style="font-size:20px;font-weight:bold;">MediTrack</div>
    <div style="font-size:13px;opacity:.85;">${escapeHtml(input.isUpdate ? L.titleUpdate : L.title)}</div>
  </td></tr>
  <tr><td style="padding:24px 28px;">
    <p style="margin:0 0 12px;font-size:15px;color:#111827;">${escapeHtml(fill(L.greeting, vars))}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">${escapeHtml(fill(input.isUpdate ? L.introUpdate : L.intro, vars))}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${infoRow(L.doctor, doctor + (input.doctorSpecialization ? ` (${input.doctorSpecialization})` : ''))}
      ${infoRow(L.date, date)}
      ${infoRow(L.condition, loc.condition)}
      ${infoRow(L.diagnosis, loc.diagnosis)}
      ${input.isUpdate ? infoRow(L.reasonForUpdate, loc.amendmentReason) : ''}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr><th style="${head}">#</th><th style="${head}">${escapeHtml(L.medicine)}</th><th style="${head}">${escapeHtml(L.dosage)}</th><th style="${head}">${escapeHtml(L.frequency)}</th><th style="${head}">${escapeHtml(L.duration)}</th></tr>
      ${rows}
    </table>
    ${loc.doctorNotes ? `<p style="margin:20px 0 0;font-size:14px;color:#374151;"><strong>${escapeHtml(L.notes)}:</strong> ${escapeHtml(loc.doctorNotes)}</p>` : ''}
    ${input.hasAudio ? `<p style="margin:20px 0 0;font-size:14px;color:#0f5132;">🔊 ${escapeHtml(L.listen)}</p>` : ''}
    ${appUrl ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(appUrl)}/login" style="display:inline-block;background:#0f5132;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;">${escapeHtml(L.openApp)}</a></p>` : ''}
    <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.5;">${escapeHtml(L.disclaimer)}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    fill(L.greeting, vars),
    '',
    fill(input.isUpdate ? L.introUpdate : L.intro, vars),
    `${L.date}: ${date}`,
    loc.condition ? `${L.condition}: ${loc.condition}` : '',
    loc.diagnosis ? `${L.diagnosis}: ${loc.diagnosis}` : '',
    input.isUpdate && loc.amendmentReason ? `${L.reasonForUpdate}: ${loc.amendmentReason}` : '',
    '',
    ...loc.prescriptions.map((p, i) => {
      const how = [p.dosage, p.frequency, p.duration].filter(Boolean).join(', ');
      return `${i + 1}. ${p.medicineName}${p.strength ? ` ${p.strength}` : ''}${how ? ` – ${how}` : ''}${p.instructions ? ` (${p.instructions})` : ''}`;
    }),
    loc.doctorNotes ? `\n${L.notes}: ${loc.doctorNotes}` : '',
    input.hasAudio ? `\n${L.listen}` : '',
    appUrl ? `\n${L.openApp}: ${appUrl}/login` : '',
    '',
    L.disclaimer,
  ]
    .filter((l) => l !== '')
    .join('\n');

  return { subject, html, text };
};

export const sendEmail = async (to: { email: string; name?: string }, subject: string, html: string, text: string, tags: string[] = []): Promise<EmailResult> => {
  if (!isEmailConfigured()) {
    if (!warnedMissingConfig) {
      console.warn('Email not sent: BREVO_API_KEY or EMAIL_FROM_ADDRESS is not set.');
      warnedMissingConfig = true;
    }
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY as string,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_FROM_ADDRESS, name: process.env.EMAIL_FROM_NAME || 'MediTrack' },
        to: [{ email: to.email, ...(to.name ? { name: to.name } : {}) }],
        subject,
        htmlContent: html,
        textContent: text,
        tags,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Brevo error bodies hold a code and message, never the email content.
      const body = await response.text().catch(() => '');
      console.error(`Brevo send failed (${response.status}): ${body.slice(0, 300)}`);
      return { sent: false, reason: `brevo_${response.status}` };
    }
    const data = (await response.json().catch(() => ({}))) as { messageId?: string };
    return { sent: true, messageId: data.messageId };
  } catch (err: any) {
    console.error('Brevo send error:', err?.name === 'TimeoutError' ? 'timeout' : err?.message);
    return { sent: false, reason: 'network_error' };
  }
};

export const sendPrescriptionEmail = async (input: PrescriptionEmailInput) => {
  const { subject, html, text } = buildPrescriptionEmail(input);
  return sendEmail({ email: input.patientEmail, name: input.patientName }, subject, html, text, ['prescription']);
};

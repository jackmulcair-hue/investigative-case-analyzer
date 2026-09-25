# Clarity — Investigative Case Analyzer

Clarity is an evidence-first case-analysis PWA for organising incident facts, timelines, evidence, people, hypotheses and unanswered questions without producing guilt scores or automatically identifying a culprit.

## Use on iPhone or Android

1. Open the deployed site over **HTTPS** (GitHub Pages, Netlify, Vercel or another static host).
2. On Android Chrome, tap **Install app** when offered, or use the browser menu → **Install app**.
3. On iPhone/iPad Safari, tap **Share** → **Add to Home Screen**. iOS does not show the Android-style install prompt.
4. Once installed, Clarity opens full-screen and its app shell remains available offline after the first visit.

A service worker provides offline caching for the static shell. Browser storage is local to the device; this prototype does not sync cases between devices or provide server-side security.

## Included

- Responsive mobile-first workspace with Overview, Case file, Timeline, Evidence, Questions and Report views
- Professional mode and a child-friendly Kids mode
- Installable PWA with offline shell, online/offline status, share action and mobile safe-area support
- Add/remove people, evidence, timeline events and neutral questions
- Alternative-hypothesis review weights (explicitly not probabilities of guilt)
- Browser print / Save as PDF report

## Production hardening still required

Before storing real or sensitive cases: add authentication and role-based access, encrypted server storage, immutable audit logs, retention/deletion controls, consent and safeguarding workflows, secure evidence upload, backups, threat modelling, legal review and independent security testing. Do not use it to make accusations, conduct covert surveillance, infer criminality from behaviour or make decisions about protected groups.

## Kids mode

Kids mode is for low-stakes disagreements between children. It uses short, gentle language, focuses on what each child saw and felt, and supports a trusted adult in agreeing a safe next step. It is not a replacement for safeguarding procedures, emergency services or professional support.

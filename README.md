# Clarity — Investigative Case Analyzer

Clarity is a client-side, evidence-first case-analysis prototype. It helps users organise incident facts, timelines, evidence, people, hypotheses and unanswered questions without producing guilt scores or automatically identifying a culprit.

## Run it

Open `index.html` in a browser. No build step or dependency installation is required. Data is stored in the current page session except the selected mode, which is saved in local storage.

## Included

- Responsive case workspace with Overview, Case file, Timeline, Evidence, Questions and Report views
- Add/remove people, evidence, timeline events and neutral questions
- Alternative-hypothesis review weights (explicitly not probabilities of guilt)
- Browser print / Save as PDF report
- Professional mode and a child-friendly Kids mode
- Safety language and guardrails around uncertainty, safeguarding and human review

## Kids mode

Kids mode is designed for low-stakes disagreements between children: it uses simple language, focuses on what each child saw/felt, encourages listening and fair next steps, and avoids calling anyone a liar or thief. It is not a replacement for a trusted adult, school safeguarding process or emergency services.

## Product safety boundary

This prototype is decision support, not law enforcement software. Do not use it to make accusations, conduct covert surveillance, infer criminality from behaviour or make decisions about protected groups. In a real deployment, add authentication, encryption, server-side audit logs, retention controls, access roles, consent/safeguarding workflows, legal review and independent testing before storing sensitive data.

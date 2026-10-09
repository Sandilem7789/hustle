# Learning inside Sell

Current evidence: the survey engine supports templates, ordered questions, per-shop assignments, draft answers, submission and generated programme reports. `/surveys/:id` renders question types and Save Progress/Submit. It has no learning topic content, answer key, quiz scoring or learning-progress model. Programme surveys must not simply be renamed quizzes with invented scores.

### LEARN-001 Read a business topic
As a merchant, I want short business lessons beside my shop tools, so that I can learn while trading.

Acceptance criteria
- Given an approved topic, when I open Learn, then its title and readable content appear and I can return to Sell without losing my place.
- Given a topic is unavailable or its fetch fails, when opened, then I see the difference from an empty content library.
- Given the curriculum library, when seeded in its agreed phase, then it is sourced from the 24 programme topics with approved content, not fabricated lessons or programme application questions.

Mobile and offline: short sections, plain language and lightweight text; cached topics remain readable offline with version/freshness indicated where material changed.
Data: existing `SurveyTemplate` may link a quiz; NEW: learning topic/content/version and topic-to-quiz relationship (P4.2 senior data design).
Out of scope: creating curriculum content in this task, making learning a gate to selling.

### LEARN-002 Save and answer a quiz
As a merchant, I want to answer and resume a topic quiz, so that interruptions do not lose my work.

Acceptance criteria
- Given my own quiz attempt, when I save partial answers, then reopening restores the saved answers; another merchant cannot read or modify them.
- Given required questions are unanswered, when I submit, then the missing questions are identified without losing other answers.
- Given a valid submission, when confirmed, then the attempt has a stable submitted state; repeated clicks cannot create duplicate completions.
- Given scoring/feedback has been configured under the agreed learning model, when submitted, then the result is derived from that version's rules rather than an AI-generated guess.

Mobile and offline: visible labels, native choice controls and 48px targets; offline drafts are clearly unsent until a later sync phase implements persistence and conflict handling.
Data: `SurveyQuestion` type/options/required/fieldKey and `SurveyAnswer.answerText`; NEW: versioned attempts, answer key/feedback and ownership model. Existing assignment statuses can inform design but are not assumed sufficient.
Out of scope: choosing pass marks, attempt limits, certificates, AI programme PDF generation.

### LEARN-003 See learning alongside trading
As a merchant, I want visible progress and a next lesson, so that I can continue learning without leaving my business workflow.

Acceptance criteria
- Given saved progress, when Learn opens, then completed, in-progress and unstarted topics are distinct and derived from my records.
- Given Today includes learning progress, when I follow its link, then I reach the corresponding topic or attempt.
- Given no completed learning, when I manage products/orders, then learning does not prevent ordinary trading; the platform's learning layer is not gatekept.

Mobile and offline: progress uses text as well as visuals; show last confirmed progress offline and do not turn unsent work into a completed lesson.
Data: NEW: per-account/topic progress and completion rules, linked to the survey engine where the senior's design allows.
Out of scope: leaderboards, earnings rewards or tying agent pay to quizzes.

## Open questions

- Supply the full approved list/content for all 24 topics; CONTEXT currently names fewer than 24. Who maintains/translates and approves revisions?
- Define quiz scoring, feedback, completion/pass rules, retries and treatment of an already-completed topic after content changes.
- Define migration/access for legacy `/surveys/:id` links and programme answers under O3; do not silently convert historical surveys into learning progress.

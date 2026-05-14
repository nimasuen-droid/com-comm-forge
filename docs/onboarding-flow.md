# Onboarding Flow

## Goal

Help a new user understand completions work quickly enough to navigate the app, inspect readiness, make a field update, and export a report.

## First-run Flow

1. Land on Portfolio Dashboard.
2. Show a short product orientation:
   - Systems are the foundation.
   - Punches block readiness.
   - MC, Commissioning, and Turnover roll up from subsystem data.
   - Documents and exports support owner/client review.
3. Prompt user to open the Marathon Refinery demo project.
4. Guide user through each module:
   - Systems: view SBS and RAG status.
   - Preservation: update last-done date.
   - Punch: raise and close a punch.
   - MC: tick checklist gates.
   - Commissioning: understand sequence gates.
   - Turnover: review handover readiness.
   - Documents: export reports.
   - Workflow: review auto-derived execution state.
5. End with suggested next action:
   - Import/create a real project.
   - Export an owner/client report.
   - Continue field capture on mobile.

## In-app Copy Requirements

Keep onboarding brief and operational. Avoid marketing copy inside the workspace.

Preferred patterns:

- Small welcome modal on first run.
- Module checklist with progress.
- Contextual "Learn" cards already present in modules.
- Glossary available from Learn cards.

## Completion Criteria

A user is onboarded when they can:

- Explain the difference between systems and subsystems.
- Identify a Cat A punch blocker.
- Update preservation data.
- Save local changes.
- Export one report.
- Find the workflow rollup.

## Future Implementation Notes

Store onboarding completion in local/project user preferences:

- `onboarding.completedAt`
- `onboarding.completedSteps`
- `onboarding.dismissed`

When backend auth is added, move this to the user profile.

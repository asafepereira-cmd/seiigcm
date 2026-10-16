<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Documents are generated client-side with jsPDF in `src/lib/pdf.ts`; the on-screen preview in `src/routes/index.tsx` must mirror it. Why: no server PDF runtime on Workers.
- The first shared administrator account uses `createFirstAccount` only when no auth users exist; only authenticated administrators may create manager accounts through server functions, with roles in `user_roles`; the UI never calls signUp. Why: no public registration or client-controlled privileges.
- Signature image data and dispatch choice are optional document fields stored with existing document JSON; dispatch signers come from `documento.ts` for both PDF and preview. Why: old documents remain compatible and downloaded documents match saved choices without public signature files.
- PDF paragraph justification places words using measured widths, leaving each final line natural. Why: single-line jsPDF justification does not reliably expand word spacing.
- The main-body editor uses Tiptap with optional structured JSON alongside plain body text; shared rich-text helpers drive safe preview spans and styled PDF wrapping. Why: retain selection-level formatting without breaking older documents or sending markup to AI.
- Recover recognized client module-load failures with a session-scoped, rate-limited full reload and a manual retry fallback. Why: dependency updates can invalidate cached route modules, especially in Safari, and router invalidation alone reuses the failed import.
- Document lifecycle status is stored in the dedicated documentos.status column, not document JSON; list ordering and status validation live in a shared browser-safe helper. Why: editor saves must not overwrite independently updated lifecycle status.
- Interface school branding uses a transparent derivative of the original crest; PDF and document-preview branding keep their original assets. Why: remove interface background edges without changing the official document model.

- Manager panels live under the client-only authenticated layout; emission screens additionally validate the admin role, and database RLS enforces every read/write. Why: managers only access assigned approvals.
- Document dispatch and final signature status are atomic PostgreSQL functions locking the document row. Why: concurrent signatures must not leave the lifecycle status stale.

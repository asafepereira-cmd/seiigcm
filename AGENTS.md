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
- Internal document process metadata is validated and snapshotted by salvar_documento; the shared identification helper drives PDF and preview. Why: process identity stays consistent across exports and archived versions.
- Manual document numbers are validated atomically in salvar_documento per type and year; reediting issued documents archives previous versions. Why: user-selected numbers must persist without silent renumbering or concurrent collisions.
- New document number suggestions share the type-and-year numbering helper across the editor and term generator. Why: one document category must never consume another category's sequence.
- The first shared administrator account uses `createFirstAccount` only when no auth users exist; only authenticated administrators may create manager accounts through server functions, with roles in `user_roles`; the UI never calls signUp. Why: no public registration or client-controlled privileges.
- Signature image data and dispatch choice are optional document fields stored with existing document JSON; dispatch signers come from `documento.ts` for both PDF and preview. Why: old documents remain compatible and downloaded documents match saved choices without public signature files.
- PDF paragraph justification places words using measured widths, leaving each final line natural. Why: single-line jsPDF justification does not reliably expand word spacing.
- The main-body editor uses Tiptap with optional structured JSON alongside plain body text; shared rich-text helpers drive safe preview spans and styled PDF wrapping. Why: retain selection-level formatting without breaking older documents or sending markup to AI.
- Recover recognized client module-load failures with a session-scoped, rate-limited full reload and a manual retry fallback. Why: dependency updates can invalidate cached route modules, especially in Safari, and router invalidation alone reuses the failed import.
- Document lifecycle status is stored in the dedicated documentos.status column, not document JSON; list ordering and status validation live in a shared browser-safe helper. Why: editor saves must not overwrite independently updated lifecycle status.
- Interface branding uses a pixel-preserving transparent derivative of the supplied logo; PDF and document-preview branding keep their original assets. Why: remove background edges without changing official artwork.

- Manager panels live under the client-only authenticated layout; emission screens additionally validate the admin role, and database RLS enforces every read/write. Why: managers only access assigned approvals.
- Document dispatch and final signature status are atomic PostgreSQL functions locking the document row. Why: concurrent signatures must not leave the lifecycle status stale.
- Emission panels use a paineis identity for document defaults and dispatch their own documents directly through authenticated RPCs without administrator review; ownership and panel permissions remain enforced. Why: all authorized emitters have independent document workflows without widening access to other panels.
- Document comments and signature opening/analysis timestamps are persisted with RLS and authenticated RPCs; public token reads only record first opening. Why: approval progress remains auditable across panels.
- Assigned document SELECT policies include individual user signers as well as manager roles; panel queries refresh periodically and on focus/reconnection. Why: custom emission panels must receive pending signatures without broadening edit permissions or requiring manual refresh.

- Shared DocumentViewer controls authorized content, versioned records, comments and PDF exports across panels; sector exports require signed status. Why: keep all viewing paths aligned with shared-panel restrictions.
- Received document cards derive membership from explicit recipients/current-version signature assignments, and never expose mutation controls, even to administrators. Why: received navigation is read/comment/sign/export only.
- PDF stamps resolve legacy manager identities through the shared signature identity helper and retain version-scoped signatures. Why: old requests with null names must not disappear or attach signatures to another version.
- In-app completion notices are user subscriptions in documento_avisos read against the current document lifecycle. Why: every current-version signature must finish before presenting download readiness.
- Panel maintenance notices are rendered by the shared AppHeader after authenticated identity is resolved, never on public signature pages. Why: keep panel messaging consistent without interrupting signature links.

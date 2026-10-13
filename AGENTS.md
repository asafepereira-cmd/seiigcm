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
- Shared single account: the first account is created via `createFirstAccount` only when no auth users exist; the UI never calls signUp. Why: access is restricted to one shared login.
- Signature image data and dispatch choice are optional document fields stored with existing document JSON; dispatch signers come from `documento.ts` for both PDF and preview. Why: old documents remain compatible and downloaded documents match saved choices without public signature files.
- PDF paragraph justification places words using measured widths, leaving each final line natural. Why: single-line jsPDF justification does not reliably expand word spacing.
- The main-body editor uses Tiptap with optional structured JSON alongside plain body text; shared rich-text helpers drive safe preview spans and styled PDF wrapping. Why: retain selection-level formatting without breaking older documents or sending markup to AI.

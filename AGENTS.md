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

- RSVP submissions are insert-only in Cloud with a database unique index on normalized names; database enforcement prevents concurrent duplicate replies.
- Keep private RSVP details separate from the public wishes table; a trigger publishes only names, messages, and timestamps for live subscribers.
- Load public wishes through the route query loader and invalidate that query on Realtime inserts and successful submissions so every viewer receives saved replies.

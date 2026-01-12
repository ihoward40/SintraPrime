# Notion AI Button Prompt — Enforce 2 Formats (Ready Idea → Short + Email)

Use this prompt as a Notion AI button on a page/template in **IDEAS VAULT — Distilled Thinking**.

## Preconditions
- Only run when `Stage = Ready`.

## Prompt

You are enforcing my extraction rule: every Ready idea must produce:
- 1 Short-form output (distribution)
- 1 Email output (asset ownership)

Input: the current Idea (this page) and its properties.

Goal:
- From this **Ready** idea, create **two** new entries in **CONTENT FACTORY — One Idea, Many Outputs**.

Create exactly 2 content entries with these settings:

Entry 1 (Distribution):
- Format = Short
- Title: clear, specific, based on the core idea
- Status = Draft
- Link `Source Idea` back to this idea

Entry 2 (Ownership):
- Format = Email
- Title: clear, specific, based on the core idea
- Status = Draft
- Link `Source Idea` back to this idea
- Optimize for clarity, persuasion, and list value

Then update this idea:
- Increment `Reuse Count` by +1

Return a short confirmation message listing the two created titles.

## Confirmation format

CREATED:
- Short: <title>
- Email: <title>

UPDATED IDEA:
- Reuse Count: <new value>

# Notion AI Button Prompt — Enforce 2 Formats (Ready Idea → Content Factory)

Use this prompt as a Notion AI button on a page/template in **IDEAS VAULT — Distilled Thinking**.

## Preconditions
- Only run when `Stage = Ready`.

## Prompt

You are enforcing my content extraction rule.

Input: the current Idea (this page) and its properties.

Goal:
- From this **Ready** idea, create **two** new entries in **CONTENT FACTORY — One Idea, Many Outputs**.

Create exactly 2 content entries with these settings:
1) Format = Short
2) Format = Long

For both entries:
- Title each clearly based on the core idea.
- Set `Status = Draft`.
- Link `Source Idea` back to this idea.

Then update this idea:
- Increment `Reuse Count` by +1.

Return a short confirmation message listing the two created titles.

## Confirmation format

CREATED:
- Short: <title>
- Long: <title>

UPDATED IDEA:
- Reuse Count: <new value>

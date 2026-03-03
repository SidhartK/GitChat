# GitChat Quickstart

This walkthrough demonstrates every GitChat feature in about 5 minutes.
Open this folder (`demo/`) as your workspace in the Extension Development Host,
follow the steps below, and you'll have a version-controlled analysis document
by the end.

## Prerequisites

- Node.js 18+
- Git
- An Anthropic or OpenAI API key

## 0. Launch the Extension Development Host

From the repo root:

```bash
npm run build
code --extensionDevelopmentPath=. demo/
```

Or press **F5** in VS Code (the included `launch.json` does the same thing).

A new VS Code window opens with GitChat loaded and `demo/` as the workspace.

## 1. Set your API key

1. Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run **GitChat: Set API Key**
3. Paste your Anthropic or OpenAI key

> To switch providers, change `gitchat.provider` in Settings first.

## 2. Open the GitChat sidebar

Click the GitChat icon in the Activity Bar (left edge). You'll see:

- **Chat feed** — empty for now ("No entries yet")
- **Note input** — text area at the bottom
- **Send / Checkpoint / Restructure** buttons

## 3. Write a note

Type a note in the text area and click **Send** (or press `Cmd+Enter`):

```
Starting analysis of city weather data. Looking at temperature,
humidity, and wind speed across 5 US cities.
```

The note appears as a card in the chat feed with a timestamp.

## 4. Capture a notebook cell

1. Open `sample_analysis.ipynb` from the Explorer
2. The notebook has pre-run outputs. Click on the **first code cell**
   (the DataFrame display)
3. Click **Send to GitChat** in the cell toolbar (or right-click the cell)

The cell output appears as an artifact card in the chat feed with a
"text" badge.

Repeat for the **summary statistics cell** (cell 2) — this one has
HTML output and will be captured as an `html` artifact.

## 5. Add an observation

Send another note:

```
Temperature and humidity are negatively correlated (-0.72).
Seattle is both the most humid and windiest city.
```

## 6. Checkpoint

1. Click the **Checkpoint** button
2. Enter a title: `Initial exploration`
3. Click **Commit**

GitChat will:

- Send your notes + artifact references to the LLM
- Get back a formatted markdown section
- Append it to `analysis.md` (created automatically)
- Run `git init` (first time only), `git add -A`, `git commit`

A green "Committed" marker appears in the chat feed.

### Verify it worked

Open a terminal in the Extension Development Host and run:

```bash
cat analysis.md
```

You should see a structured markdown document with your notes,
headers, and artifact references.

```bash
git log --oneline
```

You should see:

```
abc1234 [checkpoint] Initial exploration
```

Check the `artifacts/` directory:

```bash
ls artifacts/
```

You'll find files like `001_cell_output.md` and `002_cell_output.html`.

## 7. Continue working

Capture the correlation output (cell 3) and the extremes summary (cell 4).
Add a note:

```
Austin is the clear outlier — warmest and driest.
Denver is cold and dry. Coastal cities trend humid.
```

Checkpoint again with title `Correlations and outliers`.

Now check the git log:

```bash
git log --oneline
```

```
def5678 [checkpoint] Correlations and outliers
abc1234 [checkpoint] Initial exploration
```

And `analysis.md` now has two sections separated by `---`.

## 8. Restructure the document

Once you have multiple sections, try the **Restructure** button.
This sends the entire document to the LLM, which reorganizes it
with improved headers, logical ordering, and a table of contents —
without removing any content.

After restructure, check:

```bash
git log --oneline
```

```
789abcd [restructure] Document reorganized
def5678 [checkpoint] Correlations and outliers
abc1234 [checkpoint] Initial exploration
```

## 9. Paste an image (bonus)

You can also paste images directly into the note input:

1. Copy any image to your clipboard (e.g. a screenshot of a chart)
2. Click in the note input and press `Cmd+V` / `Ctrl+V`
3. A preview thumbnail appears briefly
4. The image is saved to `artifacts/` as a PNG

## Summary

| Feature              | How                                          |
| -------------------- | -------------------------------------------- |
| Write notes          | Type in sidebar, click Send or `Cmd+Enter`   |
| Capture cell outputs | "Send to GitChat" in notebook cell toolbar   |
| Paste images         | `Cmd+V` in the note input                    |
| Checkpoint           | Click Checkpoint, enter title, click Commit  |
| Restructure          | Click Restructure                            |
| Set API key          | Command Palette → "GitChat: Set API Key"     |
| Switch provider      | Settings → `gitchat.provider`                |
| Change doc name      | Settings → `gitchat.documentName`            |

Each checkpoint produces a git commit. Your full analysis history is
always recoverable with `git log` and `git diff`.

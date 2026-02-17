# Page Summarizer Plus (Local Fork)

Page Summarizer Plus is a Chrome extension that utilizes OpenAI's chat completions
API to summarize text from a web page. Just highlight the text you want to
summarize, click the extension icon, and get a concise summary.

This repository is a local fork of `sysread/page-summarizer` with custom behavior.

## Features

- Summarize the content of any web page
- Summarize the contents of selected text
- Fill in text with GPT
- Customize instructions to get the information you want
- Add persistent custom instructions for all summaries
- Keep the popup pinned to the top while summary content streams
- Action icon context menu batch actions:
  - `Open+Summarize... > All tabs in this window`
  - `Open+Summarize... > Selected tabs in this window`
- Safety controls for batch open:
  - Internal browser URLs are skipped (`chrome://`, `edge://`, etc.)
  - Warning confirmation appears for more than 15 tabs
- Uses the OpenAI conversations API

![Summarize a web page](./docs/summarize-page.gif)

![Summarize selected text](./docs/summarize-selection.gif)

## Installation

### Prerequisites

You'll need to have Google Chrome or a Chromium-based browser installed. This
_might_ work on Firefox, but I took exactly zero minutes ensuring my API calls
were cross platform. It does work on Opera, though.

- Sign up for an [OpenAI API account](https://platform.openai.com/signup)
- Create an [API key](https://platform.openai.com/api-keys)

### Installation from the Chrome Web Store

Go [here](https://chromewebstore.google.com/detail/page-summarizer/mcebcgkikhcjigekcekkicnppoldnikf).

### Installation from latest release

1. Go to the [Releases](https://github.com/sysread/page-summarizer/releases) page of this repository.
2. Download the latest `chrome-extension.zip` or `firefox-extension.zip` based on your browser.
3. Unzip the downloaded ZIP file.
4. Open Google Chrome and navigate to `chrome://extensions/`.
5. Enable "Developer mode" in the top-right corner.
6. Click "Load unpacked" and select the directory where you unzipped the downloaded ZIP file.
7. The extension icon should now appear in your Chrome toolbar.
8. Right-click the extension icon and choose "Options", then enter your OpenAI API key and preferred model.

### Manual Installation from repo

1. Clone this repository to your local machine:

```bash
   git clone https://github.com/sysread/page-summarizer.git
```
2. Open Google Chrome and navigate to chrome://extensions/.
3. Enable "Developer mode" in the top-right corner.
4. Click "Load unpacked" and select the directory where you cloned the repository.
5. The extension icon should now appear in your Chrome toolbar.
6. Right-click the extension icon and choose "Options", then enter your OpenAI API key and preferred model.

## Usage

### Summarize the entire page

- Click the Page Summarizer extension icon
- Click "Summarize page"
- Optional: toggle `Pin view to top while streaming` to prevent auto-scroll while content grows

### Open+Summarize from action icon context menu

- Right click the extension action icon
- Choose `Open+Summarize...`
- Pick one:
  - `All tabs in this window`
  - `Selected tabs in this window`

Behavior:
- New summary tabs are inserted immediately after each source tab
- Unsupported browser-internal URLs are ignored
- If more than 15 valid tabs are included, a confirmation popup is shown before opening tabs

### Summarize selected text

- Select the text you wish to summarize
- Right click and choose "Summarize selection" in the context menu

### Fill in text

- Click on the text area you want to fill in
- Right click and choose "Fill with text using GPT"
- In the dialog box that appears, explain what you want GPT to say
- Optionally check 'Include page contents?' if context may be needed
- Click "Submit"

## Troubleshooting

- Make sure you've entered the correct OpenAI API key.
- Make sure your OpenAI account has sufficient API quota.
- Check the JavaScript console for any errors.
- If `manifest.json` permissions changed, reload the extension in `chrome://extensions`.
- Find the bugs in my code and submit a PR

## Fork Changes

This fork includes the following customizations relative to upstream:

- Branding/UI title updated to `Page Summarizer Plus`
- Default prompt template replaced with a structured summary format including:
  - Executive summary
  - Section key points
  - References/tools/people
  - Immediate/future actions
  - Source link
  - Windows-safe `title_source` string output
- Popup scroll control: `Pin view to top while streaming`
- New action context submenu for batch `Open+Summarize`
- Batch safety guardrails (URL filtering + warning threshold at 15 tabs)
- Added permissions: `tabs` and host permissions `<all_urls>` for reliable multi-tab summarization

## Development 
* Windows is ok
* Make changes locally
* In chrome:extension, update extensions 
* Reload and retry 

## Contributing

Pull requests are welcome! For major changes, please open an issue first to
discuss what you would like to change.

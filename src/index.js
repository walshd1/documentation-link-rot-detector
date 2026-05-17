const core = require('@actions/core');
const fs = require('fs');
const PROMPT = `You are the Documentation Link Rot Detector, an AI assistant that identifies and reports broken links within documentation. Your primary function is to analyze documentation content, understand the context surrounding hyperlinks, and determine if those links are still valid and relevant.

**Input:**

*   **Documentation Content:** {documentation_content} (The text of the documentation to be analyzed.)
*   **Base URL (Optional):** {base_url} (The base URL of the documentation site. Used for resolving relative links. If not provided, assume all links are absolute.)
*   **Link Check Depth (Optional):** {link_check_depth} (How many levels deep to check redirects. Defaults to 3 if not specified.)
*   **Allowed HTTP Status Codes (Optional):** {allowed_http_status_codes} (A comma-separated list of HTTP status codes that are considered valid. Defaults to 200 if not specified. Example: 200,301,302)

**Process:**

1.  **Link Extraction:** Extract all hyperlinks from the provided 'Documentation Content'.
2.  **Contextual Understanding:** Analyze the surrounding text of each hyperlink to understand its purpose and relevance within the documentation.
3.  **Link Validation:** For each extracted link:
    *   Resolve relative links using the provided 'Base URL' if available.
    *   Check the HTTP status code of the link. Follow redirects up to 'Link Check Depth' levels.
    *   Consider the 'Allowed HTTP Status Codes' as valid.
4.  **Broken Link Identification:** Identify links that result in HTTP status codes outside the 'Allowed HTTP Status Codes' or that cannot be resolved.
5.  **Relevance Assessment (Optional, if possible with current capabilities):** Based on the contextual understanding, determine if the broken link significantly impacts the comprehension or usability of the documentation. Flag links that are crucial for understanding or completing tasks.

**Output:**

A structured report of broken links, including:

*   **Link URL:** {broken_link_url} (The URL of the broke`;
async function run() {
  try {
    const key = core.getInput('gemini_api_key');
    const token = core.getInput('service_token');
    const ctx = { repoName: process.env.GITHUB_REPOSITORY || '', event: process.env.GITHUB_EVENT_NAME || '' };
    try { Object.assign(ctx, JSON.parse(fs.readFileSync('package.json', 'utf8'))); } catch {}
    let prompt = PROMPT;
    for (const [k, v] of Object.entries(ctx)) prompt = prompt.replace(new RegExp('{' + k + '}', 'g'), String(v || ''));
    let result;
    if (key) {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 2000 } })
      });
      result = (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (token) {
      const r = await fetch('https://action-factory.walshd1.workers.dev/generate/documentation-link-rot-detector', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx)
      });
      result = (await r.json()).content || '';
    } else throw new Error('Need gemini_api_key or service_token');
    console.log(result);
    core.setOutput('result', result);
  } catch (e) { core.setFailed(e.message); }
}
run();

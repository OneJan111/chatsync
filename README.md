<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# chatsync

Multi-platform live chat dashboard built with React 19, Vite, and Express.

## Run locally

**Prerequisites:**  Node.js

1. Install dependencies with `npm install`.
2. Optionally add `GEMINI_API_KEY=your-key` to `.env.local` to enable the AI Co-Pilot and Gemini translation fallback. Without a key, AI features are disabled.
3. Start the app with `npm run dev`.

The dashboard language can be changed from the language selector in the header. English, Simplified Chinese, and Japanese are supported, and the selection is saved in the browser.

Run the automated TypeScript tests with `npm test`.

Chat translation uses Google's free Translate service by default and does not require an API key. Gemini is used for translation only if Google Translate is unavailable and a server-side `GEMINI_API_KEY` is configured. Keep the key in `.env.local`; do not expose it through a `VITE_` variable.

## Live chat connections

The live chat feed supports Bilibili, YouTube, and MissEvan rooms. Configure room identifiers in **📡 房间监控设置**; incoming messages are shared by streamer and viewer modes. When no room configuration has been saved in the browser, `BILIBILI_ROOM_ID`, `MISSEVAN_ROOM_ID`, and `YOUTUBE_CHANNEL` in the server-side `.env.local` set the default identifiers. Public Bilibili danmaku and MissEvan rooms do not require login or an API key. If you choose to provide Bilibili credentials, paste the entire Cookie string into the single Cookie field; it is stored in the local browser and sent only to the local Chatsync server when connecting. Do not split out `SESSDATA`, `bili_jct`, or `DedeUserID`. The server signs the danmaku-auth request with WBI, as the reference `bilibili-api-python` client does. Alternatively, set the full cookie string as `BILIBILI_COOKIE` in `.env.local`. Keep cookies private. Bilibili `-352` means the danmaku authentication request was blocked by risk control; it does not mean that login is required, and adding a cookie may not clear the block. YouTube chat uses the Data API when `YOUTUBE_API_KEY` is configured and falls back to YouTube's public web chat endpoint when the key is missing or the API request fails. The web endpoint is unofficial and may change; YouTube can also restrict it. A YouTube live video URL/ID or channel handle can be used.

Twitch and Kick are not connected to live chat yet. The local simulator is off by default and can be started separately for preview.

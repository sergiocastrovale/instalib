import { session } from 'electron'

const REALISTIC_CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export function installCdnHeaderOverrides(): void {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.cdninstagram.com/*', '*://*.fbcdn.net/*'] },
    (details, callback) => {
      delete details.requestHeaders['Referer']
      delete details.requestHeaders['Origin']
      details.requestHeaders['User-Agent'] = REALISTIC_CHROME_UA
      callback({ requestHeaders: details.requestHeaders })
    }
  )
}

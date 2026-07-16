# Instalib

## 1. Get your saved videos from Instagram

Instagram doesn't let apps read your saved posts directly, so you export them yourself:

1. Open Instagram (app or website) → go to your profile.
2. **Accounts Center** → **Your information and permissions** → **Export your information**.
3. Choose **Export to device**.
4. Select **Some of your information**, then pick only **Saved**.
5. Set the format to **JSON** (not HTML).
6. Submit. Instagram emails you a download link, usually within an hour.
7. Download the `.zip` file it gives you. Don't unzip it - Instalib reads it directly.

## 2. Install Instalib

- **Installer**: download it and run it like any program - it installs and adds a shortcut.
- **Portable**: download the single file and double-click it. Nothing is installed;
  a small folder appears next to it holding all your data. Great for a USB stick
  or a computer you don't want to install anything on.

## 3. First launch

The app downloads two small free helper tools it needs (this happens once,
automatically, and needs internet - takes a minute or two). You'll see a
progress screen. When it's done, you're in.

## 4. Import your videos

Drag the `.zip` file from Step 1 onto the Instalib window (or click to choose it).
Your saved videos appear, organized into collections matching your Instagram saved collections.

You can do this again later with a fresh export - Instalib updates what's changed
without creating duplicates.

## 5. Log in to Instagram in your browser

Instalib fetches videos through your regular browser login - it doesn't ask for
your Instagram password itself. Just make sure you're logged into Instagram in
a browser on your computer (Firefox, Chrome, Edge...).

Go to **Settings** in Instalib and pick that browser from the list. If you're on
Windows, Firefox tends to work most reliably.

## 6. Watch

Click any video to play it. Videos stream from the web by default - no waiting
to download. Use the player controls to change speed, skip around, or set a
loop between two points (handy for learning a tricky section).

## 7. Go offline (optional)

Don't want to depend on your internet, or worried a video might get deleted from
Instagram? Go to the **Sync** page and click **Start sync** - Instalib downloads
your videos to a folder on your computer (pick which one in Settings; it
defaults to your normal Videos folder). Once a video is downloaded, it plays from
your computer automatically - you'll see a "Downloaded" badge on it.

## 8. Organize

- **Favorites** - click the heart on any video.
- **Collections** - create your own from the Library page, or add a video to one
  from the Watch page.
- **Notes** - every video has a notes box. Great for jotting down what you
  learned, timestamps, or reminders.

## 9. Settings

- **Dark mode** - on by default, toggle it anytime.
- **Sync folder** - where downloaded videos are saved.
- **Instagram cookies** - which browser Instalib borrows your login from.
- **Update tool** - Instagram changes often; if videos stop loading, click
  **Update** here first.

## Troubleshooting

- **Videos won't load / errors fetching video** - make sure you're logged into
  Instagram in the browser you picked in Settings, then try the **Update** button
  there. If it still fails, the video plays through a basic Instagram embed instead
  (fewer controls, but still watchable).
- **Mac says the app is "damaged" or can't be opened** - right-click the app →
  **Open**. If that option isn't there, open Terminal and run:
  `xattr -dr com.apple.quarantine /Applications/Instalib.app`
- **Windows Defender / antivirus warning** - this is common for small independent
  apps without a paid certificate. Choose "More info" → "Run anyway" if you trust
  the source you downloaded it from.

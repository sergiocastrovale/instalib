## What's this?

I am a musician, and most of the videos I save on Instagram are great instrument or mixing tutorials which I want to learn. Unfortunately, relying on Instagram for this is terrible, since you have basically no control over the video, and managing your catalogue of saved videos is very frustrating.

Instalib allows you to import a collection of your `saved` videos from Instagram and have a better viewing and learning experience. It features things like:

- Downloading all or part of your collection for offline viewing (still works if you don't!)

- Picture-in-picture allowing you to keep organizing your library while watching the video

- Focus mode, which removes unnecessary clutter from the UI and expands the video

- Repeating a fixed section of the video

- Note taking

- Favorites

Think of this like your own personal Youtube for Instagram saved content, with a bunch of neat additions.

## Install

No installation needed. Download the single file, run it from anywhere (a USB
stick works fine). All its data stays in a folder right next to it.

New here? Read **[setup.md](./setup.md)** for a full walkthrough with pictures-in-words.

## First launch

The first time you open Instalib, it downloads two small free helper tools
it needs (for fetching video info and converting video files). This needs
an internet connection and takes a minute or two — only happens once.

## Dependencies



## Notes

Instalib needs to know you're logged into Instagram in your browser, so it can relay it to YT-DLP and fetch the videos. [This is how YT-DLP works on its own](https://github.com/yt-dlp/yt-dlp/wiki/FAQ#i-extracted-a-video-url-but-it-does-not-play-on-another-machine--in-my-web-browser), it's not specific to this app. Requests are throttled to avoid rate-limits.

This is the _only_ point of contact with Instagram - it does not store any credentials or information whatsoever.

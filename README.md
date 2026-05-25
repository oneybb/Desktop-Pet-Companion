
# Desktop Pet Companion

This contains everything you need to run the companion locally or package it as a floating desktop widget.

The packaged desktop app launches directly into widget mode with the built-in cat images and interactions.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the web app:
   `npm run dev`

Open `http://localhost:3000`.

## Build From Uploaded Images And Settings

Run the web app with the local export server:
`npm run dev:export`

Then open `http://localhost:3000`, upload/configure your pet, go to **Windows App Guide**, and click **Build Downloadable Widget App**.

The app sends your current browser uploads/settings to the local export server, writes them into `public/desktop-pet-seed.json` and `public/exported-assets/`, builds the desktop app, then shows a download link.

The build is for the operating system you are currently using. For example, build on macOS for a Mac app and on Windows for a Windows app.

## Run As Desktop Widget

1. Install dependencies:
   `npm install`
2. Run the transparent always-on-top widget:
   `npm run desktop:dev`

Hover near the top of the widget to reveal the drag handle and quit button.

## Build A Downloadable App

Create an unpacked app for local testing:
`npm run desktop:pack`

Create installable app files:
`npm run desktop:dist`

On macOS, the packaged app output is written to `release/`.

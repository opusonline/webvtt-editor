WebVTT Editor
=============

This is a very simple editor for WebVTT subtitles.

My wife needed a simple app some time ago for doing such a task and all available apps where too complicated or too expensive. I've noticed that browsers have an API for subtitles and so I've created this little app to add some cues and be able to see the outcome.

It is written in ES5 to support some older browsers. If you have trouble, please drop a note and we'll find a solution.

# How it works

## Load Video
Choose any local video file. To start playing, click on the video itself or the play button.
*Good to know:* You can also drag&drop a video file on the app window to load.

## Progress
You can click on the progress bar to jump to a desired time position. You can also use the left and right arrow keys to jump 2 seconds. Pressing the `Alt` key together with left or right arrow will jump just 0.5 seconds.

## Load VTT
Import any existing VTT file. If starting from scratch you don't need to import any.
*Good to know:* You can also drag&drop a VTT file on the app window to load.

## Add cue
Add cue will append a new cue to the list without any timestamps. Insert your text and set times related to the video play time.

## Set time
When no timestamp is set, a button appears `Set time`. Set the video to desired time position and click on `Set time` button to insert the current timestamp.
If a time was already set, a button is shown on hover the changes the time to the current time position.

## Set text
Add or change the text of a cue at any time. It will be updated immediately.

## Sort
This will sort cues related to start and end time. This happens automatically when you Export VTT, becuae it is required in the VTT format.

## Jump to cue
Each cue row has a button that allows to quickly jump the video to the start position of the selected cue.

## Delete cue
There's a delete button on each cue row to simply delete the selected cue.

## Move up and down
Move the selected cue up or down manually.

## Export VTT
Cues with not timestamps are ignored. Cues are sorted by start and end time. Generated file has the ending `.vtt` and mimeType `text/vtt`.

## Fullscreen
There's a fullscreen button next to the progress bar that switches layout to a wide view mode so that the cue list is hidden and video is expanded to full browser window width.
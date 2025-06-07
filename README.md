# node-rtsp-to-hls

Server nodejs to translate signal from rtsp to hls<br>
and displaying transciptions converted from video stream by Google Cloud Speech-to-text

### Routing

- '/login' - login to admin panel
- '/panel' - manage our stream
- '/' - main route for all clients to see stream

### Functions

- login page to manage our stream
- by admin panel you can run stream and record stream
- translating live video from rtsp camera to hls file and sending on frontend
- record stream on server
- translating audio from live stream and displaying transciptions on video stream by Google Cloud Speech-to-text

### Teach Stack

- express.js
- fluent-ffmpeg
- @google-cloud/speech
- websocekt

### To Run

**Configure .env file in main root of project:<br>**
RTSP_URL= your rtsp url 'rtsp://<login>:<password>!@<ip>:<port>' or any other source of video<br>
SESSION_KEY='your session key'<br>
USER_LOGIN='your login'<br>
USER_PASSWORD='your password'<br>
GOOGLE_APPLICATION_CREDENTIALS='your path to key from gooogle-cloud/speech to text API'<br>

Go to the main root of project<br>
install dependencies: **npm install**<br>
run server, enter in terminal: **node app.js**
and run app, in browser:**http:locallhost:3000**


#FFMPEG PIPELINE
The main FFmpeg pipeline in this RTSP to HLS conversion project is implemented in the processFFmpegStream method of the Stream class. The pipeline:
Takes an RTSP stream URL as input
Applies these input options for better streaming:
-rtsp_transport tcp
-re (read at native frame rate)
-fflags nobuffer (reduce buffering for lower latency)
-flags low_delay (enable low delay flags)
-strict experimental
-thread_queue_size 512
Applies these HLS conversion options:
-s 640x360 (resolution)
-start_number 0
-hls_time 1 (segment duration)
-hls_list_size 6 (number of segments in playlist)
-hls_init_time 1
-hls_segment_type mpegts
-hls_flags delete_segments+append_list+discont_start+split_by_time
-f hls (output format)
-g 30 (keyframe interval)
-sc_threshold 0 (scene change detection threshold)
-preset ultrafast
-tune zerolatency
-profile:v baseline
-level 3.0
Various reconnect options
Uses these codecs:
Video: libx264
Audio: aac
Outputs to an m3u8 playlist file with ts segments in the public/hls directory


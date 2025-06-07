# RTSP to HLS Streaming Server

A Node.js server that converts RTSP streams to HLS format for web playback, with recording capabilities.

## Features

- Convert RTSP video streams to HLS format for browser playback
- Low-latency streaming with optimized settings
- Record stream segments to MP4 files
- User authentication for admin functions
- Modern web interface
- RESTful API

## Project Structure

```
├── backend/                # Server-side code
│   ├── config/             # Configuration files
│   ├── controllers/        # API controllers
│   ├── middleware/         # Express middleware
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   └── utils/              # Utility functions
│
├── frontend/               # Client-side code
│   ├── public/             # Static assets
│   │   ├── images/         # Image assets
│   │   ├── js/             # JavaScript files
│   │   └── styles/         # CSS files
│   └── src/                # Source code
│       ├── components/     # UI components
│       ├── pages/          # Page templates
│       └── utils/          # Utility functions
│
├── storage/                # Storage directories
│   ├── hls/                # HLS stream segments
│   └── recordings/         # Recorded video files
│
├── .env                    # Environment variables
├── package.json            # Dependencies and scripts
└── README.md               # Project documentation
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/rtsp-to-hls.git
cd rtsp-to-hls
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your configuration:
```
RTSP_URL=rtsp://username:password@ip-address:port/stream
RTSP_URL_SECOND=rtsp://username:password@ip-address:port/stream2
PORT=3000
AUTH_ENABLED=false
AUTH_USERNAME=admin
AUTH_PASSWORD=admin123
JWT_SECRET=your_jwt_secret
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

Then open your browser at http://localhost:3000

## API Endpoints

### Stream Management
- `GET /api/streams/status` - Get stream status
- `GET /api/streams/health` - Get stream health metrics
- `POST /api/streams/start` - Start a stream
- `POST /api/streams/stop` - Stop a stream

### Recording Management
- `GET /api/recordings` - List all recordings
- `POST /api/recordings/start` - Start recording
- `POST /api/recordings/stop` - Stop recording
- `DELETE /api/recordings/:filename` - Delete a recording

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify authentication

## License

ISC

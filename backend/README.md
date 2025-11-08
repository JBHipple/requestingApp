# Request List Backend

Express.js backend for the torrent request list application with SQLite database integration.

## Features

- RESTful API for managing torrent requests
- SQLite database for persistent storage
- CORS enabled for frontend communication
- Request status management (pending, in-progress, completed)
- Priority handling
- Request reordering support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Requests

- `GET /api/requests` - Get all requests
- `POST /api/requests` - Create a new request
- `PUT /api/requests/:id/status` - Update request status
- `PUT /api/requests/:id/sortorder` - Update request sort order
- `DELETE /api/requests/:id` - Delete a request
- `PUT /api/requests/reorder` - Update request order

### Health

- `GET /api/health` - Health check endpoint

## Database Schema

### Requests Table
- `rowId` - Primary key (auto-increment)
- `RequestText` - Request text content
- `SubmitDate` - Date/time when request was submitted
- `SubmittedBy` - User who submitted the request
- `Status` - Request status (pending, in-progress, completed)
- `Priority` - Boolean priority flag
- `SortOrder` - Integer for custom ordering

### Users Table
- `id` - Primary key (auto-increment)
- `name` - User name (unique)
- `created_at` - Creation timestamp

## Example Usage

### Create a request
```bash
curl -X POST http://localhost:3001/api/requests \
  -H "Content-Type: application/json" \
  -d '{"text": "Download latest movie", "submittedBy": "John", "priority": true, "sortOrder": 0}'
```

### Update request status
```bash
curl -X PUT http://localhost:3001/api/requests/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in-progress"}'
```

### Update request sort order
```bash
curl -X PUT http://localhost:3001/api/requests/1/sortorder \
  -H "Content-Type: application/json" \
  -d '{"sortOrder": 5}'
```

### Get all requests
```bash
curl http://localhost:3001/api/requests
```

# Task Flow

A modern Timeline/Gantt chart visualization for task management.

## Features

- **Interactive Gantt Chart** - Drag to resize tasks, adjust dates visually
- **Multiple View Modes** - Hour, Day, Week, Month views
- **Progress Tracking** - Visual progress bars on each task
- **Color Coding** - Assign colors to tasks for easy identification
- **Persistent Storage** - Tasks saved to local JSON file
- **Responsive Design** - Works on desktop and tablet

## Quick Start

```bash
# Run the startup script
./start.sh
```

Or start servers individually:

```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend
cd frontend
npm install
PORT=3009 npm start
```

## URLs

- **Frontend**: http://localhost:3009
- **Backend API**: http://localhost:3109

## Usage

1. **Add Task** - Click "+ Add Task" button
2. **Edit Task** - Double-click any task bar or click in the sidebar
3. **Resize Task** - Drag the edges of a task bar
4. **Move Task** - Drag the task bar to a new date
5. **Update Progress** - Drag the progress handle on a task bar
6. **Change View** - Use Hour/Day/Week/Month buttons

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | Get all tasks |
| GET | /api/tasks/:id | Get single task |
| POST | /api/tasks | Create new task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |

## Tech Stack

- **Frontend**: React 18, gantt-task-react
- **Backend**: Node.js, Express
- **Storage**: JSON file (backend/data/tasks.json)

## Project Structure

```
task_list/
├── backend/
│   ├── server.js      # Express API server
│   ├── data/          # JSON data storage
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.js     # Main React component
│   │   ├── App.css    # Styles
│   │   └── index.js   # Entry point
│   └── package.json
├── start.sh           # Startup script
└── README.md
```

# Project M4chineMind 2.0

This project is a web-based CRUD application for managing industrial machines, featuring a Go backend and a React frontend.

## Project Structure

- `backend/`: Go API REST
- `frontend/`: React web application

## Prerequisites

- [Go](https://golang.org/doc/install) (version 1.22 or newer)
- [Node.js](https://nodejs.org/en/download/) (version 18 or newer)
- [npm](https://www.npmjs.com/get-npm)

## How to Run

### Backend

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Tidy up and install dependencies:**
   ```bash
   go mod tidy
   ```

3. **Run the server:**
   ```bash
   go run main.go
   ```
   The backend server will start on `http://localhost:8080`.

### Frontend

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at the URL provided by Vite (e.g., `http://localhost:5173`).

## Technologies Used

- **Backend:**
  - Go
  - `net/http` for the web server
  - `github.com/google/uuid` for ID generation

- **Frontend:**
  - React
  - TypeScript
  - Vite
  - Tailwind CSS

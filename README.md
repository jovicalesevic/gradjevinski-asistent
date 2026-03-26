# Gradjevinski asistent

Projekat je nekompletan a rad na njemu pauziran.

## Prerequisites

- **Node.js** 20 or newer

## Environment variables (MongoDB)

The backend needs a **`backend/.env`** file with your MongoDB connection settings. At minimum, define **`MONGO_URI`** (used by Mongoose to connect to MongoDB). Without this file, the server cannot connect to the database.

Example shape (adjust values for your cluster):

```env
MONGO_URI=mongodb+srv://user:password@cluster.example.mongodb.net/dbname
PORT=5000
```

`PORT` is optional (defaults to `5000`).

## Running the project

You need **two terminals**: one for the API and one for the Vite dev server.

### Backend

From the repository root:

```bash
cd backend && node server.js
```

### Frontend

From the repository root (in a second terminal):

```bash
npm run dev
```

The frontend dev server will print a local URL (typically `http://localhost:5173`). Ensure the backend is running so API calls from the app succeed.

## Scripts (from repository root)

| Command | Description |
|--------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run backend` or `npm start` | Run the backend (`node backend/server.js`) |

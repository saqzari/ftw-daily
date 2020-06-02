// NOTE: this server is purely a dev-mode server. In production, the
// server/index.js server also serves the API routes.

// Configure process.env with .env.* files
require('./env').configureEnv();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const apiRouter = require('./apiRouter');

const radix = 10;
const PORT = parseInt(process.env.DEV_API_SERVER_PORT, radix);
const app = express();

// NOTE: CORS is only needed in this dev API server because it's
// running in a different port than the main app.
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`API server listening on ${PORT}`);
});

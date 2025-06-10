const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load .env variables
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// MongoDB URI using env variables
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8ek00d7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// MongoDB Client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Run DB connection
async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error("Failed to connect:", err);
  }
}
run();

// Root route
app.get('/', (req, res) => {
  res.send('WhereIsIt app is cooking!');
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const express = require("express");
const cors = require("cors");
require("dotenv").config(); // Load .env variables
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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

    const db = client.db("whereIsItDB");
    const itemsCollection = db.collection("items");

    // --- All routes ---
    app.get("/allItems", async (req, res) => {
      try {
        const allItems = await itemsCollection.find().toArray();
        res.send(allItems);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch items", error: err });
      }
    });

    // Post item route
    app.post("/addItems", async (req, res) => {
      const item = req.body;
      try {
        const result = await itemsCollection.insertOne(item);
        res.status(201).send({
          message: "Item added successfully",
          insertedId: result.insertedId,
        });
      } catch (err) {
        res.status(500).send({ message: "Failed to add item", error: err });
      }
    });

    // Delete item route:
    app.delete("/items/:id", async (req, res) => {
      const id = req.params.id;

      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: "Invalid ID format" });
      }

      try {
        const query = { _id: new ObjectId(id) };
        const result = await itemsCollection.deleteOne(query);

        if (result.deletedCount === 0) {
          return res.status(404).send({ error: "Item not found" });
        }

        res.send(result);
      } catch (error) {
        console.error("❌ Delete failed:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });
  } catch (err) {
    console.error("Failed to connect:", err);
  }
}

run();

// Root route
app.get("/", (req, res) => {
  res.send("WhereIsIt app is cooking!");
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

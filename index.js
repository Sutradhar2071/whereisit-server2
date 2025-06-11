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

    // GET /items?sort=date_desc&limit=6
    app.get("/items", async (req, res) => {
      try {
        const sortParam = req.query.sort;
        const limit = parseInt(req.query.limit) || 0;

        let sortOption = {};
        if (sortParam === "date_desc") {
          sortOption = { date: -1 }; // latest date first
        }

        const items = await itemsCollection
          .find()
          .sort(sortOption)
          .limit(limit)
          .toArray();

        res.send(items);
      } catch (error) {
        console.error("Error fetching sorted/limited items:", error);
        res.status(500).send({ message: "Failed to fetch items", error });
      }
    });

    // get item by id
    app.get("/items/:id", async (req, res) => {
      const id = req.params.id;
      const item = await itemsCollection.findOne({ _id: new ObjectId(id) });

      if (!item) {
        return res.status(404).send({ message: "Item not found" });
      }

      res.send(item);
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

    // updated item
    app.put("/updateItems/:id", async (req, res) => {
      const id = req.params.id;
      const updatedItem = req.body;

      // Validate ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid ID format" });
      }

      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          postType: updatedItem.postType,
          thumbnail: updatedItem.thumbnail,
          title: updatedItem.title,
          description: updatedItem.description,
          category: updatedItem.category,
          location: updatedItem.location,
          date: updatedItem.date,
          contactName: updatedItem.contactName,
          email: updatedItem.email,
        },
      };

      try {
        const result = await itemsCollection.updateOne(filter, updateDoc);

        // Send modifiedCount in response to match frontend logic
        res.send({ modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ error: "Failed to update item." });
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
        console.error("Delete failed:", error);
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

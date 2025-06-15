const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// JWT middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized' });
    }
    req.user = decoded;
    next();
  });
};

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8ek00d7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");

    const db = client.db("whereIsItDB");
    const itemsCollection = db.collection("items");
    const recoveredItemsCollection = db.collection("recoveredItems");
    
    // Auth related APIs
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
          sameSite: 'strict'
        })
        .send({ success: true });
    });

    app.post('/logout', async (req, res) => {
      res.clearCookie('token').send({ success: true });
    });

    // Protected routes
    app.get("/allItems", verifyToken, async (req, res) => {
      try {
        const allItems = await itemsCollection.find().toArray();
        res.send(allItems);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch items", error: err });
      }
    });

    app.get("/recoveredItems", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (!email) return res.status(400).send({ message: "Email query required" });

      try {
        const items = await recoveredItemsCollection.find({ "recoveredBy.email": email }).toArray();
        res.send(items);
      } catch (err) {
        res.status(500).send({ message: "Failed to fetch recovered items", error: err });
      }
    });

    app.post("/recoveredItems", verifyToken, async (req, res) => {
      const recoveredItem = req.body;
      try {
        const existingRecovered = await recoveredItemsCollection.findOne({
          originalItemId: new ObjectId(recoveredItem.originalItemId),
        });
        if (existingRecovered) return res.status(400).send({ message: "Item already recovered" });

        const result = await recoveredItemsCollection.insertOne(recoveredItem);
        res.status(201).send({ insertedId: result.insertedId });
      } catch (error) {
        res.status(500).send({ message: "Failed to add recovered item", error });
      }
    });

    app.patch("/items/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid ID format" });

      try {
        const result = await itemsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );
        if (result.matchedCount === 0) return res.status(404).send({ error: "Item not found" });
        res.send({ modifiedCount: result.modifiedCount });
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get("/items", async (req, res) => {
      try {
        const sortParam = req.query.sort;
        const limit = parseInt(req.query.limit) || 0;
        let sortOption = {};
        if (sortParam === "date_desc") sortOption = { date: -1 };

        const items = await itemsCollection.find().sort(sortOption).limit(limit).toArray();
        res.send(items);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch items", error });
      }
    });

    app.get("/items/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const item = await itemsCollection.findOne({ _id: new ObjectId(id) });
      if (!item) return res.status(404).send({ message: "Item not found" });
      res.send(item);
    });

    app.post("/addItems", verifyToken, async (req, res) => {
      const item = req.body;
      try {
        const result = await itemsCollection.insertOne(item);
        res.status(201).send({ message: "Item added successfully", insertedId: result.insertedId });
      } catch (err) {
        res.status(500).send({ message: "Failed to add item", error: err });
      }
    });

    app.put("/updateItems/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updatedItem = req.body;
      if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID format" });

      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: updatedItem };

      try {
        const result = await itemsCollection.updateOne(filter, updateDoc);
        res.send({ modifiedCount: result.modifiedCount });
      } catch (error) {
        res.status(500).json({ error: "Failed to update item." });
      }
    });

    app.delete("/items/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      if (!ObjectId.isValid(id)) return res.status(400).send({ error: "Invalid ID format" });

      try {
        const result = await itemsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).send({ error: "Item not found" });
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

  } catch (err) {
    console.error("Failed to connect:", err);
  }
}

run();

app.get("/", (req, res) => {
  res.send("WhereIsIt app is cooking!");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
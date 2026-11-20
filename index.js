import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const port = 8000;

//middleware

app.use(express.json());
app.use(cors());

const client = new MongoClient(
  `mongodb://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@ac-fpjasq8-shard-00-00.l5erhpx.mongodb.net:27017,ac-fpjasq8-shard-00-01.l5erhpx.mongodb.net:27017,ac-fpjasq8-shard-00-02.l5erhpx.mongodb.net:27017/?ssl=true&replicaSet=atlas-h67n0w-shard-0&authSource=admin`,
);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectedMongoDB = await connectToMongoDB();
const database = connectedMongoDB.db("Rental-Lagbe");
const users = database.collection("user");
const equipment = database.collection("equipment");

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

//user releted api

app.get("/users", async (req, res) => {
  const cursor = await users.find().toArray();
  res.send(cursor);
});

app.get("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: new ObjectId(id) };

    const projection = {
      name: 1,
      email: 1,
      role: 1,
      _id: 0,
    };

    const result = await users.findOne(query, { projection });
    res.send(result);
  } catch (err) {
    res.status(400).send({ message: "Invalid user ID" });
  }
});

app.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const query = { _id: new ObjectId(id) };

  const updateDoc = {
    $set: {
      ...body,
    },
  };

  const result = await users.updateOne(query, updateDoc);
  res.send(result);
  // console.log(result);
});

// owner releted apis

app.post("/owner/add-equipment", async (req, res) => {
  const equipmentBody = req.body;
  const result = await equipment.insertOne(equipmentBody);
  res.send(result);
});

app.get("/owner/equipments/", async (req, res) => {
  const result = await equipment.find().toArray();
  res.send(result);
});

app.get("/owner/equipment/:id", async (req, res) => {
  const { id } = req.params;

  const result = await equipment.find({ ownerId: id }).toArray();
  res.send(result);
});

app.delete("/owner/equipment/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await equipment.deleteOne(query);
  res.send(result);
  console.log(result);
});

//Details Page

app.get("/equipment/:id", async (req, res) => {
  const { id } = req.params;

  const query = { _id: new ObjectId(id) };
  console.log(query);
  const result = await equipment.findOne(query);
  res.send(result);
});

export default app;

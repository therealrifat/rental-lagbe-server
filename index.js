import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const port =  8000;

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

app.patch("/users/:id", async(req, res) => {
  const { id } = req.params;
  const body = req.body
  const query = { _id: new ObjectId(id) };

  const updateDoc = {
    $set: {
     ...body
    },
  };

  const result = await users.updateOne(query, updateDoc)
  res.send(result)
  // console.log(result);
});

import express from "express";
import cors from "cors";
import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
const sessions = database.collection("session");
const equipment = database.collection("equipment");
const booking = database.collection("bookings");
const payment = database.collection("payments");
const favorits = database.collection("favorits");

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.send({ status: 401, message: "Unathorizations" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    res.send({ status: 401, message: "Unathorizations" });
    return;
  }

  const query = { token };
  const session = await sessions.findOne(query);
  if (!session) {
    res.send({ status: 401, message: "Unathorizations" });
    return;
  }

  const userId = session.userId;

  const userQuery = { _id: new ObjectId(userId) };
  const user = await users.findOne(userQuery);
  if (!user) {
    res.send({ status: 401, message: "Unathorizations" });
    return;
  }

  req.user = user;


  next();
};

// must

const verifyOwner = async (req, res, next)=>{
  if(req.user.role !== "owner"){
    res.send({message: "Forbidden"})
    return
  }
  next()

}
const verifyAdmin = async (req, res, next)=>{
  if(req.user.role !== "Admin"){
    res.send({message: "Forbidden"})
    return
  }
  next()

}
const verifyRenter = async (req, res, next)=>{
  if(req.user.role !== "customer"){
    res.send({message: "Forbidden"})
    return
  }
  next()

}




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
      deliveryAddress: 1,
      phone: 1,
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

app.get("/owner/equipment/:id", verifyToken,verifyOwner, async (req, res) => {
  const { id } = req.params;
  console.log(id);


  
  if (id !== req.user._id.toString() && req.user.role !== "admin") {
    return res.send({ status: 403, message: "Forbidden" });
  }

  const result = await equipment.find({ ownerId: id }).toArray();
  res.send(result);
});


app.delete("/owner/equipment/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await equipment.deleteOne(query);
  res.send(result);
});

app.get("/owner/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const query = { ownerId: id };
  const result = await booking.find(query).toArray();
  res.send(result);
});

//admin releted apis
// ----------------------------------------------=======
app.get("/users", async (req, res) => {
  const cursor = await users.find().toArray();
  res.send(cursor);
});

app.patch("/users/role/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const roleInfo = req.body;

  const updateDoc = {
    $set: {
      role: roleInfo.role,
    },
  };
  const result = await users.updateOne(query, updateDoc);
  res.send(result);
});

app.get("/admin/equipment", async (req, res) => {
  const result = await equipment.find().toArray();
  res.send(result);
});

app.delete("/admin/equipment/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await equipment.deleteOne(query);
  res.send(result);
});

app.patch("/admin/equipment/:id", async (req, res) => {
  const { id } = req.params;
  const statusData = req.body;
  const query = { _id: new ObjectId(id) };

  const updateDoc = {
    $set: {
      status: statusData.status,
    },
  };

  const result = await equipment.updateOne(query, updateDoc);

  res.send(result);
});

app.get("/admin/booking/", async (req, res) => {
  const result = await booking
    .aggregate([
      {
        $addFields: {
          ownerObjectId: {
            $toObjectId: "$ownerId",
          },
        },
      },
      {
        $lookup: {
          from: "user",
          localField: "ownerObjectId",
          foreignField: "_id",
          as: "ownerInfo",
        },
      },
      {
        $unwind: {
          path: "$ownerInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          ownerName: "$ownerInfo.name",
          ownerEmail: "$ownerInfo.email",
          ownerPhone: "$ownerInfo.phone",
        },
      },
      {
        $project: {
          ownerInfo: 0,
          ownerObjectId: 0,
        },
      },
    ])
    .toArray();

  res.send(result);
});

app.patch("/admin/booking/:id", async (req, res) => {
  const { id } = req.params;
  const statusData = req.body;
  const query = { _id: new ObjectId(id) };

  const updateDoc = {
    $set: {
      bookingStatus: statusData.status,
    },
  };

  const result = await booking.updateOne(query, updateDoc);

  res.send(result);
});

//Details Page
// -------------------------------------------------------------
app.get("/equipment/:id", async (req, res) => {
  const { id } = req.params;

  const query = { _id: new ObjectId(id) };

  const result = await equipment.findOne(query);
  res.send(result);
});

// public releted apis

app.get("/equipment", async (req, res) => {
  const query = {};
  const { search } = req.query;

  if (search) {
    query.$or = [
      { equipmentName: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  const { category, rentaltype, minPrice, maxPrice, sort } = req.query;

  if (category) {
    query.category = category;
  }

  if (rentaltype) {
    query.rentaltype = rentaltype;
  }

  if (minPrice || maxPrice) {
    query.price = {};

    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Sorting
  let sortOption = {};

  if (sort === "low-to-high") {
    sortOption.price = 1;
  } else if (sort === "high-to-low") {
    sortOption.price = -1;
  }

  const result = await equipment.find(query).sort(sortOption).toArray();

  res.send(result);
});

//booking details

app.post("/customers/bookings", async (req, res) => {
  const bookingInfo = req.body;

  const result = await booking.insertOne(bookingInfo);
  res.send(result);

  console.log(result);
});

//customers releted apis

app.get("/customer/myrental/:id", async (req, res) => {
  const { id } = req.params;
  const result = await booking.find({ customerId: id }).toArray();
  res.send(result);
});

app.get("/booking/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: new ObjectId(id) };
  const result = await booking.findOne(query);
  res.send(result);
});

//favorites apis
app.post("/customers/favorites", async (req, res) => {
  const favoriteBody = req.body;

  const existingFavorite = await favorits.findOne(favoriteBody);

  if (existingFavorite) {
    return res.send({ message: "Already added to favorites" });
  }

  const result = await favorits.insertOne({
    ...favoriteBody,
    createdAt: new Date(),
  });
  res.send({ message: "Added to favorites" });
});

app.get("/customers/favorites/:id", async (req, res) => {
  const { id } = req.params;

  const favorites = await favorits
    .aggregate([
      {
        $match: { customerId: id },
      },
      {
        $addFields: {
          equipmentObjectId: {
            $toObjectId: "$equipmentId",
          },
        },
      },
      {
        $lookup: {
          from: "equipment",
          localField: "equipmentObjectId",
          foreignField: "_id",
          as: "equipment",
        },
      },
      {
        $unwind: "$equipment",
      },
      {
        $project: {
          _id: 1, // Favorite ID
          equipmentId: 1, // Equipment ID
          createdAt: 1,
          equipmentName: "$equipment.equipmentName",
          category: "$equipment.category",
          location: "$equipment.location",
          rentalPrice: "$equipment.rentalPrice",
          price: "$equipment.price",
          image: "$equipment.image",
        },
      },
    ])
    .toArray();

  res.send(favorites);
});

app.delete("/customers/favorites", async (req, res) => {
  const { _id: equipmentId, customerId } = req.body;
  const query = { _id: new ObjectId(equipmentId) };

  const result = await favorits.deleteOne();
  res.send(result);
});

//payment verification

app.post("/payment/checkout-verify", async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    res.send({ success: false, message: "Session Id is Required" });
  }

  const { status, payment_status, customer_email, metadata, payment_intent } =
    await stripe.checkout.sessions.retrieve(sessionId);

  if (status === "complete" && payment_status == "paid") {
    const sessionQuery = { sessionId };
    const existingPayment = await payment.findOne(sessionQuery);

    if (existingPayment) {
      return res.send({ success: false, message: "Payment Already Verified" });
    }

    const payments = {
      sessionId,
      status,
      customer_email,
      bookingId: metadata.bookingId,
      payment_intent,
      payment_status,
      payment_date: new Date(),
    };

    const result = await payment.insertOne(payments);
    // update the booking table
    const query = { _id: new ObjectId(metadata.bookingId) };
    const updateDoc = {
      $set: {
        paymentStatus: true,
      },
    };

    const updateResult = await booking.updateOne(query, updateDoc);

    res.send({ success: true, result, updateResult });

    return;
  }

  res.send({ success: false, message: "Verification Failed" });
});

// Feature section apis

app.get("/featured-equipment", async (req, res) => {
  const result = await equipment
    .find({ status: "Approved" })
    .limit(6)
    .toArray();

  res.send(result);
});

// app.get("customer/favories");
export default app;

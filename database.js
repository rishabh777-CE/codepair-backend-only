const { MongoClient } = require('mongodb');
const { connect } = require('socket.io-client');
require("dotenv").config();
// TODO: Replace the following with your MongoDB connection string

const uri=`mongodb+srv://${process.env.MONGO_URL}`;


// Initialize MongoDB client
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to database');
  } catch (err) {
    console.error(err);
  }
};

// Get a reference to the database and collection
const db = client.db('codepair');
const roomCollection = db.collection('rooms');

async function isRoomIdPresent(roomId) {
  const query = { roomId };
  const count = await roomCollection.countDocuments(query);
  return count > 0;
}

async function createRoom(roomId, code) {
  const document = { roomId, code };
  await roomCollection.insertOne(document);
}

async function updateRoom(roomId, code) {
  const filter = { roomId };
  const update = { $set: { code } };
  await roomCollection.updateOne(filter, update);
}

async function getCode(roomId) {
  const query = { roomId };
  const document = await roomCollection.findOne(query);
  return document ? document.code : null;
}

module.exports = { connectToDatabase,isRoomIdPresent, createRoom, updateRoom, getCode };
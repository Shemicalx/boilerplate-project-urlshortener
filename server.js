"use strict";

const express = require("express");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dnsPromises = require("dns").promises;
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const cors = require("cors");
const { CLIENT_RENEG_LIMIT } = require("tls");

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

/** this project needs a db !! **/
const Schema = mongoose.Schema;

const urlSchema = new Schema({
  url: { type: String, required: true },
  endpoint: { type: Number, required: true },
});

const ShortenedUrl = mongoose.model("ShortenedUrls", urlSchema);
// mongoose.connect(process.env.DB_URI);

const createShortenedUrl = (url, endpoint) => {
  ShortenedUrl.create({ url, endpoint });
};

const findMaxEndpointIndex = async () => {
  return ShortenedUrl.findOne({}).sort("-endpoint").select("endpoint");
};

const findSpecificEndpointIndex = async (endpoint) => {
  return ShortenedUrl.findOne({ endpoint: endpoint });
};

app.use(cors());

/** this project needs to parse POST bodies **/
app.use(bodyParser.urlencoded({ extended: true }));
// you should mount the body-parser here

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.get("/api/shorturl/:id", async (req, res, next) => {
  try {
    const URLObject = await findSpecificEndpointIndex(req.params.id);
    res.redirect(URLObject.url);
  } catch (error) {
    next(error);
  }
});

app.post("/api/shorturl/new", async (req, res, next) => {
  try {
    const myURL = new URL(req.body.url);
    const maxIndexItem = (await findMaxEndpointIndex()) || {
      url: "",
      endpoint: 0,
    };
    console.log(maxIndexItem);
    //
    await dnsPromises.lookup(myURL.hostname);
    //
    await createShortenedUrl(myURL, maxIndexItem.endpoint + 1);
    res.json({
      original_url: req.body.url,
      short_url: maxIndexItem.endpoint + 1,
    });
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  res.json({
    error: "invalid URL",
  });
});

app.listen(port, function () {
  console.log("Node.js listening ...");
});

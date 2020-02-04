const express = require("express");
const s3Bucket = require("./routes/s3Bucket");
const app = express();
require("dotenv").config();

// ensure aws credentials are present, otherwise no need to start server
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error("exiting: missing aws access credentials");
  process.exit();
}

// parse json body in requests
app.use(express.json());

// routes
app.use("/s3Bucket", s3Bucket.router);
app.get("/", (req, res) => {
  res.json({ success: true, data: "server and router are running" });
});

// default log and catch errors
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send({
    success: false,
    data: {
      message: "Unhandled Error"
    }
  });
});

// initialize the server on an open port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log("- - - - - - - - - - - - - -");
});

module.exports = app;

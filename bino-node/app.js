const express = require("express");
const app = express();
const morgan = require("morgan"); // to 

// router
const postRoutes = require("./router/post");

// all middleware or our tasks that the server listens to constantly
app.get("/", postRoutes);

app.listen(3000, () => {
    console.log("Server listening on port 3k!")
});
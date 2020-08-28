const express = require("express");
const postController = require("../controller/post");

const router = express.Router();

// add any alternative routes e.g. router.get("/post", postController.newfx)
// then add the (req, res) in post.js under controller 
router.get("/ini", postController.getPosts); // gets initial qns

module.exports = router; 


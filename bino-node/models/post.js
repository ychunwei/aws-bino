const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
    qnpairs:{
        type: Array,
        required: "Array is required"
    }

});
// dao post schema for now
module.exports = mongoose.model("Post", postSchema);
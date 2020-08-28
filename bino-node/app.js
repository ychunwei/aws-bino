const express = require("express");
const app = express();
const cors = require('cors');
const bodyParser = require("body-parser");
const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1',
});

const ddb = new AWS.DynamoDB({
    apiVersion: '2012-08-10',
});


// router
const postRoutes = require("./router/post");
const port = process.env.PORT || 3000;



// all middleware or our tasks that the server listens to constantly
app.use(cors());
app.use(bodyParser.json());
// app.get("/ini", postRoutes);
// app.post("/checkans", postRoutes); 
app.use("/", postRoutes);

// DEPRECATED TEST DOMAIN
// app.get('/quiz', async (req, res) => {
//     const params = {
//         TableName: 'BINO_Chemistry',
//     };

//     const data = await ddb.scan(params).promise();

//     res.json({
//         data: JSON.stringify(data),
//     });
// });


app.listen(port, () => {
    console.log(`Server is running at port ${port}!`);
});
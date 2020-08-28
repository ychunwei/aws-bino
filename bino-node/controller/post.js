const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1',
});

const ddb = new AWS.DynamoDB({
    apiVersion: '2012-08-10',
});

exports.getPosts = async (req, res) => {
    // DO API call from DB, then return
    var params = {
        TableName: "BINO_Chemistry",
        IndexName: "Skillset-Difficulty-index",
     
        ExpressionAttributeValues: {
            ":v_skillset":{S: "Recall"},
            ":v_diff1":{S: "1"},
            ":v_diff2":{S:"2"},
        },
         KeyConditionExpression: 
            "Skillset = :v_skillset and Difficulty between :v_diff1 and :v_diff2",
          
        ProjectionExpression: 
            "Skillset, Difficulty, Topic, Question, Option\sA, Option\sB, Option\sC, Option\sD, Answer",
        ScanIndexForward: false,
    };

    
    ddb.query(params, (err, data) => {
        if (err){
            console.log(err, err.stack);
            res.json({
                err: JSON.stringify(err)
            });
        }
        else{
            console.log(data);
            res.json({
                data: JSON.stringify(data)
            });
        }  
    });
} 
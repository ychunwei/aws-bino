const AWS = require('aws-sdk');
const Post = require('../models/post');
const calculator = require('../scripts/hiddenScore');
var qnsarray = ['001','002', '003', '004', '005']
var user_ans_array = []
var question_type_array = []

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
            "Skillset, Difficulty, Topic, Question, Option_A, Option_B, Option_C, Option_D, Qns_ID",
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

exports.getScore = async (req, res) => {
    // DO API call from DB, then return
    const post = new Post(req.body);
    console.log("POST:" , req.body);
    var return_data = "";
    
    var params = {
        RequestItems: {
         "BINO_Chemistry": {
           Keys: [
              {
             "Qns_ID": {
               S: qnsarray[0],
              }, 
             "Skillset": {
               S: "Recall",
              }
            }, 
              {
             "Qns_ID": {
               S: qnsarray[1],
              }, 
             "Skillset": {
               S: "Evaluation",
              }
            }, 
              {
             "Qns_ID": {
               S: qnsarray[2],
              }, 
             "Skillset": {
               S: "Recall",
              }
            },
            {
            "Qns_ID": {
                S: qnsarray[3],
                }, 
            "Skillset": {
                S: "Recall",
                }
            },
            {
            "Qns_ID": {
                S: qnsarray[4],
                }, 
            "Skillset": {
                S: "Recall",
                }
            },
           ],
           ProjectionExpression: "Qns_ID, Answer"
        }
    }
   };
   
   //TODO:  figure out how to edit specific value in table -> for the updating difficulty
    
       ddb.batchGetItem(params, (err, data) => {
        if (err){
            console.log(err, err.stack);
            res.json({
                err: JSON.stringify(err)
            });
        }
        else{
            return_data = JSON.stringify(data);
            console.log(return_data);
            res.json({
                data: return_data
            });
            
        }  
    });

    // Process request obtained from POST
    const stringed = JSON.stringify(req.body);
    console.log(stringed);
    const obj = JSON.parse(stringed); 

    var lowerbound = obj.currentLower
    var upperbound = obj.currentUpper
    var averageScore = obj.currentAverage
    var questions = obj.qnpairs // [id, difficulty, skillset, user_response]

    // Process answers obtained from DB
    const obj_db = JSON.parse(return_data); // <- this does not work as of now

    // var resp = obj_db.Responses;
    // // var ids = obj_db.Qns_ID;
    // console.log(resp);

    // need to append the answer to each question, then pass in the questions

    // takes in 2d array of [id, difficulty, skillset, user_response, answer]
    calculator.checkAnswers(questions) // return 2d array of [Qns_ID, difficulty, skillset, state(0 = wrong, 1 = correct)] 

    // // takes in array of [Difficulty, State] (2D)
    // calculator.computeHiddenScore(1,4,2.5,[[]]);

}; 
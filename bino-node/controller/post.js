const AWS = require('aws-sdk');
const Post = require('../models/post');
const calculator = require('../scripts/hiddenScore');
var qnsarray = []
// var user_ans_array = []
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
            ":v_diff1":{S: "1.5"},
            ":v_diff2":{S:"3.5"},
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

exports.getResponseAndState = async (req, res) => {
    var qn_tracker = calculator.returnQnTracker();
    calculator.clearQnTracker();
    // current lower, upper and avg will be passed over from the final quiz section
    res.json({
        data: qn_tracker
    });
}

exports.getScore = async (req, res) => {
    // DO API call from DB, then return
    const post = new Post(req.body);
    console.log("POST:" , req.body);

     // Process request obtained from POST
     const stringed = JSON.stringify(req.body);
     console.log(stringed);
     const obj = JSON.parse(stringed); 
 
     var lowerbound = obj.currentLower
     var upperbound = obj.currentUpper
     var averageScore = obj.currentAverage
     var questions = obj.qnpairs // [id, difficulty, skillset, user_response]

     for(i = 0; i < 5; i++){
         qnsarray.push(questions[i][0]); // ID
         question_type_array.push(questions[i][2]); // question_type
     }
    
    var params = {
        RequestItems: {
         "BINO_Chemistry": {
           Keys: [
              {
             "Qns_ID": {
               S: qnsarray[0],
              }, 
             "Skillset": {
               S: question_type_array[0],
              }
            }, 
              {
             "Qns_ID": {
               S: qnsarray[1],
              }, 
             "Skillset": {
               S: question_type_array[1],
              }
            }, 
              {
             "Qns_ID": {
               S: qnsarray[2],
              }, 
             "Skillset": {
               S: question_type_array[2],
              }
            },
            {
            "Qns_ID": {
                S: qnsarray[3],
                }, 
            "Skillset": {
                S: question_type_array[3],
                }
            },
            {
            "Qns_ID": {
                S: qnsarray[4],
                }, 
            "Skillset": {
                S: question_type_array[4],
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
        
        var return_data = JSON.stringify(data);
        const obj_db = JSON.parse(return_data);
        
         // Process answers obtained from DB
        var qn_ans = {};
        
        var responses = obj_db.Responses.BINO_Chemistry;
        for (x in responses){
            qn_ans[responses[x].Qns_ID.S] = responses[x].Answer.S
        }

        // takes in 2d array of [id, difficulty, skillset, user_response], dictionary of qn_id & answers
        var qns_with_state = calculator.checkAnswers(questions, qn_ans) // return 2d array of [Qns_ID, difficulty, skillset, state(0 = wrong, 1 = correct)] 
        console.log(qns_with_state)
        // takes in array of [Difficulty, State] (2D)
        var arr_computation
        arr_computation = calculator.computeHiddenScore(lowerbound,upperbound,averageScore,qns_with_state);
        lowerbound = arr_computation[0]
        upperbound = arr_computation[1]
        averageScore = arr_computation[2]

        console.log(lowerbound, upperbound, averageScore)

        // another DB query for the range
        var params = {
            TableName: "BINO_Chemistry",
            IndexName: "Skillset-Difficulty-index",
         
            ExpressionAttributeValues: {
                ":v_skillset":{S: "Recall"},
                ":v_diff1":{S: String(lowerbound)},
                ":v_diff2":{S: String(upperbound)},
            },
             KeyConditionExpression: 
                "Skillset = :v_skillset and Difficulty between :v_diff1 and :v_diff2",
              
            ProjectionExpression: 
                "Skillset, Difficulty, Topic, Question, Option_A, Option_B, Option_C, Option_D, Qns_ID",
            ScanIndexForward: false,
        };
    
        
        ddb.query(params, (err, data2) => {
            if (err){
                console.log(err, err.stack);
                res.json({
                    err: JSON.stringify(err)
                });
            }

            else{
                
                res.json({
                    currentLower: lowerbound, 
                    currentUpper: upperbound,
                    currentAverage: averageScore,
                    data: JSON.stringify(data2)
                });
            }
        });
        
        
    }  
    });
}; 


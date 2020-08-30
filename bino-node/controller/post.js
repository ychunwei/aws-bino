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
           ProjectionExpression: "Qns_ID, Answer, Students_Correct, Students_Wrong, Students_Attempted"
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
        // Track student numbers for updating of qns diff in DB
        var num_correct = {}; 
        var num_wrong = {};
        var num_total= {};

        var responses = obj_db.Responses.BINO_Chemistry;
        for (x in responses){
            qn_ans[responses[x].Qns_ID.S] = responses[x].Answer.S;
            num_correct[responses[x].Qns_ID.S] = responses[x].Students_Correct.S;
            num_wrong[responses[x].Qns_ID.S] = responses[x].Students_Wrong.S;
            num_total[responses[x].Qns_ID.S] = responses[x].Students_Attempted.S;
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

        // Update student count tallys & qns difficulty
        // takes in 2d array of [id, diff, skillset, state], dic of qid & num correct, dic of qid & num wrong, dic of qid & num total
        var student_tally = calculator.updatetally(qns_with_state, num_correct, num_wrong, num_total)
        console.log(student_tally)

        // write to DB to update student counts & new question difficulty * 5 times for student_tally[0] to student_tally[4]
        var params = {
            TableName: "BINO_Chemistry",
            ExpressionAttributeNames: {
                "#SC": "Students_Correct",
                "#SW": "Students_Wrong",
                "#SA":"Students_Attempted",
                "#Df": "Difficulty"
            },
            ExpressionAttributeValues: {
                ":sc_0": {S: String(student_tally[0][1])}, 
                ":sw_0": {S: String(student_tally[0][2])}, 
                ":sa_0": {S: String(student_tally[0][3])}, 
                ":df_0": {S: String(student_tally[0][4])} 
            },
            Key: {
            "Qns_ID": {S: student_tally[0][0]}
            },
            UpdateExpression: "SET #SC = :sc_0, #SW = :sw_0, #SA = :sa_0, #Df = :df_0"
        };

        ddb.updateItem(params, (err, data) => {
            if (err){
                console.log(err, err.stack);
            }
            else{
                console.log(data);

        var params = {
            TableName: "BINO_Chemistry",
            ExpressionAttributeNames: {
                "#SC": "Students_Correct",
                "#SW": "Students_Wrong",
                "#SA":"Students_Attempted",
                "#Df": "Difficulty"
            },
            ExpressionAttributeValues: {
                ":sc_1": {S: String(student_tally[1][1])}, 
                ":sw_1": {S: String(student_tally[1][2])}, 
                ":sa_1": {S: String(student_tally[1][3])}, 
                ":df_1": {S: String(student_tally[1][4])} 
            },
            Key: {
            "Qns_ID": {S: student_tally[1][0]}
            },
            UpdateExpression: "SET #SC = :sc_1, #SW = :sw_1, #SA = :sa_1, #Df = :df_1"
        };

        ddb.updateItem(params, (err, data) => {
            if (err){
                console.log(err, err.stack);
            }
            else{
                console.log(data);

        var params = {
            TableName: "BINO_Chemistry",
            ExpressionAttributeNames: {
                "#SC": "Students_Correct",
                "#SW": "Students_Wrong",
                "#SA":"Students_Attempted",
                "#Df": "Difficulty"
            },
            ExpressionAttributeValues: {
                ":sc_2": {S: String(student_tally[2][1])}, 
                ":sw_2": {S: String(student_tally[2][2])}, 
                ":sa_2": {S: String(student_tally[2][3])}, 
                ":df_2": {S: String(student_tally[2][4])}
            },
            Key: {
            "Qns_ID": {S: student_tally[2][0]}
            },
            UpdateExpression: "SET #SC = :sc_2, #SW = :sw_2, #SA = :sa_2, #Df = :df_2"
        };

        ddb.updateItem(params, (err, data) => {
            if (err){
                console.log(err, err.stack);
            }
            else{
                console.log(data);

        var params = {
            TableName: "BINO_Chemistry",
            ExpressionAttributeNames: {
                "#SC": "Students_Correct",
                "#SW": "Students_Wrong",
                "#SA":"Students_Attempted",
                "#Df": "Difficulty"
            },
            ExpressionAttributeValues: {
                ":sc_3": {S: String(student_tally[3][1])}, 
                ":sw_3": {S: String(student_tally[3][2])}, 
                ":sa_3": {S: String(student_tally[3][3])}, 
                ":df_3": {S: String(student_tally[3][4])} 
            },
            Key: {
            "Qns_ID": {S: student_tally[3][0]}
            },
            UpdateExpression: "SET #SC = :sc_3, #SW = :sw_3, #SA = :sa_3, #Df = :df_3"
        };

        ddb.updateItem(params, (err, data) => {
            if (err){
                console.log(err, err.stack);
            }
            else{
                console.log(data);

        var params = {
            TableName: "BINO_Chemistry",
            ExpressionAttributeNames: {
                "#SC": "Students_Correct",
                "#SW": "Students_Wrong",
                "#SA":"Students_Attempted",
                "#Df": "Difficulty"
            },
            ExpressionAttributeValues: {
                ":sc_4": {S: String(student_tally[4][1])}, 
                ":sw_4": {S: String(student_tally[4][2])}, 
                ":sa_4": {S: String(student_tally[4][3])}, 
                ":df_4": {S: String(student_tally[4][4])} 
            },
            Key: {
            "Qns_ID": {S: student_tally[4][0]}
            },
            UpdateExpression: "SET #SC = :sc_4, #SW = :sw_4, #SA = :sa_4, #Df = :df_4"
        };
        
        ddb.updateItem(params, (err, data) => {
            if (err){
                console.log(err, err.stack);
            }
            else{
                console.log(data);

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
        
                var return_data = JSON.stringify(data);
                const obj_db = JSON.parse(return_data);
            }
            // TBC choose 5 by criteria and return, parse
            //res.json({
               // currentLower: lowerbound, 
                //currentUpper: upperbound,
                //currentAverage: averageScore,
                //data: JSON.stringify(data2)
        };       
    };
}
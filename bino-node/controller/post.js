const AWS = require('aws-sdk');
const Post = require('../models/post');
const calculator = require('../scripts/hiddenScore');


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
        
        ExpressionAttributeValues: {
            ":v_diff1":{S: "1.5"},
            ":v_diff2":{S:"4"},
        },
         FilterExpression: 
            "Difficulty between :v_diff1 and :v_diff2",
          
        ProjectionExpression: 
            "Skillset, Difficulty, Topic, Question, Option_A, Option_B, Option_C, Option_D, Qns_ID, Answer",
        
    };

    
    ddb.scan(params, (err, data) => {
        if (err){
            console.log(err, err.stack);
            res.json({
                err: JSON.stringify(err)
            });
        }
        else{
            console.log(data);
            
            res.json({
                data: JSON.stringify(data),
            });
        }  
    });
} 

exports.getResponseAndState = async (req, res) => {
    var qn_tracker = calculator.returnQnTracker();
    // calculator.clearQnTracker();
    // calculator.clearQnIDTracker();
    // current lower, upper and avg will be passed over from the final quiz section
    res.json({
        data: qn_tracker
    });
}

exports.getClear = async (req, res) => {
    calculator.clearQnTracker();
    calculator.clearQnIDTracker();
    calculator.clearRightAndWrong();

    res.json({
        data: "TEST"
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
    var isFinal = obj.isFinal 
    var subsection_num = obj.isFinalCalc // 1 indexed  - on the 3rd subsection snowball effect will show

    var qnsarray = []
    var question_type_array = []

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
   
   // FETCH ANSWERS 
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
        // Track student numbers
        var num_correct = {};
        var num_wrong = {};
        var num_total = {};
        
        var responses = obj_db.Responses.BINO_Chemistry;
        for (x in responses){
            qn_ans[responses[x].Qns_ID.S] = responses[x].Answer.S;
            num_correct[responses[x].Qns_ID.S] = Number(responses[x].Students_Correct.S);
            num_wrong[responses[x].Qns_ID.S] = Number(responses[x].Students_Wrong.S);
            num_total[responses[x].Qns_ID.S] = Number(responses[x].Students_Attempted.S);
        }

        // takes in 2d array of [id, difficulty, skillset, user_response], dictionary of qn_id & answers
        var qns_with_state = calculator.checkAnswers(questions, qn_ans) 
        // return 2d array of [Qns_ID, difficulty, skillset, state(0 = wrong, 1 = correct), user_response] 
        console.log(qns_with_state)
        var percentage = calculator.calculateCurrentPercentage()

        // takes in array of [Difficulty, State] (2D)
        var arr_computation
        arr_computation = calculator.computeHiddenScore(lowerbound,upperbound,averageScore,qns_with_state);
        lowerbound = parseFloat(arr_computation[0].toFixed(3)) //parseFloat(num.toFixed(3))
        upperbound = parseFloat(arr_computation[1].toFixed(3))
        averageScore = parseFloat(arr_computation[2].toFixed(3))

        console.log(lowerbound, upperbound, averageScore)

        // UPDATE DB with the updated values
        var student_tally = calculator.updatetally(qns_with_state, num_correct, num_wrong, num_total);
        console.log(student_tally)

        for (x in student_tally){
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
                    ":sc_0": {S: String(student_tally[x][1])}, 
                    ":sw_0": {S: String(student_tally[x][2])}, 
                    ":sa_0": {S: String(student_tally[x][3])}, 
                    ":df_0": {S: String(student_tally[x][4])} 
                },
                Key: {
                "Qns_ID": {S: String(student_tally[x][0])},
                "Skillset": {S: String(qns_with_state[x][2])}
                },
                UpdateExpression: "SET #SC = :sc_0, #SW = :sw_0, #SA = :sa_0, #Df = :df_0"
            };

            ddb.updateItem(params, (err, data) => {
                if (err){
                    console.log(err, err.stack);
                }
                else{
                    console.log("Updated table!");
                }
            });
        }
        var snowball = false;

        // FLAG
        if (subsection_num >= 2 && percentage >= 0.8){
            upperbound = upperbound * (1 + percentage * 0.1);
            snowball = true;
        }

        var expanded_lower = lowerbound // removed lower range
        var expanded_upper = upperbound + 1
        
        // another DB query for the range
        var params = {
            TableName: "BINO_Chemistry",
            
            ExpressionAttributeValues: {
                
                ":v_diff1":{S: String(expanded_lower)},
                ":v_diff2":{S: String(expanded_upper)},
            },
             FilterExpression: 
                "Difficulty between :v_diff1 and :v_diff2",
              
            ProjectionExpression: 
                "Skillset, Difficulty, Topic, Question, Option_A, Option_B, Option_C, Option_D, Qns_ID, Answer",
        };
    
        
        ddb.scan(params, (err, data2) => {
            if (err){
                console.log(err, err.stack);
                res.json({
                    err: JSON.stringify(err)
                });
            }

            else if(!isFinal){
                var qn_ids = calculator.returnQnIDTracker();
                console.log("IS THIS HERE?")
                console.log("COUNT:" + qn_ids.length)
                
                res.json({
                    currentLower: lowerbound, 
                    currentUpper: upperbound,
                    currentAverage: averageScore,
                    data: JSON.stringify(data2),
                    id_of_qn: qn_ids,
                    percentage: percentage,
                    isSnowball: snowball
                });
            }
            else{
                // var qn_ids = calculator.returnQnIDTracker();
                calculator.clearQnIDTracker();
                res.json({
                    currentLower: lowerbound, 
                    currentUpper: upperbound,
                    currentAverage: averageScore,
                    percentage: percentage
                });
            }
        });
        
        
    }  
    });
}; 


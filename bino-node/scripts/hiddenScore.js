// var question_dic = {}
var qn_tracker = []; // global variable to store the qns

exports.sayHi = () => {
    console.log("HI")
}

exports.checkAnswers = (questions, qn_ans) => {
  for (iqns in questions){
      if (questions[iqns][3] == qn_ans[questions[iqns][0]]){
          console.log("correct")
          questions[iqns].push(questions[iqns][3])
          questions[iqns][3] = 1           
      }
      else{
          console.log("wrong" + iqns)
          questions[iqns].push(questions[iqns][3])
          questions[iqns][3] = 0           
      }
  }
  return questions
}

// Requires: current lower, upper window; returns updated
exports.computeHiddenScore = (currentLower, currentUpper, currentAvg, difficulty_state_pair) => {
  
  console.log("CURRENT" + " " + currentLower + " " + currentUpper + " " + currentAvg)
  // local var decl
  // difficulty_state_pair = [id, difficulty, skillset, state, user_response] * n = 5
  var index;
  var difference, swap_temp;
  var add_factor = 0.25; // 0.25
  var div_factor = 100; // 100

  for (index in difficulty_state_pair){
    difference = Math.abs(difficulty_state_pair[index][1] - currentAvg)
    sqr_diff = difference ** 2
    qn_tracker.push(difficulty_state_pair[index]) // append to global var for the updateQnScores
    // swap jic
    if (currentUpper < currentLower) {
      currentUpper = swap_temp;
      currentUpper = currentLower;
      currentLower = swap_temp;
    }
    // 4 cases
    if (difficulty_state_pair[index][3] == 1){ // correct 
      // get harder qn correct
      if (currentAvg < difficulty_state_pair[index][1]){
        currentUpper += sqr_diff / div_factor + add_factor;
      }
      // get easier qn correct
      else {
        currentLower += -sqr_diff / div_factor + add_factor;
      }
    }
    else{
      // get harder qn wrong
      if (currentAvg < difficulty_state_pair[index][1]){
        currentUpper += sqr_diff / div_factor - add_factor;
      }
      // get easier qn wrong
      else {
        currentLower += -sqr_diff / div_factor - add_factor;
      }
    }
  } 

  // Update the average only at the end 
  currentAvg = (currentUpper + currentLower) / 2;
  
  return [currentLower, currentUpper, currentAvg];
}

function updateQnScores(){
  // send to DB based on values in qn_tracker
}

// return statement
exports.returnQnTracker = () => {
    return qn_tracker
}

exports.clearQnTracker = () => {
    qn_tracker = [];
}
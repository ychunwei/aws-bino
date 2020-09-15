// var question_dic = {}
var qn_tracker = []; // global variable to store the qns
var qn_id_tracker = [];
var current_correct = 0;
var current_wrong = 0;

exports.sayHi = () => {
    console.log("HI")
}

exports.checkAnswers = (questions, qn_ans) => {
  for (iqns in questions){
      if (questions[iqns][3] == qn_ans[questions[iqns][0]]){
          console.log("correct")
          questions[iqns].push(questions[iqns][3])
          current_correct += 1
          questions[iqns][3] = 1           
      }
      else{
          console.log("wrong" + iqns)
          current_wrong += 1
          questions[iqns].push(questions[iqns][3])
          questions[iqns][3] = 0           
      }
  }
  return questions
}

exports.calculateCurrentPercentage = () => {
  var sum = current_correct + current_wrong
  var percentage = current_correct / sum 
  var trunc_perc = parseFloat(percentage.toFixed(3))
  return trunc_perc
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
    sqr_diff = (difference + 1.25)** 2
    qn_tracker.push(difficulty_state_pair[index]) // append to global var for the updateQnScores
    qn_id_tracker.push(difficulty_state_pair[index][0]) // push qnIDs
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

  // OUT OF BOUNDS CONDITIONS
  // if (currentUpper > 5){
  //   currentUpper = 5.0
  //   if ((currentUpper - currentLower) < 0.5){
  //     currentAvg = 4.75
  //     currentLower = 4.50
  //   }
  // }
  if (currentLower < 1){
    currentLower = 1.0
    if ((currentUpper - currentLower) < 0.5){
      currentAvg = 1.25
      currentUpper = 1.50
    }
  }

  // WINDOW CONSTRAINTS
  if ((currentUpper - currentLower) < 0.5){
    currentUpper = currentAvg + 0.25
    currentLower = currentAvg - 0.25
  }
  
  return [currentLower, currentUpper, currentAvg];
}

exports.updatetally = (student_state, correct, wrong, total) => {
  var tally = []; //array of [qns_id, num correct, num wrong, num total, new difficulty rating] * n = 5

  for (iqns in student_state){

      if (student_state[iqns][3] == 1){ //if student answer the qns correct
          var kvalue // the new diff value
          correct[student_state[iqns][0]] += 1;
          total[student_state[iqns][0]] += 1;
          //parseFloat(num.toFixed(3))
          kvalue = (wrong[student_state[iqns][0]] - correct[student_state[iqns][0]]) / (0.5 * total[student_state[iqns][0]]) + 3; // calculates (total wrong - total correct / total) * 2 + 3
          kvalue = parseFloat(kvalue.toFixed(3))
          tally.push([student_state[iqns][0], correct[student_state[iqns][0]], wrong[student_state[iqns][0]], total[student_state[iqns][0]], kvalue]);        
      }
      else{
          var pvalue
          wrong[student_state[iqns][0]] += 1;
          total[student_state[iqns][0]] +=1;
          pvalue = (wrong[student_state[iqns][0]] - correct[student_state[iqns][0]]) / (0.5 * total[student_state[iqns][0]]) + 3; // calculates (total wrong - total correct / total) * 2 + 3
          pvalue = parseFloat(pvalue.toFixed(3))
          tally.push([student_state[iqns][0], correct[student_state[iqns][0]], wrong[student_state[iqns][0]], total[student_state[iqns][0]], pvalue]);        
      }
  }

  return tally;
}

// return statement
exports.returnQnTracker = () => {
    return qn_tracker
}

exports.clearQnTracker = () => {
    qn_tracker = [];
}

exports.returnQnIDTracker = () => {
  return qn_id_tracker
}

exports.clearQnIDTracker = () => {
  qn_id_tracker = [];
}

exports.clearRightAndWrong = () => {
  current_correct = 0
  current_wrong = 0
}
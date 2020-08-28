var question_dic = {}
// var qn_tracker = [question]; // global variable to store the qns

exports.sayHi = () => {
    console.log("HI")
}

exports.checkAnswers = (questions) => {
  for (iqns in questions){
      if (questions[iqns][3] == questions[iqns][4]){
          console.log("correct")
          questions[iqns].pop() // destroy last element
          questions[iqns][3] == 1           
      }
      else{
          console.log("wrong")
          questions[iqns].pop() // destroy last element
          questions[iqns][3] == 0           
      }
  }
  return questions
}

// Requires: current lower, upper window; returns updated
exports.computeHiddenScore = (currentLower, currentUpper, currentAvg, difficulty_state_pair) => {
  // TODO: check answer, returns array of tuples (difficulty, 0/1) which means correct or wrong
  // ok i realized JS has no tuples but just create as const smth = [difficulty, 0, qn_ID], with a series of these 
  // stored in array


  // [difficulty, state]
  
  // local var decl
  //var difficulty_state_pair = [[1.23, 1], [2.2, 0]]; // debug line
  var index;
  var difference, swap_temp;
  var add_factor = 0.25;
  var div_factor = 100;

  for (index in difficulty_state_pair){
    difference = Math.abs(difficulty_state_pair[index][0] - currentAvg)
    qn_tracker.push(difficulty_state_pair[index]) // append to global var for the updateQnScores
    // swap jic
    if (currentUpper < currentLower) {
      currentUpper = swap_temp;
      currentUpper = currentLower;
      currentLower = swap_temp;
    }
    // 4 cases
    if (difficulty_state_pair[index][1] == 1){ // correct 
      // get harder qn correct
      if (currentAvg < difficulty_state_pair[index][0]){
        currentUpper = (difference ** 2) / div_factor + add_factor;
      }
      // get easier qn correct
      else {
        currentLower = -(difference ** 2) / div_factor + add_factor;
      }
    }
    else{
      // get harder qn wrong
      if (currentAvg < difficulty_state_pair[index][0]){
        currentUpper = (difference ** 2) / div_factor - add_factor;
      }
      // get easier qn wrong
      else {
        currentLower = -(difference ** 2) / div_factor - add_factor;
      }
    }
  } 

  // Update the average only at the end 
  currentAvg = (currentUpper + currentLower) / 2;
  return currentLower, currentUpper, currentAvg;
}

function updateQnScores(){
  // send to DB based on values in qn_tracker
  // after sending, just clear
  qn_tracker.clear();
}


// computeHiddenScore(1,5,2.5);
// computeHiddenScore(1,5,2.5);
// console.log(qn_tracker)
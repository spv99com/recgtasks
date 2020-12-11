var triggerFunction = "processRecurrentLists";  //trigger callback function name

//---------------------------------------------
function initTriggers (tmz) {
  if (TESTMODE == 1) 
    logIt(LOG_CRITICAL,'TESTMODE - No trigger will be installed for timezone %s.',tmz);
  else {
    //if list of project triggers does not contain any trigger having callback function name the same as we use
    if (getTriggers() == 0) {
      logIt(LOG_CRITICAL,'No trigger for "'+triggerFunction+'" found. Installing trigger for time zone %s.',tmz);
      createTriggers(tmz);
    } else logIt(LOG_DEV, 'Trigger installed already.');
  }

}

//---------------------------------------------
function getTriggers() {
  return (ScriptApp.getProjectTriggers().filter(function(trg){ return trg.getHandlerFunction() == triggerFunction }).length)
}

//---------------------------------------------
function createTriggers(tmz) {
  // Trigger running at 1am depending on timezone specified in settings
  // If no timezone specified, script timezone is used (GMT)
  ScriptApp.newTrigger(triggerFunction)
      .timeBased()
      .everyDays(1)
      .inTimezone(tmz)
      .atHour(1)
      .create();
      
  // Adding extra run just in case first run failed because of API errors    
  ScriptApp.newTrigger(triggerFunction)
      .timeBased()
      .everyDays(1)
      .inTimezone(tmz)
      .atHour(3)
      .create();
}

//---------------------------------------------
function createDebugTrigger() {
  // If no timezone specified, script timezone is used (GMT)
  ScriptApp.newTrigger(triggerFunction)
      .timeBased()
      .everyMinutes(5)
      .create();
}

//---------------------------------------------
function getTriggerDetails () {
  var props = PropertiesService.getUserProperties();
  return {
    type:props.getProperty("execType"), 
    start:props.getProperty("execStarted"), 
    end:props.getProperty("execFinished"), 
    logExists:getLog().length>0, 
    result:props.getProperty("execResult")
  };
}

//---------------------------------------------
function removeAllTriggers() {
  var t = ScriptApp.getProjectTriggers();
  logIt(LOG_CRITICAL,'Removing %s triggers for "%s"',t.length, triggerFunction);
  for (var i=0;i<t.length;i++){
    ScriptApp.deleteTrigger(t[i]);
  };
  return t.length;
}
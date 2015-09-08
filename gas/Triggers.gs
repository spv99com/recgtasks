function initTriggers () {
  var tf = "processRecurrentLists"
  if (TESTMODE == 1) 
    logIt(LOG_CRITICAL,'TESTMODE - No trigger will be installed.');
  else
    if (!ScriptApp.getProjectTriggers().filter(function(trg){ trg.getHandlerFunction() == tf })) {
      logIt(LOG_CRITICAL,'No trigger for "'+tf+'" found. Installing trigger.');
      createTriggers();
    }
    else 
      logIt(LOG_DEV, 'Trigger installed already.');
}

function createTriggers() {
  // Trigger every hour.
  ScriptApp.newTrigger('processRecurrentLists')
      .timeBased()
      .everyHours(1)
      .create();
}

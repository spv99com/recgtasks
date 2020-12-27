//*****************************************
var gTaskQTime = 500;  // 200ms sleep = max 5 Task API requests/user/second
var dateMin = new Date(2000, 0, 1);
var dateMax = new Date(2999, 11, 31);

var userTimeZone = "GMT"; // default value - possible values http://joda-time.sourceforge.net/timezones.html
var appToday = new Date();
var userToday = new Date();

var userEmail = "xxxxx";

var codeBuild = '174';  // code build number automatically updated by build script

/**
 * Special function that handles HTTP GET requests to the published web app.
 * @return {HtmlOutput} The HTML page to be served.
 */
function doGet() {
    // upgrade if needed
    if (isUpgradeNeeded(codeBuild)) performUpgrade(codeBuild);
    
    return HtmlService.createTemplateFromFile('index').evaluate()
        .setTitle('Recurring Tasks')
        .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

//*****************************************
//*****************************************

function processRecurrentLists(testParam, manual) {

  // NO CODE BEFORE AUTHORIZATION CHECK

  // Check if the actions of the trigger requires authorization that has not
  // been granted yet; if not, then end - nothing to do.
  if (!isScriptAuthorized()) {
    //logIt(LOG_CRITICAL,"RecGTasks script is not authorized to run for ", userEmail, " Please, authorize first.");
    return;
  }

  try {
    userEmail = Session.getActiveUser().getEmail();
  } catch(err) {
    logIt(LOG_WARN, "No permissions to read user's email address");
    userEmail = "-not authorized-";
  }

  var userKey = Session.getTemporaryActiveUserKey(); // temporary user key unique, but stable for 1 month, not revealing user's identity
  // hashed user key will be used as log prefix allowing collating log entries from single session
  setLogPrefix(hashFnv32a(userKey, true));

  // upgrade if needed
  if (isUpgradeNeeded(codeBuild)) performUpgrade(codeBuild);

  var userProps;

  // record start of execution
  try {
    logExecutionStart(manual);
    // read user preferecies for this user & script
    userProps = getUserProps();
  } catch (err) {
    logIt(LOG_CRITICAL,"RecGTasks is unable to read user properties. Please, authorize first.");
    return;
  }
  
  logLevel = userProps.logVerboseLevel;
  userTimeZone = userProps.userTMZ;

  // calculate TODAY for user running the script
  userToday = new Date(Utilities.formatDate(appToday, userTimeZone, "yyyy-MM-dd'T'00:00:00.000'Z'"));

  // starting date for calculation is TODAY
  var dateStart = new Date(userToday.getTime());
  dateStart.setHours(0,0,0,0); //set hours/minutes/seconds to zero
  
  // set ending date for recurrent tasks processing
  var dateEnd = new Date(userToday.getTime());
  dateEnd.setDate(dateStart.getDate() + parseInt(userProps.dateRangeLength)); 
  dateEnd.setHours(23,59,59,999);

  //override for testing purposes
  if (TESTMODE == 1) {
     logIt(LOG_ALL, "**** TEST MODE ENABLED ****")
     userProps = testParam.userProps;
     dateStart = testParam.dateStart;
     dateEnd = testParam.dateEnd;
  }
  
  logIt(LOG_DEV, "Executing script as %s", userEmail);
  
  logIt(LOG_DEV, "App Today: %s", appToday);
  logIt(LOG_DEV, "User Time Zone: %s", userTimeZone);
  logIt(LOG_DEV, "User Today: %s", userToday);
  logIt(LOG_DEV, "Date Start: %s", dateStart);
  logIt(LOG_DEV, "Date End: %s", dateEnd);
  logIt(LOG_DEV, "Settings: %s", JSON.stringify(userProps));
  
  logIt(LOG_DEV, "Installed triggers: ");
  ScriptApp.getProjectTriggers().forEach(function (i) { logIt(LOG_DEV, "  >  %s, %s, %s, %s", i.getUniqueId(), i.getEventType(), i.getHandlerFunction(), i.getTriggerSource()) });
   
  var tasks;
  var result;
  var taskProps;
  var taskLists;
  var defaultTaskList = {id:0};
  var destTaskList = {};
  var taskTotal = 0;

  taskLists = safeReadTasklists();

  if (!taskLists){
    result = "Internal Google Error occured - no tasklists received";
    logIt(LOG_CRITICAL,result );
    logExecutionResult(result);
    return result;
  }
    
  if (!taskLists.items) {
    result = 'No task lists found.';
    logIt(LOG_WARN, result);
    logExecutionResult(result);
    return result;
  }
    
  // identify default Task List which instances of recurrent tasks will be copied into
  for (var i = 0; i < taskLists.items.length; i++) {
    if (taskLists.items[i].id == userProps.destTaskListId){
      defaultTaskList.id = taskLists.items[i].id;
      defaultTaskList.title = taskLists.items[i].title;
    }
  }

  destTaskList.id = defaultTaskList.id;
  destTaskList.title = defaultTaskList.title;
  
  // process all Tasks lists and create instances of tasks from Recurrent task lists (those having the right prefix in task list name)
  for (var i = 0; i < taskLists.items.length; i++) {
    logIt(LOG_INFO, 'Processing list "%s" id=%s', taskLists.items[i].title, taskLists.items[i].id);

    // if no default list specified, then destination list is the original list itself
    if (defaultTaskList.id == 0){ 
      destTaskList.id = taskLists.items[i].id;
      destTaskList.title = taskLists.items[i].title;
    }

    if (i == 0 || defaultTaskList.id == 0){
      // create Task Calendar - all recurrent tasks will be created in Task Calendar first
      var taskCal = new TaskCalendar();
      taskCal.setLocale(userProps.weekStartsOn, userProps.dateFormat);
      taskCal.appendPattern(userProps.appendRecPattern == 'Y');
      taskCal.setLogLevel(logLevel);
    }

    logIt(LOG_INFO, 'Tasks will be created in "%s" id=%s', destTaskList.title, destTaskList.id);
      
    // load tasks from Google Tasks recurrent task list
    tasks = getTasks_paged(taskLists.items[i].id, {
      showCompleted:false // tasks flagged as completed will not be processed
      //fields: "items(id,title,notes,due)" //to limit amount of data transported
    });
    if (tasks){
      tasks = tasks.filter(function(t){return !t.due}); // process only tasks with no due date - it is assumed task templates to have no due date
      taskTotal += tasks.length;
      // create instances of recurrent tasks in task calendar
      taskCal.processRecTasks(tasks, dateStart, dateEnd);
    }

    // if saving to original lists or processed the last list to default list
    if (defaultTaskList.id == 0 || i+1 >= taskLists.items.length){
      logIt(LOG_INFO, 'Fetching tasks for deduplication ', 0);
      logIt(LOG_DEV, 'Range Start %s [%s]', dateStart, dateStart.toISOString());
      logIt(LOG_DEV, 'Range End %s [%s]', dateEnd, dateEnd.toISOString());
      
      // load tasks from Google Tasks  Default Task list
      taskProps = {
        dueMin:dateStart.toISOString(), 
        //dueMax:dateEnd.toISOString(),
        showHidden:true,
        showDeleted:userProps.ignoreDeleted == "N",
        fields: "items(id,title,notes,due, deleted)" //to limit amount of data transported
      };
      tasks = getTasks_paged(destTaskList.id, taskProps);
    
      logIt(LOG_INFO, 'Removing possible duplicates for %s task instances.',tasks.length);
      // remove tasks which already exist in Google tasks from our array, so only new tasks will remain
      taskCal.removeDuplicatesFromArray(tasks);
      
      logIt(LOG_INFO, 'Saving newly created instances of tasks.');
      // save tasks from work calendar to Default task list - avoid duplicates
      taskCal.saveAllTasks(destTaskList.id, dateStart, dateEnd)       
         
    }

    // if default task list does exist and sliding of overdue tasks enabled, then slide them to TODAY
    if (userProps.slideOverdue == "Y") {
      slideTasks(taskLists.items[i].id, userToday);
      
      //if sliding caused any duplication, then remove duplicates
      removeDuplicateTasks(taskLists.items[i].id, new Date());
    }  

  }
  
  logIt(LOG_ALL, "*** Execution completed: "+userEmail+" "+taskTotal.toString()+" tasks processed");
  
  saveLog(Logger.getLog());
  logExecutionEnd();
  logExecutionResult("Success.");
  
  return result;
}
  


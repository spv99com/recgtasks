var TESTMODE = 0; //DO NOT DELETE THIS LINE

var TEST_TL_PREFIX = "#!#TEST";

function runTest() {

  TESTMODE = 1;

  var tlDESTtitle = TEST_TL_PREFIX+"-DEST";
  var tlRTTLtitle = TEST_TL_PREFIX+"-RTTL";
  var tlDEST, tlRTTL;
  var prefix = "$R!";
  var dateStart = new Date(2015,11,4,0,0,0); //start of testing period
  var dateEnd = new Date(dateStart.getTime()); //end of testing period
  
  

  USEEXISTING = 0;
  
  if (USEEXISTING == 1) { //find task list #id using task list titles
    tlRTTL = getExistingList(tlRTTLtitle);
    tlDEST = getExistingList(tlDESTtitle);

  } else {
    // create test task list
    tlDEST = createTaskList(tlDESTtitle);
    tlRTTL = createTaskList(prefix+tlRTTLtitle);
  }  
  
  // set testing override values for user properties
  var up = getUserProps();
  up.recListPrefix = prefix;
  up.destTaskListId = tlDEST.id;
  up.logVerboseLevel = "10";
  up.dateRangeLength = "100";
  up.dateFormat = "2"; // US date format MM/DD/YYYY
  up.weekStartsOn = "S";
  
  dateEnd.setDate(dateEnd.getDate()+parseInt(up.dateRangeLength));
  if (!USEEXISTING) {
    // create generic test tasks
    createTestTasks(up, tlRTTL.getId(), dateStart, dateEnd);
    // create test tasks for issue #28
    createTestTasks_i28(up, tlRTTL.getId(), dateStart, dateEnd);
    // create test tasks for issue #28
    createTestTasks_i29(up, tlRTTL.getId(), dateStart, dateEnd);
  }    
   
  processRecurrentLists(
    {userProps:up, 
    dateStart: dateStart, 
    dateEnd: dateEnd
    });


  var repeatProcessingCount = 0; // repeat processing X times
  var repeatProcessingSkipDays = 7; // days to skip with each processing
  var i = 0;

  for (i=0;i<repeatProcessingCount;i++){  
    dateStart.setDate(dateStart.getDate()+repeatProcessingSkipDays);
    dateEnd.setDate(dateEnd.getDate()+repeatProcessingSkipDays);
    Utilities.sleep(2000); //because of requests/second quota
    processRecurrentLists(
      {userProps:up, 
      dateStart: dateStart, 
      dateEnd: dateEnd
      });
  };
    
  checkCreatedTestTasks(up, tlRTTL.id, dateStart, dateEnd);
  
  // remove test task lists

  
}

// ********************************************************************

function getExistingList(title){
  var tl = Tasks.Tasklists.list().getItems()
  tl = tl.filter(function(tl){return tl.title.indexOf(title) >= 0 });
    
  if (tl.length > 0)
    tl = tl[0]
  else
    logIt(LOG_CRITICAL, 'There is no existing list %s',title);

  return tl;

}

// ********************************************************************
function createTestTasks_i28(userProps, dst, ds, de) {
  // test tasks for issue #28

  var r = new Record_RGT();
  r.locFmt.setWeekStart(userProps.weekStartsOn);
  r.locFmt.setDateFmt(userProps.dateFormat);
  
  var t,n;

  // *** MONTHLY every 3 month on 15th
  r.recType = "M";
  r.frequency = 3;
  r.monthly.day = 2;
  r.recStart = new Date(ds.getTime())
  r.recEnd = null; 
  n = r.toString()+"\nSecond line of notes";
  t = "[#i18-01] "+r.recType+(r.frequency|0)+" 2";
  createTask(dst, t, n);

  // *** WEEKLY every 2 month on Monday, Thursday
  r.recType = "W";
  r.frequency = 2;
  r.weekly.days_of_week = [false, true, false, false, true, false, false];
  r.recStart = new Date(ds.getTime())
  r.recEnd = null; 
  n = r.toString()+"\nSecond line of notes";
  t = "[#i18-02] "+r.recType+(r.frequency|0)+" 2 on Mon/Thu";
  createTask(dst, t, n);


}


// ********************************************************************
function createTestTasks_i29(userProps, dst, ds, de) {
  // test tasks for issue #29 - leap year 

  var r = new Record_RGT();
  r.locFmt.setWeekStart(userProps.weekStartsOn);
  r.locFmt.setDateFmt(userProps.dateFormat);
  
  var t,n;

  // *** MONTHLY every 1 month on 29th
  r.recType = "M";
  r.frequency = 1;
  r.monthly.day = 29;
  r.recStart = new Date(ds.getTime())
  r.recEnd = null; 
  n = r.toString()+"\nSecond line of notes";
  t = "[#i29-01] "+r.recType+(r.frequency|0)+" 2";
  createTask(dst, t, n);

  // *** WEEKLY every week on Monday, Thursday, starting on Feb 29, 2016
  r.recType = "W";
  r.frequency = 1;
  r.weekly.days_of_week = [false, true, false, false, true, false, false];
  r.recStart = new Date(2016,1,29);  // February 29,2016 (which is a leap year)
  r.recEnd = new Date(2016,3,31);
  n = r.toString()+"\nSecond line of notes";
  t = "[#i29-02] "+r.recType+(r.frequency|0)+" 1 on Mon/Thu";
  createTask(dst, t, n);


}


// ********************************************************************
function createTestTasks(userProps, dst, ds, de) {

  var r = new Record_RGT();
  r.locFmt.setWeekStart(userProps.weekStartsOn);
  r.locFmt.setDateFmt(userProps.dateFormat);
  
  var t,n;
  var count = 0;
  
  var d = new Date();

  // *** DAILY the first 40 days
  r.recType = "D";
  r.frequency = 1;
  r.recStart = new Date(ds.getTime());
  r.recEnd = new Date(r.recStart.getTime()+86399999); //23:59:59.999
  r.recEnd.setDate(r.recEnd.getDate()+40-1);
  n = r.toString()+"\nSecond line of notes";
  t = "[#01] "+r.recType+(r.frequency|0)+" 40 days";
  createTask(dst, t, n);
  count += 40; //created 40 tasks
  
  // *** DAILY every 3 day the first 40 days
  r.recType = "D";
  r.frequency = 4;
  r.recStart = new Date(ds.getTime());
  r.recEnd = new Date(r.recStart.getTime()+86399999); 
  r.recEnd.setDate(r.recEnd.getDate()+40);
  n = r.toString()+"\nSecond line of notes";
  t = "[#02] "+r.recType+(r.frequency|0)+" (40 days)";
  createTask(dst, t, n);
  count += 10;

  // *** WEEKLY every 1 week the first 40 days
  r.recType = "W";
  r.frequency = 1;
  r.weekly.days_of_week = [false, true, false, false, true, false, false];
  r.recStart = new Date(ds.getTime());
  r.recEnd = new Date(r.recStart.getTime()+86399999); 
  r.recEnd.setDate(r.recEnd.getDate()+40);
  n = r.toString()+"\nSecond line of notes";
  t = "[#03] "+r.recType+(r.frequency|0)+" Mo,Th (40 days)";
  createTask(dst, t, n);
  count += 10;
  
  // *** WEEKLY every 3 week whole period
  r.recType = "W";
  r.frequency = 3;
  r.weekly.days_of_week = [false, false, true, false, false, false, false];
  r.recStart = null;
  r.recEnd = null; 
  n = r.toString()+"\nSecond line of notes";
  t = "[#04] "+r.recType+(r.frequency|0)+" Tue (all)";
  createTask(dst, t, n);
  count += 10;
  

  // *** MONTHLY every 1 month on 20th the first 100 days
  r.recType = "M";
  r.frequency = 1;
  r.monthly.day = 20;
  r.recStart = new Date(ds.getTime())
  r.recEnd = new Date(r.recStart.getTime()+86399999); 
  r.recEnd.setDate(r.recEnd.getDate()+100);
  n = r.toString()+"\nSecond line of notes";
  t = "[#05] "+r.recType+(r.frequency|0)+" 20 (100 days)";
  createTask(dst, t, n);
  count += 3;

  // *** MONTHLY every 2 month on 31st whole period
  r.recType = "M";
  r.frequency = 2;
  r.monthly.day = 31; //this is going to test month alignment too => 31 is the last day of a month, so in February it should create instance on 28th
  r.recStart = null;
  r.recEnd = null;
  n = r.toString()+"\nSecond line of notes";
  t = "[#06] "+r.recType+(r.frequency|0)+" 31 (all)";
  createTask(dst, t, n);
  count += 3;

  // *** YEARLY every JUN 20 whole period
  r.recType = "Y";
  r.frequency = 1;
  r.yearly.day = 20;
  r.yearly.month = 5; //months are 0-11
  r.recStart = null;
  r.recEnd = null;
  n = r.toString()+"\nSecond line of notes";
  t = "[#07] "+r.recType+(r.frequency|0)+" June 20 (all)";
  createTask(dst, t, n);
  count += 1;
  
  // *** MONTHLY every 1 month on 31 whole period
  r.recType = "M";
  r.frequency = 1;
  r.monthly.day = 8; 
  r.recStart = null;
  r.recEnd = null;
  n = r.toString()+"\nSecond line of notes";
  t = "[#08] "+r.recType+(r.frequency|0)+" 8 (all)";
  createTask(dst, t, n);
  count += 3;
  
  // *** DAILY from the today+2 for 10 days
  r.recType = "D";
  r.frequency = 1;
  r.recStart = new Date();
  r.recStart.setHours(0,0,0,0);
  r.recStart.setDate(r.recStart.getDate()+2)
  r.recEnd = new Date(r.recStart.getTime()+86399999); //23:59:59.999
  r.recEnd.setDate(r.recEnd.getDate()+10-1);
  n = r.toString()+"\nSecond line of notes";
  t = "[#09] "+r.recType+(r.frequency|0)+" 10 days";
  createTask(dst, t, n);
  count += 10; //created 10 tasks
  
  

}

// ********************************************************************
function cleanupTestTasks(userProperies) {

  var tlTitle = TEST_TL_PREFIX;

  var tl = getTaskLists();
  for (var i=0; i<tl.length; i++){
    if (tl[i].name.indexOf(tlTitle) >= 0) 
      Tasks.Tasklists.remove(tl[i].id);
  }

}

// ********************************************************************
function checkCreatedTestTasks(userProperies) {

}

// ********************************************************************
function testSliding(){

  var tl = createTaskList(TEST_TL_PREFIX+" sliding");
  var dt = new Date();
  dt.setHours(0,0,0,0);

  // today task - should not slide
  dt.setDate(dt.getDate());
  Tasks.Tasks.insert({title:"today task #0",due:date2rfc3339(dt)}, tl.id); 

  // future task - should not slide
  dt.setDate(dt.getDate()+1);
  Tasks.Tasks.insert({title:"sliding task #0",due:date2rfc3339(dt)}, tl.id); 

  // past due task, not completed, but duplicate - should not slide
  dt.setDate(dt.getDate()-7);
  Tasks.Tasks.insert({title:"today task #0",notes:"overdue duplicate", due:date2rfc3339(dt)}, tl.id); 

  // past due task, not completed - should slide
  dt.setDate(dt.getDate());
  Tasks.Tasks.insert({title:"sliding task #1",due:date2rfc3339(dt)}, tl.id); 
  
  // past due, completed - should NOT slide
  dt.setDate(dt.getDate()+1);
  Tasks.Tasks.insert({title:"sliding task #2",due:date2rfc3339(dt),completed:date2rfc3339(dt), status:"completed"}, tl.id); 

  // past due, deleted - should NOT slide
  dt.setDate(dt.getDate()+1);
  Tasks.Tasks.insert({title:"sliding task #3",due:date2rfc3339(dt),deleted:true}, tl.id); 

  // past due task, not completed - should slide
  dt.setDate(dt.getDate()+1);
  Tasks.Tasks.insert({title:"sliding task #4",due:date2rfc3339(dt)}, tl.id); 

  slideTasks(tl.id, new Date());
  
  removeDuplicateTasks(tl.id, new Date());
  
}

// ********************************************************************
function testProcessedTasks(){
  var tl = getExistingList("~R My repeating tasks");
  var tasks = getProcessedTasks(tl.id);
  
  Logger.log(tasks);
  
}

// ********************************************************************
function testDate(){
  Logger.log(new Date("Wed Jul 28 1993"));

}

// ********************************************************************
// testing compatibility issues with property values saved by older versions of script
function testLoadProps(){
  var p = PropertiesService.getUserProperties();
  var allOK = true;
  
  // read user specific properties and initialize them if needed
  var newp = {
    destTaskListId: p.getProperty("destTaskListId"),
    dateRangeLength: p.getProperty("dateRangeLength"),
    recListPrefix: p.getProperty("recListPrefix"),
    dateFormat: p.getProperty("dateFormat"), 
    logVerboseLevel: p.getProperty("logVerboseLevel"),
    weekStartsOn: p.getProperty("weekStartsOn"),
    ignoreDeleted: p.getProperty("ignoreDeleted"), 
    slideOverdue: p.getProperty("slideOverdue") 
  };
  
  logIt(LOG_DEV, "Props loaded %s",JSON.stringify(newp));
  
  //-------------
  
  logIt(LOG_DEV, "Setting test values");
  
  newp.logVerboseLevel = "9";
  newp.dateFormat = "1.0"
  p.setProperties(newp, false); //then write them and keep all other properties (if any)
  
  //--------------
  getUserProps();


}



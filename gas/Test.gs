var TESTMODE = 0; //DO NOT DELETE THIS LINE

function runTest() {

  TESTMODE = 1;

  var tlDESTtitle = "##TEST##";
  var tlRTTLtitle = "##TEST##";
  var tlDEST, tlRTTL;
  var prefix = "$!@#$#@-";
  var dateStart = new Date(2014,11,1,0,0,0); //start of testing period
  var dateEnd = new Date(2015,10,30,23,59,59,999); //end of testing period
  

  // create test task list
  tlDEST = createTaskList(tlDESTtitle);
  tlRTTL = createTaskList(prefix+tlRTTLtitle);
  
  // set testing override values for user properties
  var up = getUserProps();
  up.recListPrefix = prefix;
  up.destTaskListId = tlDEST.getId();
  up.logVerboseLevel = 999;
  up.dateRangeLength = 355;
  up.dateFormat = "2";
  up.weekStartsOn = "S";
 
  createTestTasks(up, tlRTTL.getId(), dateStart, dateEnd);
   
  processRecurrentLists(
    {userProps:up, 
    dateStart: dateStart, 
    dateEnd: dateEnd
    })
    
  checkCreatedTestTasks(up, tlRTTL.getId(), dateStart, dateEnd);
  
  // remove test task lists

  
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
  r.recEnd.setDate(r.recEnd.getDate()+40);
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
  

  // *** MONTHLY every 1 month on 20 the first 100 days
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

  // *** MONTHLY every 1 month on 31 whole period
  r.recType = "M";
  r.frequency = 1;
  r.monthly.day = 31;
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

}

// ********************************************************************
function checkCreatedTestTasks(userProperies) {

}

// ********************************************************************


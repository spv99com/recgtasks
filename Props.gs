
//---------------------------------------------------
// Read user-level properties for this script from Google properties store
function getUserProps() {
  var p = PropertiesService.getUserProperties();
  var newp = {
    destTaskListName: p.getProperty("destTaskListName"),
    dateRangeLength: parseInt(p.getProperty("dateRangeLength")),
    recListPrefix: p.getProperty("recListPrefix"),
    dateFormat: p.getProperty("dateFormat")
  };

  if (!newp.destTaskListName) {
    newp = {
      destTaskListName: "Default",
      dateRangeLength: 60,
      recListPrefix: "RTTL",
      dateFormat: 1
    }
    setUserProps(newp);
    Logger.log('User properties initialized.')
  }
  
  return newp
}  

//--------------------------------------------------
// Save user-level properties for this script to Google properties store
function setUserProps(newp) {
  var p = PropertiesService.getUserProperties();
  p.setProperties(newp);
   Logger.log("User properties saved.");
  return newp
}

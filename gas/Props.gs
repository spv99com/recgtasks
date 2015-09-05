// Copyright 2015 Jozef Sovcik. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

//*********************************************************

//---------------------------------------------------
// Read user-level properties for this script from Google properties store
function getUserProps() {
  var p = PropertiesService.getUserProperties();
  var allOK = true;

  // read user specific properties and initialize them if needed
  var newp = {
    destTaskListName: p.getProperty("destTaskListName") || (allOK = false) || Tasks.Tasklists.list().items[0].title,
    dateRangeLength: parseInt(p.getProperty("dateRangeLength")) || (allOK = false) || parseInt("60") ,
    recListPrefix: p.getProperty("recListPrefix") ||  (allOK = false) || "RTTL",
    dateFormat: p.getProperty("dateFormat") || (allOK = false) || parseInt("1"),
    logVerboseLevel: p.getProperty("logVerboseLevel") || (allOK = false) || parseInt("3")
  };

  //if not all properties were written in the property store
  if (!allOK) {
    p.setProperties(newp, true); //then write them and delete all other properties (if any)
    logIt(LOG_CRITICAL,'User properties initialized.');
  }
  
  return newp
}  

//--------------------------------------------------
// Save user-level properties for this script to Google properties store
function setUserProps(newp) {
  var p = PropertiesService.getUserProperties();
  p.setProperties(newp);
  logIt(LOG_INFO, "User properties saved.");
  return newp
}

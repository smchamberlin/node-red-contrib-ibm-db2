/**
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
module.exports = function(RED) {

    var cfEnv = require("cfenv");
    var appEnv = cfEnv.getAppEnv();
    var debugLocal = false;
    var SQLDBservices = [];
    var dashDBservices = [];

    // load the services bound to this application
    function extractProperties(v) {
      return { name: v.name, label: v.label };
    }

    for (var i in appEnv.services) {
        // filter for SQLDB services
        if (i.match(/^(sqldb)/i)) {
            SQLDBservices = SQLDBservices.concat(appEnv.services[i].map(extractProperties));
        }
        // filter for dashDB services
        else if (i.match(/^(Analytics)/i) || i.match(/^(dashDB)/i)) {
            dashDBservices = dashDBservices.concat(appEnv.services[i].map(extractProperties));
        }
        else if (i.match(/^(user-provided)/i)) {
            SQLDBservices = SQLDBservices.concat(appEnv.services[i].map(extractProperties));
            dashDBservices = dashDBservices.concat(appEnv.services[i].map(extractProperties));
        }
    }

    //
    // HTTP endpoints that will be accessed from the HTML file
    //
    RED.httpAdmin.get('/sqldb/vcap', function(req,res) {
        res.send(JSON.stringify(SQLDBservices));
    });
    
    RED.httpAdmin.get('/dashDB/vcap', function(req,res) {
        res.send(JSON.stringify(dashDBservices));
    });

    function SQLDBOutNode(n) {

        RED.nodes.createNode(this,n);

        var db              = require('ibm_db')();
        this.table          = n.table;
        var SQLDBconfig     = appEnv.getService(n.service);

        if (!this.table) {
	    this.error("SQLDB node configuration error: table not defined");
	    return;
	}

	if (!SQLDBconfig) {
	   this.error("SQLDB node configuration error: service not defined");
	   return; 
	}

	var node = this;
        var db2 = {};
        if (!debugLocal) {
           db2.db = SQLDBconfig.credentials.db;               
           db2.username = SQLDBconfig.credentials.username;
           db2.hostname = SQLDBconfig.credentials.hostname;
           db2.password = SQLDBconfig.credentials.password;
           db2.port = SQLDBconfig.credentials.port;
        }
        // This is for debugging locally
        else {
           db2 = {
           db: "TESTDB",
           hostname: "localhost",
           port: 50000,
           username: "db2admin",
           password: "yourpassword"
           };
        }

        var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port;

        try {
           console.log("SQLDB output node: Opening db connection...");
           db.openSync(connString);
           console.log("SQLDB output node: Connection open");
	   }
	catch (e) {
           node.error(e.message);
	}

        var columnList = getColumns(node,db,node.table,"SQLDB output node");
        console.log("SQLDB output node: columnList: " + columnList);

        node.on("close", function() {
        console.log("SQLDB output node: Closing db connection...");
        db.closeSync();
        console.log("SQLDB output node: Connection closed");
        });

        console.log("columnList: " + columnList);  
        var questionMarks = genQuestionMarks(columnList);
        
        var insertStatement = "insert into '"+node.table+"' (" + columnList + ") values("+questionMarks+")";
        console.log("SQLDB output node: Preparing insert statement: " + insertStatement);	

        node.on("input", function(msg) {
		db.prepare(insertStatement, function (err, stmt) {
                   if (err) {
		      node.error("SQLDB output node: " + err);
		   }
		   else  {
		      console.log("SQLDB output node: Prepare successful");
		      processInput(node,msg,db,stmt,columnList,"SQLDB");
		   }
		});
	});
     }

    function dashDBOutNode(n) {

        RED.nodes.createNode(this,n);

        var db              = require('ibm_db')();
        this.table          = n.table;
        var dashDBconfig    = appEnv.getService(n.service);

        if (!this.table) {
	    this.error("dashDB node configuration error: table not defined");
	    return;
	}

	if (!dashDBconfig) {
	   this.error("dashDB node configuration error: service not defined");
	   return; 
	}

	var node = this;
        var db2 = {};
        if (!debugLocal) {
           db2.db = dashDBconfig.credentials.db;               
           db2.username = dashDBconfig.credentials.username;
           db2.hostname = dashDBconfig.credentials.hostname;
           db2.password = dashDBconfig.credentials.password;
           db2.port = dashDBconfig.credentials.port;
        }
        // This is for debugging locally
        else {
           db2 = {
              db: "TESTDB",
              hostname: "localhost",
              port: 50000,
              username: "db2admin",
              password: "yourpassword"
           };
        }

        var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port;

        try {
           console.log("dashDB output node: Opening db connection...");
           db.openSync(connString);
           console.log("dashDB output node: Connection open");
	}
	catch (e) {
           node.error(e.message);
	}

        var columnList = getColumns(node,db,node.table,"dashDB output node");
        console.log("dashDB output node: columnList: " + columnList);

        node.on("close", function() {
           console.log("dashDB: Closing db connection...");
           db.closeSync();
           console.log("dashDB output node: Connection closed");
        });

        var questionMarks = genQuestionMarks(columnList);
        
        var insertStatement = "insert into '"+node.table+"' (" + columnList + ") values("+questionMarks+")";
        console.log("dashDB output node: Preparing insert statement: " + insertStatement);	
   
        node.on("input", function(msg) {
		db.prepare(insertStatement, function (err, stmt) {
                   if (err) {
		      node.error("dashDB output node: " + err);
		   }
		   else  {
		      console.log("dashDB output node: Prepare successful");
		      processInput(node,msg,db,stmt,columnList,"dashDB");
		   }
		});
	});
     }

RED.nodes.registerType("sqldb out", SQLDBOutNode);
RED.nodes.registerType("dashDB out", dashDBOutNode);

function getColumns (node,db,table,service) {
      //Remove the schema, if it exists, hopefully the table name is unique - need to improve this
      var removeSchema = table.split(".");
      if (removeSchema.length > 1) { table = removeSchema[1]; }
      console.log(service+": Fetching column names for table " + table + "...");
      var sysibmColumns;
      try {
         sysibmColumns = db.querySync("select name from sysibm.syscolumns where tbname = '"+table+"' and generated = ''"); 
      }
      catch (e) {
         node.error("Error fetching column list: " + e.message);
         return -1;
      }

      if (sysibmColumns.length == 0) {
         node.error(service+": table "+table+" not found - is it defined?  Case matters."); 
         return -1;
      }
      var columnList = [];
      for (var i = 0; i < sysibmColumns.length; i++) {
           columnList.push(sysibmColumns[i].NAME);
       }
     return columnList;
     }

function processInput (node,msg,db,stmt,columnList,service) {
      console.log(service+": Input event received");
      console.log(service+": columnList: "+columnList);
      var valueToInsert;
      var batchInsert;
      var valueList;
      var insertIterations;
      if (msg.payload instanceof Array) {
         console.log(service+": msg.payload is an array, need to iterate...");
         batchInsert = true;
         insertIterations = msg.payload.length; 
         }
      else {
         console.log(service+": msg.payload not an array"); 
         batchInsert = false;
         insertIterations = 1;
         }
//      db.beginTransaction(function (err) {
//         if (err) node.error(service+": "+err);
         for (var i = 0; i < insertIterations; i++) {
            valueList = [];
            for (var j = 0; j < columnList.length; j++) {
               if (batchInsert == true) valueToInsert = msg.payload[i][columnList[j]];
               else valueToInsert = msg.payload[columnList[j]];
               if (valueToInsert !== undefined) {
                  if (valueToInsert == 'TIMESTAMP') {
                     valueList.push(genDB2Timestamp());
                     } 
                  else {
                     valueList.push(valueToInsert);
                     }
                  }
               else {node.error(service+": Column "+columnList[j]+" is missing from the payload or has an undefined value"); return;}
            }
            console.log("Values to execute:");
            console.log(valueList);
            stmt.execute(valueList, function (err, result) {
               if (err) {
                  node.error(service+": Insert failed: "+err); 
               } else {
                  console.log(service+": Insert successful!"); 
                  result.closeSync();
               }
            });
         }
//      db.commitTransaction(function(err){
//      if (err) {
//              console.log(service+": Error during commit: " + err);
//           }
//           else {
//               console.log(service+": Commit successful");
//           }
//         });
//      });
   }

function pathToArray(commaSeperatedPaths) {
   var pathList = commaSeperatedPaths.split(",");
   var resultArray = new Array(pathList.length);
   for (var i = 0; i < pathList.length; i++) {
      var pathString = pathList[i];
      var fields = pathString.split(".");
      resultArray[i] = fields;
   }
   return resultArray;
}


function extractValues(data, targets) {
   // dbresult will store all resulting targets
   data = {"msg":data};
   var dbresult = [];
   // loop over all targets
   for (var target_index=0; target_index<targets.length; target_index++) {
      var value = data;
      var target = targets[target_index];
      // loop over all fields in target
      for (var field_index=0; field_index<target.length; field_index++) {
         var field = target[field_index];
         // Final value will be the result
         // from the nested data structure
         value = value[field];
      }
      // append value to results
      dbresult.push(value);
   }
   return dbresult;
}

function genQuestionMarks(colList) {
	var count = colList.length;
	var resultString = "";
	for (var i = 0; i < count; i++) {
		resultString += "?";
		if (i < count - 1) {
			resultString += ", ";
		}
	}
	return resultString;
}

function genDB2Timestamp() {
   var d = new Date();
      return d.getFullYear() + "-" +
      ("00" + (d.getMonth() + 1)).slice(-2) + "-" +
      ("00" + d.getDate()).slice(-2) + " " +
      ("00" + d.getHours()).slice(-2) + ":" +
      ("00" + d.getMinutes()).slice(-2) + ":" +
      ("00" + d.getSeconds()).slice(-2);
}

function SQLDBQueryNode(n) {

        RED.nodes.createNode(this,n);
        var db              = require('ibm_db')();
        var query           = n.query;
        var params          = n.params;
        var SQLDBconfig     = appEnv.getService(n.service);

        if (!SQLDBconfig) {
           this.error("SQLDB node configuration error: service not defined");
           return;
        }

        var node = this;
        var db2 = {};
        if (!debugLocal) {
           db2.db = SQLDBconfig.credentials.db;
           db2.username = SQLDBconfig.credentials.username;
           db2.hostname = SQLDBconfig.credentials.hostname;
           db2.password = SQLDBconfig.credentials.password;
           db2.port = SQLDBconfig.credentials.port;
        }
        // This is for debugging locally
        else {
           db2 = {
           db: "TESTDB",
           hostname: "localhost",
           port: 50000,
           username: "db2admin",
           password: "yourpassword"
           };
        }

        var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port;

        try {
           console.log("SQLDB query node: Opening db connection...");
           db.openSync(connString);
           console.log("SQLDB query node: connection open");
           }
        catch (e) {
           node.error(e.message);
        }

        node.on("close", function() {
           console.log("SQLDB query node: Closing db connection...");
           db.closeSync();
           console.log("SQLDB query node: Connection closed");
        });


        this.on('input', function(msg) {
           if (query == "" || query == null) {
              if (msg.payload == "" || msg.payload == null) {
                 node.error("SQLDB query node: msg.payload is empty!");
                 return;
                 } 
              queryToUse = msg.payload; 
           }
           else {
              queryToUse = query;
           }
           var parameterValues=[];
           if (params != "" && params != null) {
              var path = pathToArray(params.toString());
              console.log("Input node: pathToArray: " + path);
              parameterValues = extractValues(msg, path);
              console.log("Input node: parameterValues: " + parameterValues);
           }
           db.query(queryToUse,parameterValues,function (err, rows, moreResultSets) {
              queryresult = null;
              if (err) {
                 node.error("SQLDB query node: " + err);
                 msg.error = err;
              } else {
                 console.log("Fetching rows: " + rows);
                 console.log("value 1: " + JSON.stringify(rows[0]));
                 if (rows.length == 1) {queryresult = rows[0];}
                 else {
                    queryresult = []; 
                    for (var i = 0; i < rows.length; i++) {
                       queryresult.push(rows[i]);
                    }
                 }
              }
              msg.payload = queryresult;
              node.send(msg);
          });
      });
    }
    RED.nodes.registerType("sqldb in",SQLDBQueryNode);


function dashDBQueryNode(n) {

        RED.nodes.createNode(this,n);
        var db              = require('ibm_db')();
        var query           = n.query;
        var params          = n.params;
        var dashDBconfig    = appEnv.getService(n.service);

        if (!dashDBconfig) {
           this.error("dashDB query node configuration error: service not defined");
           return;
        }

        var node = this;
        var db2 = {};
        if (!debugLocal) {
           db2.db = dashDBconfig.credentials.db;
           db2.username = dashDBconfig.credentials.username;
           db2.hostname = dashDBconfig.credentials.hostname;
           db2.password = dashDBconfig.credentials.password;
           db2.port = dashDBconfig.credentials.port;
        }
        // This is for debugging locally
        else {
           db2 = {
           db: "TESTDB",
           hostname: "localhost",
           port: 50000,
           username: "db2admin",
           password: "yourpassword"
           };
        }

        var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port;

        try {
           console.log("dashDB query node: Opening db connection...");
           db.openSync(connString);
           console.log("dashDB query node: Connection open");
           }
        catch (e) {
           node.error(e.message);
        }

        node.on("close", function() {
           console.log("dashDB query node: Closing db connection...");
           db.closeSync();
           console.log("dashDB query node: Connection closed");
        });


        this.on('input', function(msg) {
           if (query == "" || query == null) {
              if (msg.payload == "" || msg.payload == null) {
                 node.error("dashDB query node: msg.payload is empty!");
                 return;
                 } 
              queryToUse = msg.payload; 
           }
           else {
              queryToUse = query;
           }
           var parameterValues=[];
           if (params != "" && params != null) {
              var path = pathToArray(params.toString());
              console.log("Input node: pathToArray: " + path);
              parameterValues = extractValues(msg, path);
              console.log("Input node: parameterValues: " + parameterValues);
           }
           db.query(queryToUse,parameterValues,function (err, rows, moreResultSets) {
              queryresult = null;
              if (err) {
                 node.error("dashDB query node: " + err);
                 msg.error = err;
              } else {
                 console.log("Fetching rows: " + rows);
                 console.log("value 1: " + JSON.stringify(rows[0]));
                 if (rows.length == 1) {queryresult = rows[0];}
                 else {
                    queryresult = []; 
                    for (var i = 0; i < rows.length; i++) {
                       queryresult.push(rows[i]);
                    }
                 }
              }
              msg.payload = queryresult;
              node.send(msg);
        });
      });
    }
  RED.nodes.registerType("dashDB in",dashDBQueryNode);

};

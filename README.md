node-red-node-cf-sqldb
=========================
[Node-RED](http://nodered.org) nodes to work with a database 
in a SQLDB or dashDB service that is integrated with
[IBM Bluemix](http://bluemix.net).

Install
-------
Install from [npm](http://npmjs.org)
```
npm install node-red-nodes-cf-sqldb-dashdb
```

Usage
-----
This package contains 4 nodes -- two pairs of nodes for each of SQLDB and dashDB services.  The node pairs work almost identically, so the documentation contained here
applies to both.  For each service, a query and an output node is provided.  The query nodes let you issue a query against
your SQLDB or dashDB service and pass along the result set in the msg object.  The output nodes store elements from the msg object
into your SQLDB or dashDB service database.


Query node usage:
-----------------

You will need to fill in the following fields:

-- Service should point to your SQLDB or dashDB service.

-- Query is the SQL select query you wish to execute on your dashDB service database.  If the
field is empty, it will get the query from the msg.payload.

These fields are optional:

-- Parameter Markers is a comma delimited set of json paths.  These will replace any question
marks that you place in your SQL query, in the order that they appear.

-- Name: Optionally give your node a name

The results of your query will be returned as a JSON array in msg.payload.  If there are any errors
during execution of the query, the payload will be null and the error will be returned in msg.error.


Output node usage:
------------------

The output node will get the values to insert from msg.payload.  

So for example, you might create a function node that flows into your sqldb output node
with code like this:

```
msg.payload = 
{
  TS : 'TIMESTAMP',
  SCREENNAME : msg.tweet.user.screen_name,
  TWEET : msg.payload,
  SENTIMENT : msg.sentiment.score,
  LOCATION : msg.location
}
return msg;
```

This would assume that you have a table already created with columns (TS, SCREENNAME, TWEET, SENTIMENT, LOCATION).
'TIMESTAMP' string is a special keyword that the node will replace with a real DB2 timestamp before insertion.
If you are missing a required column, an error will be displayed in the debug view.

For output node configuration, you will need to fill in the following fields:

-- Service should point to your SQLDB or dashDB service.

-- Table should point to the table you wish to insert the values into.
This table needs to exist already in the database and needs to contain the
same number of columns that you are inserting through this node. The data
types of the columns have to match. The data coming into the node through 
the msg.payload needs to be in the format accepted by DB2 and within the 
appropriate ranges/parameters for that datatype.

The following fields are optional:

-- Name: Optionally give your node a name, otherwise the default will be the table name.


Authors
-------
* [Steven Chamberlin](https://github.com/smchamberlin) - [smc2@us.ibm.com](mailto:smc2@us.ibm.com)
* [Nicholas Vargas](https://github.com/navargas) 

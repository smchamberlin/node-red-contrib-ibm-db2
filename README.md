node-red-contrib-ibm-db2
=========================

## PLEASE NOTE: This git exists for legacy/archive purposes, but all active development has moved here:

- https://github.com/node-red-contrib-ibm-cloud/node-red-contrib-ibm-db2

[Node-RED](http://nodered.org) nodes to work with a Db2 database (LUW) 
including `DB2 on Cloud` and `Db2 Warehouse on Cloud` services on IBM Cloud.

Install
-------
Install from [npm](http://npmjs.org)
```
npm install node-red-contrib-ibm-db2
```

Usage
-----
This package contains 2 nodes `Db2 in` (query node) and `Db2 out` (output node).  The query node let you issue a query against
Db2 and pass along the result set in the msg object.  The output node stores elements from the msg object
into your Db2 service database.


Query node usage:
-----------------

You will need to fill in the following fields:

-- Service should point to your IBM `Db2 on Cloud` or `Db2 Warehouse on Cloud` service, or choose the `External Service` option to connect to a Db2 database that exists outside of the IBM cloud.

-- Query is the SQL select query you wish to execute on your database.  If the
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
'TIMESTAMP' string is a special keyword that the node will replace with a real Db2 timestamp before insertion.
If you are missing a required column, an error will be displayed in the debug view.

For output node configuration, you will need to fill in the following fields:

-- Service should point to your IBM `Db2 on Cloud` or `Db2 Warehouse on Cloud` service, or choose the `External Service` option to connect to a Db2 database that exists outside of the IBM cloud.

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

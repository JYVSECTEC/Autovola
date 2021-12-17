import os
import sys
import logging
import pymongo
from pymongo import MongoClient

# logging
logging.basicConfig(filename='/var/log/api.log', filemode='a+', format='%(asctime)s - %(message)s', datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger('mongo')
logger.addHandler(logging.StreamHandler(sys.stdout))
logger.setLevel(logging.INFO)

# Create connection to autovola MongoDB database
def connect(database):
    db_hostname = os.getenv("MONGO_HOSTNAME")
    client = MongoClient(db_hostname + ":27017", 
            username=os.getenv("MONGO_USER"), 
            password=os.getenv("MONGO_PASSWORD"), 
            authSource=database, 
            authMechanism="SCRAM-SHA-256")
    return client

# Create new document by inserting data to table
def insert(client, database, table, data):
    db = client[database] # Database
    db_table = db[table] # Table
    try:
        result = db_table.insert_one(data) # Send data to table
    except Exception as e:
        logger.error("ERROR - sending data to database %s table %s caused error: %s", database, table, e)
        return "error"
    return result.inserted_id # return bson.objectid.ObjectId

# Update existing document in table
def update(client, database, table, data, db_id):
    db = client[database] # Database
    db_table = db[table] # Table
    try:
        result = db_table.update({"_id": db_id}, {"$set": data}) # Update data in document
    except Exception as e:
        logger.error("ERROR - sending data to database %s table %s document with ID %s caused error: %s", database, table, str(db_id), e)
        return "error"

    try: # Check if document was succesfully updated
        if result["updatedExisting"] == True:
            result = "ok"
        else:
            result = "error"
    except TypeError:
        result = "error"
    return result

# Update document in table or create new document
def upload_data(database, table, data, db_id = None):
    client = connect(database)
    try:
        if db_id == None: # If no db_id is given, create new document
            result = insert(client, database, table, data)
        else: # If db_id is given, update document with that ID
            result = update(client, database, table, data, db_id)
    except pymongo.errors.ServerSelectionTimeoutError:
        logger.error("ERROR - timeout when connecting DB: %s", e)
        result = "timeout"
    return result

# Run file to check that DB connection works
if __name__ == "__main__":
    mydict = { "name": "John", "address": "Highway 37" }
    result = upload_data("autovola", "pluginresults", mydict)
    print(result)

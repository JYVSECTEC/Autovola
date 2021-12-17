import os
import sys
import pymongo
import logging
from pymongo import MongoClient
from bson.objectid import ObjectId

# logging
logging.basicConfig(format='%(asctime)s - %(levelname)s - %(message)s', datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger('mongo')
logger.setLevel(logging.INFO)

# Function for handling Mongo DB updates and inserts
def upload_data(database, table, data, db_id = None):
    client = connect(database)
    try:
        if db_id == None: # If no DB ID is specified, new document is created into Mongo DB
            result = db_insert(client, database, table, data)
        else: # DB ID exists so new data is added to old document
            result = db_update(client, database, table, data, db_id)
    except pymongo.errors.ServerSelectionTimeoutError as e:
        logger.error("timeout when connecting MongoDB: %s", e)
        result = "timeout"
    except Exception as e:
        logger.error("error when connecting MongoDB: %s", e)
        result = "error"
    return result

# Function for connecting MongoDB service in localhost
def connect(database):
    # Username, password and hostname are retrieved from environment variables
    username = os.getenv("MONGO_USER")
    password = os.getenv("MONGO_PASSWORD")
    hostname = os.getenv("MONGO_HOSTNAME")
    
    # Create connection to DB
    client = MongoClient(hostname + ":27017", 
            username=username, 
            password=password, 
            authSource=database,
            authMechanism="SCRAM-SHA-256")
    return client # returns the established connection

# Function for updating existing document in MongoDB (Database ID is known)
def db_update(client, database, table, data, db_id):
    db = client[database] # Database
    db_table = db[table] # Database table
    try:
        result = db_table.update({"_id": ObjectId(db_id)}, {"$set": data}) # Send update query to DB
    except Exception as e:
        logger.error("Failure updating table %s DB ID %s with data %s because: %s", table, db_id, data, e)
        result = "error"
    if result["updatedExisting"] == True: # If updatedExisting field is True, update was successful
        result = "ok"
    else:
        logger.error("Failed to update table %s document with DB ID %s with data %s", table, db_id, data)
        result = "error"
    #find = db_table.find_one()
    return result

# Function for creating new document in MongoDB table (Database ID is not known)
def db_insert(client, database, table, data):
    db = client[database]
    db_table = db[table]
    try:
        result = db_table.insert_one(data)
    except Exception as e:
        logger.error("Failed to insert table %s document with DB ID %s with data %s due to: %s", table, db_id, data, e)
        result = "error"
    #find = db_table.find_one()
    return result.inserted_id

# Function for deleting document from Mongo DB
def db_delete(client, database, table, data):
    db = client[database]
    db_table = db[table]
    try: # Delete document
        result = db_table.delete_one(data)
        result = result.raw_result
        if result["ok"] == 1.0:
            result = "ok"
        else:
            result = "error"
    except Exception as e:
        logger.error("Failure deleting table %s document with data %s because: %s", table, data, e)
        result = "error"
    return result

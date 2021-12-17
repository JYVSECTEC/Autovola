from pymongo import MongoClient
import pymongo

def connect(database):
    client = MongoClient("mongo.autovola.com:27017", 
            username="root", 
            password="example", 
            authSource=database, 
            authMechanism="SCRAM-SHA-256")
    return client

def insert(client, database, table, data):
    db = client[database]
    db_table = db[table]
    result = db_table.insert_one(data)
    #find = db_table.find_one()
    return result.inserted_id

def update(client, database, table, data, db_id):
    db = client[database]
    db_table = db[table]
    try:
        result = db_table.update({"_id": db_id}, {"$set": data})
    except:
        print("LOG THIS")
        result = "error"
    print(result)
    try:
        if result["updatedExisting"] == True:
            result = "ok"
        else:
            result = "error"
    except TypeError:
        result = "error"
    print("Update: " + str(result))
    #find = db_table.find_one()
    return result

def upload_data(database, table, data, db_id = None):
    client = connect(database)
    try:
        if db_id == None:
            result = insert(client, database, table, data)
        else:
            result = update(client, database, table, data, db_id)
    except pymongo.errors.ServerSelectionTimeoutError:
        # LOG THIS
        result = "timeout"
    print(type(result))
    return result

if __name__ == "__main__":
    mydict = { "name": "John", "address": "Highway 37" }
    test = upload_data("autovola", "pluginresults", mydict)
    print(test)
    

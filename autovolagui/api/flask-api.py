import os
import re
import sys
import json
import time
import string
import logging
import requests
import datetime
import threading
import mongoconn

from bson.objectid import ObjectId
from unidecode import unidecode

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

''' 
uploading example content: {'1613464423125': {'current_chunk': 215, 'db_id': ObjectId('602b83681b294345cf750705')}, 1613465285512: 17}

uploading contains information about ongoing symbol file and dump uploads. Dump and symbol file nodes are different, which is explained below.

Symbol file node example: 1613465285512: 17
- Key: 1613465285512 (Type: int) is client calculated from current time when client starts uploading symbol file.
  Key is unique for each file and when sending chunk of the file, client has to always send the same key, so backend knows which file is being uploaded.
- Value: 17 (Type: int) is the number of the current chunk being send. Each time chunk is received, this value is increased by 1.
  Client also increments the chunk number it sends by 1 so it corresponds to this value. 
  This is to make sure that the same chunk isn't written several times to file resulting in it being corrupted. 

Dump node example: '1613464423125': {'current_chunk': 215, 'db_id': ObjectId('602b83681b294345cf750705')}
- Key: '1613464423125' (Type: str) same as in symbol file expect string, to prevent "int object not iterable" error.
- Value: (Type: dict)
-- 'current_chunk': 215 - Type: str / int - Key value pair specifying current chunk like in symbol file example.
-- 'db_id': ObjectId('602b83681b294345cf750705') - Type: str / bson.Objectid.ObjectId
   db_id is created when description is sent to database when dump upload is started.
   db_id is the document ID in MongoDB table for the dump and it is saved because the ID is appended to the dump file name.
   Later on when reading the ID in filename, analysis machines can find the right document in MongoDB. 
'''
uploading = dict()

# Used to identify next analysis container which is contacted
container_number = 1

# Lock
lock = threading.Lock()

# Flask APP
api = Flask(__name__)
CORS(api)

# Logging file
logging.basicConfig(format='%(asctime)s - %(levelname)s - %(message)s', datefmt="%Y-%m-%d %H:%M:%S")
api.logger.setLevel(logging.INFO)

# Appends client sent chunk to file on disk or creates new file
def write_dump_chunk(filename, system, chunk, current_chunk, last_chunk, db_id):
    filename = system + "." + str(db_id) + "." + filename
    try: 
        with open(os.getenv("DUMPS_DIRECTORY") + "/" + filename, 'ab+') as f:
            f.write(chunk.stream.read())
    except Exception as e:
        api.logger.error("anomaly when writing chunk to dump file %s due to: %s", filename, e)
        return create_response("Fail", filename, current_chunk)
    
    # When last chunk of the file is received, signal is sent to one of autovola_analyse containers and client receives "Done"
    if (current_chunk == last_chunk):
        api.logger.info("dump %s downloaded", filename)
        
        try: # Send upload finish time to Mongo DB and save DB ID created by Mongo into variable
            api.logger.info("INFO - calculating dump %s analysis finishing time and sending it to DB", filename)
            db_id = mongoconn.upload_data("autovola", system + "_pluginresults", {"currenttime": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}, db_id)
            if db_id in ["timeout","error"]:
                api.logger.error("%s - %s happened while updating DB with upload finish time", request.remote_addr, str(db_id))
        except Exception as e:
            api.logger.error("%s - anomaly: %s", request.remote_addr, e)
        threading.Thread(target=send_plugin_run_request, args=(filename, "basicdetails")).start() # Send file to analyze
        return create_response("Done", filename, current_chunk)
    else: # Continue downloading by sending client "OK" message
        return create_response("OK", filename, current_chunk)

# Writes symbol file chunk to file
def write_symbol_chunk(filename, system, chunk, current_chunk, last_chunk, file_id, windir = ""):
    filename = system + "." + str(file_id) + "." + filename
    try:
        if system == "linux":
            with open(os.getenv("SYMBOLS_DIRECTORY") + "/" + system + "/" + filename, 'ab+') as f:
                f.write(chunk.stream.read())
        elif system == "windows": # Write Windows symbol file into user selected directory
            if windir not in ["ntkrnlmp.pdb","ntkrnlpa.pdb","ntkrpamp.pdb","ntoskrnl.pdb"]:
                return create_response("Fail", filename, current_chunk)
            else:
                with open(os.getenv("SYMBOLS_DIRECTORY") + "/" + system + "/" + windir + "/" + filename, 'ab+') as f:
                    f.write(chunk.stream.read())
    except Exception as e:
        api.logger.error("anomaly when writing chunk to symbol file %s due to: %s", filename, e)
        return create_response("Fail", filename, current_chunk)
    
    # When last chunk of the ISF is received, signal is sent to all autovola_analyse containers and client receives "Done"
    if (current_chunk == last_chunk):
        api.logger.info("symbol file %s downloaded", filename)
        if system == "linux":
            threading.Thread(target=add_symbol_file, args=(os.getenv("SYMBOLS_DIRECTORY") + "/" + system + "/" + filename,)).start()
        elif system == "windows":
            filepath = os.getenv("SYMBOLS_DIRECTORY") + "/" + system + "/" + windir + "/"
            new_filename = filename.split(".", 2)[2] # Remove OS and DB ID from filename
            os.rename(filepath + filename, filepath + new_filename) # Rename file with new name
            threading.Thread(target=add_symbol_file, args=(filepath + new_filename,)).start()
        return create_response("Done", filename, current_chunk)
    else: # Continue downloading by sending client "OK" message
        return create_response("OK", filename, current_chunk)

# Send all autovola_analysis containers request to add downloaded symbol file into their symbol file collection
def add_symbol_file(filepath):

    # Contains symbol file path and its OS
    data = { "filepath": filepath}
    response = ""
    analyse_machines_amount = int(os.getenv("ANALYSE_MACHINE_AMOUNT")) # Determines how many analysis containers there are
    
    # Send symbol file addition request to all analysis machines
    for x in range (1, analyse_machines_amount + 1):
        url = "http://autovola_analyse_" + str(x) + ":80/api/v1/add/symbols/"
        try:
            requests.post(url, data=data)
        except Exception as e:
            api.logger.error("Sending symbol file %s addition request to autovola_analyse_%s due to: %s", filepath, analyse_machines_amount, e)
            continue

# Send dump file to be analysed by one of the analysis containers
def send_plugin_run_request(filename, plugins):
    global container_number
    response = ""
    # Go through all analysis_machines continuously till OK is received as response from one of them
    plugins = plugins.split(",")
    for plugin in plugins:
        data = {"plugin": plugin, "filename": filename}
        while True:
            lock.acquire()
            if (container_number > int(os.getenv("ANALYSE_MACHINE_AMOUNT"))): # Start back from 1st analysis container when all the containers have been gone through 
                container_number = 1
            url = "http://autovola_analyse_" + str(container_number) + ":80/api/v1/run/plugin/"
            #url = "http://autovola_analyse_1:80/api/v1/analyse/dump/"
            try:
                response = requests.post(url, data=data)
            except Exception as e:
                api.logger.error("Sending dump file %s plugin %s analyse request to autovola_analyse_%s due to: %s", filename, plugin, container_number, e)
                pass
            container_number += 1
            try: # If OK is received, analysis machine has started to analyse the dump
                if response.content.decode() == "OK":
                    del response
                    del data
                    lock.release()
                    break
                else: # Else requested analysis machine is busy or unable to function
                    pass
            except Exception as e:
                api.logger.error("decoding file %s plugin %s analyse request to autovola_analyse_%s due to: %s", filename, plugin, container_number, e)
                pass
            lock.release() # Release lock, wait 4 seconds and try again with next analysis machine
            time.sleep(3)

# API for running plugins to dump
@api.route("/api/v1/run/plugins/", methods = ["POST"])
def run_plugins():
    global uploading # contains all the upload connections
    try:
        db_id = request.form["db_id"] # Uploaded dump name
        os_name = str(request.form["os"]) # Current chunk number being uploaded
        plugins = request.form["plugins"]
    except Exception as e:
        api.logger.error("%s - plugin run POST request parameters: %s", request.remote_addr, e)
        create_response("Fail")

    files = os.listdir(str(os.getenv("DUMPS_DIRECTORY")) + "/") # Files in dump directory are saved into variable
    for filename in files: # Go through all files in directory
        if filename.startswith(os_name + "." + db_id): # Correct file is found
            threading.Thread(target=send_plugin_run_request, args=(filename,plugins)).start() # Send file to analyze
            api.logger.info("%s - Plugin(s) %s are run on file %s", request.remote_addr, plugins, filename)
            return jsonify("Done"), 200

# Creates response which is sent back to client
def create_response(response, filename = "Unknown", current_chunk = "Unknown"):
    return jsonify({"name": filename,
            "chunk": current_chunk,
            "response": response,})

# Remove designated file
# TO DO: could add functionality to also delete symbol files
def remove_file(target, os_name, db_id):
    directory = ""
    if target == "dump":
        directory = str(os.getenv("DUMPS_DIRECTORY")) + "/" # Dump directory
    else:
        return "error"

    files = os.listdir(directory)
    for filename in files: # Go through all files in directory
        if filename.startswith(os_name + "." + db_id):
            os.remove(os.path.join(directory, filename))
            api.logger.info("Removed file: %s", filename)
            return "ok"
    return "error"

# Route for dump upload
@api.route("/api/v1/upload/dump/", methods = ["POST"])
def upload_dump():
    global uploading # contains all the upload connections
    try:
        filename = request.form["filename"] # Uploaded dump name
        current_chunk = int(request.form["current_chunk"]) # Current chunk number being uploaded
        last_chunk = int(request.form["last_chunk"]) # Last chunk number uploaded
        file_id = str(request.form["file_id"]) # file_id created by client JS
        chunk = request.files["chunk"] # Chunk data
    except Exception as e:
        api.logger.error("%s - dump file POST request parameters: %s", request.remote_addr, e)
        create_response("Fail")
    
    try: # Check that the system parameter contains linux or windows
        system = request.form["system"]
        if system not in ["windows","linux"]:
            api.logger.error("%s - dump file %s OS not Windows or Linux", request.remote_addr, filename)
            return create_response("Fail", filename, current_chunk)
    except Exception as e:
        api.logger.error("%s - anomaly with system parameter: %s", request.remote_addr, e)
        return create_response("Fail", filename, current_chunk)

    if file_id in uploading and uploading.get(file_id)["current_chunk"] == current_chunk and current_chunk == last_chunk: # Last chunk of the dump file is received
        result = write_dump_chunk(filename, system, chunk, current_chunk, last_chunk, uploading.get(file_id)["db_id"])
        if result == "Done":
            uploading.pop(file_id, None) # Remove node from uploading dict since file is now downloaded completely
        return result
    elif file_id in uploading and uploading.get(file_id)["current_chunk"] == current_chunk: # Chunk number matches to the one in uploading dict, but is not the last chunk
        result = write_dump_chunk(filename, system, chunk, current_chunk, last_chunk, uploading.get(file_id)["db_id"])
        uploading.update({file_id: {"current_chunk": current_chunk+1, "db_id": uploading[file_id]["db_id"]}})
        return result
    elif file_id in uploading and uploading.get(file_id)["current_chunk"] != current_chunk: # Chunk number does not match to the corresponding one in the uploading dict
        api.logger.error("%s - dump file %s chunk numbers do not match", request.remote_addr, filename)
        return create_response("Fail", filename, current_chunk) # Send Fail response to client
    elif file_id not in uploading and current_chunk == 1: # First chunk of dump file is received
        api.logger.info("%s - started to upload dump file: %s", request.remote_addr, filename)
        description = str(request.form["description"]) # Saving description from POST data
        
        if system == "linux": # Determine Mongo DB table by dump OS
            table = "linux_pluginresults"
        elif system == "windows":
            table = "windows_pluginresults"
        
        try: # Send description to Mongo DB and save DB ID created by Mongo into variable
            db_id = mongoconn.upload_data("autovola", table, {"description": description})
            if db_id in ["timeout","error"]:
                api.logger.error("%s - %s happened while uploading description to database", request.remote_addr, str(db_id))
                return create_response("Fail", filename, current_chunk)
        except Exception as e:
            api.logger.error("%s - anomaly: %s", request.remote_addr, e)
            return create_response("Fail", filename, current_chunk)
        uploading.update({file_id: {"current_chunk": current_chunk, "db_id": db_id}}) # Create new node in uploading dict for the dump information
        result = write_dump_chunk(filename, system, chunk, current_chunk, last_chunk, db_id) # Write first dump chunk into file
        uploading.update({file_id: {"current_chunk": current_chunk+1, "db_id": uploading[file_id]["db_id"]}}) # Increment current_chunk by 1 since the next expected chunk number should be 2 (Current chunk_number is 1)
        return result
    else: # Request is abnormal so client is responded with fail message
        api.logger.error("%s - unable to download dump file %s", request.remote_addr, filename)
        return create_response("Fail", filename, current_chunk)

@api.route("/api/v1/upload/symbols/", methods = ["POST"])
def upload_symbol_table():
    try:
        filename = request.form["filename"] # Uploaded symbol file name
        current_chunk = int(request.form["current_chunk"]) # Current chunk number of the file being uploaded
        last_chunk = int(request.form["last_chunk"]) # Last chunk number uploaded
        file_id = int(request.form["file_id"]) #file_id created by client JS
        chunk = request.files["chunk"] # Chunk data
        windir = ""
    except Exception as e:
        api.logger.error("%s - symbol file POST request parameters: %s", request.remote_addr, e)
        create_response("Fail")
    
    try: # check that the system parameter contains linux or windows
        system = request.form["system"]
        if system not in ["windows","linux"]:
            api.logger.error("%s - symbol file %s OS not Windows or Linux", request.remote_addr, filename)
            return create_response("Fail", filename, current_chunk)
        if system == "windows":
            windir = request.form["windir"]
    except Exception as e:
        api.logger.error("%s - anomaly with system parameter: %s", request.remote_addr, e)
        return create_response("Fail", filename, current_chunk)

    if file_id in uploading and uploading.get(file_id) == current_chunk and current_chunk == last_chunk: # Last chunk of the symbol file is received
        result = write_symbol_chunk(filename, system, chunk, current_chunk, last_chunk, file_id, windir)
        if result == "Done":
            uploading.pop(file_id, None) # Remove node from uploading dict since file is now downloaded completely
        return result
    elif file_id in uploading and uploading.get(file_id) == current_chunk: # Chunk number matches to the one in uploading dict, but is not the last chunk
        result = write_symbol_chunk(filename, system, chunk, current_chunk, last_chunk, file_id, windir)
        uploading.update({file_id: current_chunk+1})
        return result
    elif file_id in uploading and uploading.get(file_id) != current_chunk: # Chunk number does not match to the corresponding one in the uploading dict
        api.logger.error("%s - symbol file %s chunk numbers do not match", request.remote_addr, filename)
        return create_response("Fail", filename, current_chunk) # Send Fail response to client
    elif file_id not in uploading and current_chunk == 1: # First chunk of symbol file is received
        api.logger.info("%s - started to upload symbol file: %s", request.remote_addr, filename)
        uploading.update({file_id: current_chunk}) # Create new node in uploading dict for the symbol file information
        result = write_symbol_chunk(filename, system, chunk, current_chunk, last_chunk, file_id, windir) # Write first symbol file chunk into file
        uploading.update({file_id: current_chunk+1}) # Increment current_chunk by 1 since the next expected chunk number should be 2 (Current chunk_number is 1)
        return result
    else: # Request is abnormal so client is responded with fail message
        api.logger.error("%s - unable to download symbol file %s", request.remote_addr, filename)
        return create_response("Fail", filename, current_chunk)

# API to get basic data from all linux dumps or all data from a single dump if ID is given
@api.route("/api/v1/results/<os_name>/", methods = ["GET"])
def get_linux_results(os_name):
    # Check if ID is present
    try:
        db_id = request.args.get('id')
    except:
        db_id = ""

    if os_name not in ["windows", "linux"]: # Check that OS is in windows or linux
        return jsonify("Fail"), 400

    try: # Try to establish connection to database table
        result = list()
        client = mongoconn.connect("autovola")
        db = client["autovola"]
        db_table = db[os_name + "_pluginresults"]
    except Exception as e:
        api.logger.error("connecting MongoDB: %s", e)
        return "ERROR"

    patterns = '^[a-z0-9]*$'
    if db_id == "":
        # Get defined columns from each linux-dump document
        for x in db_table.find({},{ "_id": "$_id", "description": "$description", "os_info": "$os_info", "name": "$name", "currenttime": "$currenttime", "tags": "$tags"}):
            object_id = x.get("_id") # Turn document ID into string
            x["_id"] = str(object_id)
            result.append(x)
        result = tuple(result) # Turn result into tuple from list
    elif len(db_id) == 24 and re.search(patterns, db_id): # Check that the given ID is correct
        result = db_table.find_one({ "_id": ObjectId(db_id)}) # All document data is saved
        object_id = result.get("_id") # Turn document ID to string
        result["_id"] = str(object_id)
        result = dict(result)  # Turn result to dict from list
    return jsonify(result), 201 # Return single dump data or basic reports from all Linux dumps

# API for updating dump document in MongoDB
@api.route("/api/v1/update/<name>/", methods = ["POST"])
def update_dump_data(name):
    try:
        data = str(request.form["data"])
        db_id = str(request.form["db_id"])
        os_name = str(request.form["os"])
    except Exception as e:
        api.logger.error("%s - anomaly with POST parameters: %s", request.remote_addr, e)
        return jsonify("Fail"), 400

    # Check that the document ID length is 24 and contains only small letters and numbers + OS is windows or linux
    patterns = '^[a-z0-9]*$'
    if (len(db_id) == 24 and re.search(patterns, db_id)) and (os_name in ["windows", "linux"]):
        data = {name: data}
        result = mongoconn.upload_data("autovola", os_name + "_pluginresults", data, db_id)
        if result == "error":
            return jsonify("Fail"), 400
        if result == "ok":
            return jsonify("Done"), 200
    else:
        return jsonify("Fail"), 400

# API for deleting dump and all data from DB related to it
@api.route("/api/v1/delete/<target>/", methods = ["POST"])
def delete_dump_data(target):
    try:
        db_id = str(request.form["db_id"])
        os_name = str(request.form["os"])
    except Exception as e:
        api.logger.error("%s - anomaly with POST parameters: %s", request.remote_addr, e)
        return jsonify("Fail"), 400

    try: # Remove document in table specified by DB ID
        if target == "dump":
            client = mongoconn.connect("autovola")
            response = mongoconn.db_delete(client, "autovola", os_name + "_pluginresults", {"_id": ObjectId(db_id)})
            if response == "ok":
                api.logger.info("deleted document with ID %s from table %s", db_id, os_name + "_pluginresults")
            else: # If document removing fails, response with error
                return jsonify("Fail"), 400
    except Exception as e:
        api.logger.error("error when connecting MongoDB: %s", e)
        return jsonify("Fail"), 400

    try: # Remove dump file
        if target == "dump":
            result = remove_file(target, os_name, db_id)
            if result == "error":
                api.logger.error("Could not delete file with DB ID: %s", db_id)
    except Exception as e: # Response with error if the action fails
        api.logger.error("error deleting file: %s", e)
        result = "error"

    if result == "ok":
        return jsonify("Done"), 200 
    else:
        return jsonify("Fail"), 400

if __name__ == "__main__":
   api.run(port=8080, host="0.0.0.0")

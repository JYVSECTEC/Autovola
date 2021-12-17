import os
import gc
import sys
import ntpath
import autovola
import logging
import threading
import shutil
import configparser

from bson import ObjectId
from flask import Flask, request
from waitress import serve

# Flask API
api = Flask(__name__)

# Specifies if container is currently analysing another dump
reserved = False

# Lock for threads
lock = threading.Lock()

# Configparser configs
plugins_config = configparser.ConfigParser()
plugins_config.read("plugins.cfg")

# Logging
logging.basicConfig(stream=sys.stdout, filename='/var/log/autovola.log', filemode='a+', format='%(asctime)s - %(message)s', datefmt="%Y-%m-%d %H:%M:%S")
api.logger.addHandler(logging.StreamHandler(sys.stdout))
api.logger.setLevel(logging.INFO)

# Garbage collection
gc.enable()

# Removes volatility3 cache files
def delete_volatility_cache():
    folder = "/root/.cache/volatility3/"
    for filename in os.listdir(folder):
        file_path = os.path.join(folder, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            api.logger.error("ERROR - Failed to delete file %s because %s", filepath, e)

# Route for clearing Volatility3 symbol cache
@api.route("/api/v1/add/symbols/", methods = ["POST"])
def add_symbol_file():
    try:
        filepath = request.form["filepath"]
        filename = os.path.basename(filepath)
    except Exception as e:
        api.logger.error("ERROR - unable to clear cache because POST request parameters: %s", e)
        return "Fail"
    
    delete_volatility_cache() # Volatility3 cache is emptied so the new symbol file won't be ignored by Volatility
    api.logger.info("INFO - removed cache because ISF %s was added", filename)
    return "OK"

# API for running plugin on dump
@api.route("/api/v1/run/plugin/", methods = ["POST"])
def run_selected_plugin():
    global reserved
    if reserved == True: # Check if still analysing another dump
        return "RESERVED"
    else: # If container is not running any plugin
        try:
            lock.acquire()
            reserved = True
            filename = request.form["filename"]
            plugin = request.form["plugin"]
            api.logger.info("INFO - received request to run plugin %s on file %s", plugin, filename)
            gc.collect()
            thread = threading.Thread(target=analyse_file, args=(filename,plugin,)) # Create and start thread for running plugin
            thread.start()
            return "OK" # 
        except Exception as e:
            api.logger.error("ERROR - analysis of file %s caused: %s", filename, e)

def analyse_file(filename, plugin):
    global reserved
    try:
        os_name = filename.split(".")[0] # Get OS from name
        db_id = filename.split(".")[1] # Get DB ID from name
    except Exception as e:
        api.logger.error("ERROR - abnormal filename %s causing: %s", filename, e)
        reserved = False
        lock.release()
        return

    filepath = os.getenv("DUMPS_DIRECTORY") # Dump files location
    
    try:
        if os_name == "linux":
            dump = autovola.Linux(filepath + "/" + filename)
        elif os_name == "windows":
            dump = autovola.Windows(filepath + "/" + filename)
        dump.db_id = ObjectId(db_id) # Assign DB ID
        plugin_found = dump.run_plugin_from_str(plugin) # Run plugin
        del dump
        gc.collect()
    except Exception as e:
        api.logger.error("ERROR - while analysing file %s error occurred: %s", filename, e)
        plugin_found = True
    finally:
        if plugin_found == True:
            api.logger.info("INFO - finished running plugin %s on file %s", plugin, filename)
        elif plugin_found == False:
            api.logger.error("ERROR - plugin %s was not found", plugin)
        else:
            api.logger.error("ERROR - plugin %s could not be successfully run on file %s", plugin, filename)
        reserved = False
        del plugin_found
        del os_name
        del db_id
        del filepath
        del filename
        del plugin
        gc.collect()
        lock.release()
        return

if __name__ == "__main__":
    delete_volatility_cache() # Clear Volatility3 cache 
    #api.run(debug=False, port=80, host="0.0.0.0")
    serve(api, host="0.0.0.0", port=80)

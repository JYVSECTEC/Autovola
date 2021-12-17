import os
import gc
import sys
import pymongo
import logging
import mongoconn
import configparser
from urllib import request

import volatility3
from volatility3 import framework
from volatility3.framework.automagic import stacker
from volatility3.framework import contexts, interfaces, constants, automagic, plugins, exceptions

# Code overwriting volatility 
import gridtojson

# Volatility configs
base_config_path = "plugins"
interfaces.plugins.__path__ = constants.PLUGINS_PATH
failures = framework.import_files(interfaces.plugins, True)
constants.PARALLELISM = constants.Parallelism.Off
constants.SYMBOL_BASEPATHS.append(os.getenv("AUTOVOLA_DIRECTORY") + "/volatility3/volatility3/framework/symbols")
constants.SYMBOL_BASEPATHS.append(os.getenv("SYMBOLS_DIRECTORY"))
framework.require_interface_version(1, 0, 0)

# Configparser configs
plugins_config = configparser.ConfigParser()
plugins_config.read("plugins.cfg")

# logging
logging.basicConfig(filename='/var/log/api.log', filemode='a+', format='%(asctime)s - %(message)s', datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger('analysis')
logger.addHandler(logging.StreamHandler(sys.stdout))
logger.setLevel(logging.INFO)

# Dict containing different Windows versions
win_versions = {
            "10": # Windows 10 / Windows Server 2016 and 2019
                {"WinNT":"Windows 10",
                "ServerNT":
                    {"14393":"Windows Server 2016",
                    "17763":"Windows Server 2019"},
                "LanmanNT":
                    {"14393":"Windows Server 2016 DC",
                    "17763":"Windows Server 2019 DC"}
                },
            "6": # Windows Vista - 8.1 / Windows Server 2008 - 2012 R2
                {"WinNT":
                    {"6000":"Windows Vista",
                     "6001":"Windows Vista",
                     "6002":"Windows Vista",
                     "6003":"Windows Vista",
                     "7600":"Windows 7",
                     "7601":"Windows 7",
                     "9200":"Windows 8",
                     "9600":"Windows 8.1"},
                "ServerNT":
                    {"6001":"Windows Server 2008",
                    "6002":"Windows Server 2008",
                    "6003":"Windows Server 2008",
                    "7600":"Windows Server 2008 R2",
                    "7601":"Windows Server 2008 R2",
                    "9200":"Windows Server 2012",
                    "9600":"Windows Server 2012 R2"},
                "LanmanNT":
                    {"6001":"Windows Server 2008 DC",
                    "6002":"Windows Server 2008 DC",
                    "6003":"Windows Server 2008 DC",
                    "7600":"Windows Server 2008 R2 DC",
                    "7601":"Windows Server 2008 R2 DC",
                    "9200":"Windows Server 2012 DC",
                    "9600":"Windows Server 2012 R2 DC"}
                },
            "5": # Windows 2000 - XP 64-bit
                {"WinNT":
                    {"2195":"Windows 2000",
                    "2600":"Windows XP 32-bit",
                    "3790":"Windows XP 64-bit"}
                }
            }


# Main class for automatizing memory dump analysis using volatility3 package
class Autovola:
    def __init__(self, image):
        self.image = image # Type: str - file path
        self.context = contexts.Context() # Type: volatility3.framework.contexts.Context
        self.db_id = None # Type: bson.objectid.ObjectId
        self.os = None # Type: str

    def __del__(self):
        gc.collect()

    # Defines OS, runs through all its plugins and sends plugin output data to DB
    def automate(self):
        self.os = self.get_os()
        if isinstance(self.os, tuple):
            if "linux".lower() in self.os:
                self.analyze_linux()
        elif isinstance(self.os, str):
            if self.os == "windows":
                self.analyze_windows()
            elif self.os == "unknown":
                logger.error("ERROR - Unable to identify dump %s OS. Dump may have been taken from macOS", self.image)
                print("possibly Mac image (logged)")
            elif self.os == "anomylous":
                logger.error("ERROR - Error happened during identification of %s OS", self.image)

    # Defines dump OS
    def get_os(self):
        # First check if any Linux banners are found from dump
        plugin = interfaces.plugins.banners.Banners
        automagics = self.get_automagic(plugin)
        banners, error = self.run_plugin(plugin, automagics)

        try:
            for banner in banners:
                if "linux" in banner["Banner"].lower():
                    return banner["Banner"]
        except IndexError:
            pass
        
        # Next check if windows info-plugin can be run without problems
        plugin = interfaces.plugins.windows.info.Info
        automagics = self.get_automagic(plugin)
        try:
            json_data, error = self.run_plugin(plugin, automagics)
        except exceptions.UnsatisfiedException: # Plugin requirements are unsatisfied
            return "unknown"
        except:
            return "anomylous"
        return "windows"

    # Method uses automagic to populate context configuration with data not provided yet
    def get_automagic(self, plugin):
        file_name = os.path.abspath(self.image)
        single_location = "file:" + request.pathname2url(file_name)
        self.context.config['automagic.LayerStacker.single_location'] = single_location # dump file location added to context
        available_automagics = automagic.available(self.context) # Returns available automagics
        automagics = automagic.choose_automagic(available_automagics, plugin) # Chooses right automagics for the plugin
        if self.context.config.get('automagic.LayerStacker.stackers', None) is None: # Populate context with right layerstacker
            self.context.config['automagic.LayerStacker.stackers'] = stacker.choose_os_stackers(plugin)
        automagic.run(automagics, self.context, plugin, base_config_path) # Populates the context config
        return automagics

    # Run plugin using automagics and return plugin data
    def run_plugin(self, plugin, automagics):
        #plugin_config_path = interfaces.configuration.path_join(base_config_path, plugin.__name__) # Joins configuration paths together
        try: # Run plugin
            constructed = plugins.construct_plugin(self.context, automagics, plugin, base_config_path, gridtojson.MuteProgress(), None)
            grid = constructed.run()
            plugin_data, error = gridtojson.ReturnJsonRenderer().render(grid)
            if error is not None: # Check If error occurred
                logger.error("ERROR - Volatility gave this error when running %s: %s", str(plugin), error)
                if isinstance(plugin_data, list):
                    if len(plugin_data) > 0: # If plugin_data is not empty, the error has not affected the plugin entirely, so the collected results can be returned to user
                        logger.info("INFO - Some or all plugin data could be collected despite the error")
                        pass
                    else:
                        plugin_data = "ERROR"
                else:
                    plugin_data = "ERROR"
        except exceptions.UnsatisfiedException: # Unsatisfied requirements
            plugin_data = "UNSATISFIED" # Insert this to DB, so front knows that requirements are unsatisfied 
            error = ""
            logger.error("ERROR - plugin %s requirements for dump %s are unsatisfied", str(plugin), self.image)
        except Exception as e:
            plugin_data = "ERROR" # Insert this to DB, so front knows that error happened
            error = ""
            logger.error("ERROR - running plugin %s on target dump %s causing: %s", str(plugin), self.image, e)
        finally:
            return plugin_data, error

    # Run plugin or method in plugins.cfg
    def run_plugin_from_str(self, plugin):
        plugin_found = False
        for key in plugins_config["independently_run_" + self.os + "_plugins_as_methods"]: # Check if plugin name matches any of the methods
            if plugin == key:
                try:
                    plugin_method = getattr(self, plugins_config["independently_run_" + self.os + "_plugins_as_methods"][key]) # Turn str into Autovola method
                    plugin_method()
                except Exception as e:
                    logger.error("ERROR - running plugin %s on dump %s caused: %s", str(plugin), self.image, e)
                finally:
                    plugin_found = True
                    break
        if plugin_found == False:
            for key in plugins_config["automaticly_run_" + self.os + "_plugins"]: # If match, plugin is run directly
                if plugin == key:
                    try:
                        plugin = eval(plugins_config["automaticly_run_" + self.os + "_plugins"][key]) # Turn string into Volatility plugin class
                        self.context = contexts.Context() # Type: volatility3.framework.contexts.Context
                        automagic = self.get_automagic(plugin)
                    except Exception as e:
                        logger.error("ERROR - Error when getting plugin from plugins.cfg and running automagic: %s", e)
                        return
                    try:
                        plugin_found = True
                        logger.info("INFO - running plugin %s on dump %s", str(plugin), self.image)
                        plugin_data, error = self.run_plugin(plugin, automagic)
                    except Exception as e:
                        logger.error("ERROR - running plugin %s on dump %s caused: %s", str(plugin), self.image, e)
                        plugin_data = None
                        error = None
                    finally:
                        self.send_to_mongo({key: plugin_data}, self.os + "_pluginresults") # Send results to DB
                        break
        return plugin_found
    
    # Run through Linux plugins
    def analyze_linux(self):
        linux_obj = Linux(self.image) # Create new object Autovola.Linux
        linux_obj.db_id = self.db_id # Populate db_id attribute with self.db_id
        linux_obj.run_linux_plugins() # Run plugins
        del linux_obj # Remove object

    # Run through Windows plugins
    def analyze_windows(self):
        windows_obj = Windows(self.image) # Create new object Autovola.Windows
        windows_obj.db_id = self.db_id # populate db_id attribute with self.db_id
        windows_obj.get_basic_details() # Gathers basic data from dump
        windows_obj.run_windows_plugins() # Run majority of the plugins not in get_basic_details
        del windows_obj # Remove object
    
    # Returns dump size if it can be calculated
    def get_dump_size(self):
        try:
            logger.info("INFO - calculating dump %s size", self.image)
            size = os.stat(self.image).st_size
        except Exception as e:
            logger.error("ERROR - calculating dump size from file %s caused: %s", self.image, e)
            size = ""
        return size

    # Send data to autovola DB
    def send_to_mongo(self, data, table):
        database = "autovola"
        for x in range(1, 5): # Try 5 times in case of DB errors
            result = mongoconn.upload_data(database, table, data, self.db_id)
            if result == ("error" or "timeout"):
                continue
            elif result == "ok":
                break
            else: # Populate db_id if new document was created to table
                self.db_id = result

# Subclass for Windows OS analysing functionality
class Windows(Autovola):
    def __init__(self, image):
        super().__init__(image)
        self.context = contexts.Context() # Type: volatility3.framework.contexts.Context
        self.hive_list = None # Type: list
        self.system_name = None # Type: str
        self.os = "windows"
        self.os_info = dict() # Type: dict

    def __del__(self):
        gc.collect()

    # Fetches general details from windows dump
    def get_basic_details(self):
        self.get_system_version()
        self.get_system_name()
        self.send_to_mongo({"dumpsize": self.get_dump_size()}, "windows_pluginresults")
         
    # Main method for running windows plugins
    def run_windows_plugins(self):
        # Some plugins need to be run individually because their output has to be modified
        self.run_big_pools()
        self.run_print_key()
        self.run_svc_scan()
        self.run_hive_scan()
        self.run_vad_info()
        windows_plugins = plugins_config.items("automaticly_run_windows_plugins") # Fetch plugins to be run
        for plugin_name, plugin in windows_plugins: # Run plugins
            plugin = eval(plugin) # Plugin name from string into object
            self.context = contexts.Context()
            automagic = self.get_automagic(plugin)
            try:
                logger.info("INFO - running plugin %s on dump %s", str(plugin), self.image)
                plugin_data, error = self.run_plugin(plugin, automagic)
            except Exception as e:
                logger.error("ERROR - running plugin %s on dump %s caused: %s", str(plugin), self.image, e)
                plugin_data = None
                continue
            self.send_to_mongo({plugin_name: plugin_data}, "windows_pluginresults")
            del plugin_data

    def run_hive_scan(self):
        plugin = interfaces.plugins.windows.registry.hivescan.HiveScan
        self.context = contexts.Context()
        automagic = self.get_automagic(plugin)
        try:
            logger.info("INFO - running plugin %s on dump %s", str(plugin), self.image)
            hive_scan_data, error = self.run_plugin(plugin, automagic)
        except Exception as e: 
            logger.error("ERROR - running plugin %s on dump %s caused: %s", str(plugin), self.image, e)
            hive_scan_data = None
        # MongoDB can only handle 8 byte integers so all Offset data has to be typecasted to string since those values are too large to fit into 8 bytes
        finally:
            for data in hive_scan_data:
                try:
                    data["Offset"] = str(data["Offset"])
                except:
                    data["Offset"] = None
        self.send_to_mongo({"hivescan": hive_scan_data}, "windows_pluginresults")
    
    # separate method for VadInfo plugin
    def run_vad_info(self):
        plugin = interfaces.plugins.windows.vadinfo.VadInfo
        self.context = contexts.Context()
        automagic = self.get_automagic(plugin)
        try:
            logger.info("INFO - running plugin %s on dump %s", str(plugin), self.image)
            vad_info_data, error = self.run_plugin(plugin, automagic)
        except Exception as e: 
            logger.error("ERROR - running plugin %s on dump %s caused: %s", str(plugin), self.image, e)
            vad_info_data = None
        finally:
            # MongoDB can only handle 8 byte integers so lot of data has to be typecasted to string since those values are too large to fit into 8 bytes
            for data in vad_info_data:
                try:
                    data["Parent"] = str(data["Parent"])
                except:
                    data["Parent"] = None
                try:
                    data["CommitCharge"] = str(data["CommitCharge"])
                except:
                    data["CommitCharge"] = None
                try:
                    data["Offset"] = str(data["Offset"])
                except:
                    data["Offset"] = None
                try:
                    data["Start VPN"] = str(data["Start VPN"])
                except:
                    data["Start VPN"] = None
                try:
                    data["End VPN"] = str(data["End VPN"])
                except:
                    data["End VPN"] = None
        self.send_to_mongo({"vadinfo": vad_info_data}, "windows_pluginresults")
        del vad_info_data

    # separate method for BigPools plugin
    def run_big_pools(self):
        plugin = interfaces.plugins.windows.bigpools.BigPools
        self.context = contexts.Context()
        automagic = self.get_automagic(plugin)
        try:
            logger.info("INFO - running plugin %s on dump %s", str(plugin), self.image)
            big_pools_data, error = self.run_plugin(plugin, automagic)
        except Exception as e: 
            logger.error("ERROR - running plugin %s on dump %s caused: %s", str(plugin), self.image, e)
            big_pools_data = None
        finally:
            # MongoDB can only handle 8 byte integers in JSON so all allocation data has to be typecasted to string since those values are too large to fit into 8 bytes
            for data in big_pools_data:
                try:
                    data["Allocation"] = str(data["Allocation"])
                except:
                    data["Allocation"] = None
        self.send_to_mongo({"bigpools": big_pools_data}, "windows_pluginresults")
    
    # Separate methods for SvcScan plugin
    def run_svc_scan(self):
        plugin = interfaces.plugins.windows.svcscan.SvcScan
        self.context = contexts.Context()
        automagic = self.get_automagic(plugin)
        try:
            logger.info("INFO - running plugin %s on dump %s", str(plugin), self.image)
            svcscan_data, error = self.run_plugin(plugin, automagic)
        except Exception as e: 
            logger.error("ERROR - running plugin %s on dump %s caused: %s", str(plugin), self.image, e)
            svcscan_data = None
        finally:
            # Dict "Pid" key is changed into "PID" which is the same way all the other plugins have
            for data in svcscan_data:
                try:
                    data["PID"] = data["Pid"]
                    del data["Pid"]
                except:
                    pass
        self.send_to_mongo({"svcscan": svcscan_data}, "windows_pluginresults")

    # Method to get system name from registry
    def get_system_name(self):
        logger.info("INFO - fetching Windows system name from dump %s", self.image)
        system_name = self.get_registry_key("\\REGISTRY\\MACHINE\\SYSTEM","ControlSet001\Control\ComputerName\ComputerName", "ComputerName")
        try:
            self.system_name = system_name["Data"].decode().replace("\"", "")
        except AttributeError:
            self.system_name = system_name["Data"].replace("\"", "")
        except Exception as e:
            logger.error("ERROR - sanitizing dump %s system name caused: %s", self.image, e)
        self.send_to_mongo({"name": self.system_name}, "windows_pluginresults")

    def get_system_version(self):
        #https://www.itprotoday.com/windows-78/how-can-i-check-what-type-windows-nt-installation-i-have
        logger.info("INFO - fetching OS details from dump %s and determining OS version", self.image)
        try:
            data = self.get_registry_key("\\REGISTRY\\MACHINE\\SYSTEM", "ControlSet001\\Control\\ProductOptions", "ProductType")
            product_type = data["Data"].decode().replace("\"","").replace("\x00", "")
        except (UnicodeDecodeError, AttributeError):
            product_type = data["Data"].replace("\"","").replace("\x00", "")
        except Exception as e:
            logger.error("ERROR - sanitizing dump %s registry key ProductOptions entry ProductType value caused: %s", self.image, e)
            product_type = None
        self.os_info["ProductType"] = product_type

        # Run info plugin and send data returned by it to database
        plugin = interfaces.plugins.windows.info.Info
        self.context = contexts.Context()
        automagic = self.get_automagic(plugin)
        try:
            logger.info("INFO - running plugin %s on dump %s", str(plugin), self.image)
            info_data, error = self.run_plugin(plugin, automagic)
        except Exception as e:
            logger.error("ERROR - running plugin %s on dump %s caused: %s", str(plugin), self.image, e)
        self.send_to_mongo({"info": info_data}, "windows_pluginresults")

        try: # Populating self.os_info with OS related information returned by info plugin
            for data in info_data:
                if data["Variable"] == "NtMajorVersion":
                    self.os_info["NtMajorVersion"] = data["Value"]
                elif data["Variable"] == "NtMinorVersion":
                    self.os_info["NtMinorVersion"] = data["Value"]
                elif data["Variable"] == "Major/Minor":
                    self.os_info["Major/Minor"] = data["Value"]
        except Exception as e:
            logger.error("ERROR - populating dump %s os_info attribute caused: %s", self.image, e)
        del info_data

        try: # Defining Windows version by data received from ProductType entry and info plugin
            if isinstance(win_versions[self.os_info["NtMajorVersion"]][self.os_info["ProductType"]], str) == True:
                self.os_info["os"] = win_versions[self.os_info["NtMajorVersion"]][self.os_info["ProductType"]]
            elif isinstance(win_versions[self.os_info["NtMajorVersion"]][self.os_info["ProductType"]], dict) == True:
                self.os_info["os"] = win_versions[self.os_info["NtMajorVersion"]][self.os_info["ProductType"]][self.os_info["Major/Minor"].split(".")[-1]]
        except Exception as e:
            logger.error("ERROR - defining dump %s Windows version caused: %s", self.image, e)
        finally:
            self.send_to_mongo({"os_info": self.os_info}, "windows_pluginresults")
    
    # Separate method for PrintKey plugin
    def run_print_key(self):
        plugin = interfaces.plugins.windows.registry.printkey.PrintKey
        self.context = contexts.Context()
        automagic = self.get_automagic(plugin)
        try:
            logger.info("INFO - running plugin %s on dump %s", str(plugin), self.image)
            print_key_data, error = self.run_plugin(plugin, automagic)
        except Exception as e: 
            logger.error("ERROR - running plugin %s on dump %s caused: %s", str(plugin), self.image, e)
            print_key_data = None
        finally:
            # REG_DWORD values are in bytes format which causes issues when dumping data from DB
            # All REG_DWORD values are decoded to remove this issue
            for data in print_key_data:
                if data["Type"] == "REG_DWORD":
                    try:
                        data["Data"] = data["Data"].decode()
                    except:
                        data["Data"] = ""

        self.send_to_mongo({"printkey": print_key_data}, "windows_pluginresults")

    # Method to get all data from registry key or its entry if it is specified
    def get_registry_key(self, registry_path, key, entry=None):
        if self.hive_list == None: # If hivelist plugin has not been ran yet
            offset = None
            plugin = interfaces.plugins.windows.registry.hivelist.HiveList
            self.context = contexts.Context()
            automagic = self.get_automagic(plugin)
            hive_list, error = self.run_plugin(plugin, automagic)
            for hive in hive_list: # get hive offset
                if hive["FileFullPath"] == registry_path:
                    offset = hive["Offset"]
                    self.hive_list = hive_list
                    break
            if offset == None:
                return None
        else: # Get hive offset
            for hive in self.hive_list:
                if hive["FileFullPath"] == registry_path:
                    offset = hive["Offset"]
                    break
            if offset == None:
                return None

        plugin = interfaces.plugins.windows.registry.printkey.PrintKey
        self.context = contexts.Context()
        self.context.config['plugins.PrintKey.key'] = key # Define target key
        self.context.config['plugins.PrintKey.offset'] = offset # Define hive offset
        automagic = self.get_automagic(plugin)
        key_data, error = self.run_plugin(plugin, automagic)
        # If no entry is specified in function call, all entries in the key are returned
        if entry == None:
            return key_data
        # If entry name is specified, only that entrys data is returned
        else:
            for value in key_data:
                if value["Name"] == entry:
                    return value
        return None

# Subclass for Linux OS analysing functionality
class Linux(Autovola):
    def __init__(self, image):
        super().__init__(image)
        self.context = contexts.Context() # Type: volatility3.framework.contexts.Context
        self.os = "linux"

    def __del__(self):
        gc.collect()

    # Main method for running all Linux plugins
    def run_linux_plugins(self):
        if self.os == None:
            try: # Get OS banner if not yet acquired
                self.os = self.get_banner()
            except Exception as e:
                pass
        self.send_to_mongo({"dumpsize": self.get_dump_size()}, "linux_pluginresults")
        self.send_to_mongo({"os_info": self.os}, "linux_pluginresults")
        del self.os

        linux_plugins = plugins_config.items("automaticly_run_linux_plugins") # Get Linux plugins from plugins.cfg
        for plugin_name, plugin in linux_plugins: # Run each plugin
            plugin = eval(plugin)
            self.context = contexts.Context()
            automagic = self.get_automagic(plugin)
            try:
                logger.info("INFO - running plugin %s on dump %s", str(plugin), self.image)
                plugin_data, error = self.run_plugin(plugin, automagic)
            except Exception as e:
                logger.error("ERROR - running plugin %s on dump %s caused: %s", str(plugin), self.image, e)
                plugin_data = None
            self.send_to_mongo({plugin_name: plugin_data}, "linux_pluginresults") # plugin results are send to database
            del plugin_data
            del automagic
    
    # get Linux OS banner
    def get_banner(self):
        plugin = interfaces.plugins.banners.Banners
        self.context = contexts.Context()
        automagics = self.get_automagic(plugin)
        try:
            logger.info("INFO - running plugin %s on dump %s", str(plugin), self.image)
            banners, error = self.run_plugin(plugin, automagics)
        except Exception as e:
            logger.error("ERROR - running plugin %s on dump %s caused: %s", str(plugin), self.image, e)
            return None
        
        try: # Check if any banner contains word linux
            for banner in banners:
                if "linux" in banner["Banner"].lower(): # Return banner if proper one was found
                    return banner["Banner"]
        except IndexError:
            pass
        return None

    # Get basic banner and dump size from Linux dump
    def get_basic_details(self):
        try: # Get OS banner if not yet acquired
            self.os = self.get_banner()
        except Exception as e:
            pass
        self.send_to_mongo({"dumpsize": self.get_dump_size()}, "linux_pluginresults")
        self.send_to_mongo({"os_info": self.os}, "linux_pluginresults")

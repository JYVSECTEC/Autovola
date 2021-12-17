import os
import sys
import json
import pymongo
import datetime
import mongoconn
import configparser
from urllib import request

import volatility3
from volatility3 import framework
from volatility3.framework import contexts, interfaces, constants, automagic, plugins

# Code overwriting volatility 
import gridtojson
#from owvola import PsListOw

# Volatility configs
base_config_path = "plugins"
interfaces.plugins.__path__ = constants.PLUGINS_PATH
failures = framework.import_files(interfaces.plugins, True)
volatility3.framework.constants.PARALLELISM = volatility3.framework.constants.Parallelism.Off

# Configparser configs
plugins_config = configparser.ConfigParser()
plugins_config.read("plugins.cfg")

# Windows Plugins

windows_plugins = [
	interfaces.plugins.windows.cachedump.Cachedump,
	interfaces.plugins.windows.callbacks.Callbacks,
	interfaces.plugins.windows.cmdline.CmdLine,
	interfaces.plugins.windows.dlllist.DllList,
	interfaces.plugins.windows.driverirp.DriverIrp,
	interfaces.plugins.windows.driverscan.DriverScan,
	interfaces.plugins.windows.envars.Envars,
	interfaces.plugins.windows.filescan.FileScan,
	interfaces.plugins.windows.getservicesids.GetServiceSIDs,
	interfaces.plugins.windows.getsids.GetSIDs,
	interfaces.plugins.windows.handles.Handles,
	interfaces.plugins.windows.hashdump.Hashdump,
	interfaces.plugins.windows.info.Info,
	interfaces.plugins.windows.lsadump.Lsadump,
	interfaces.plugins.windows.malfind.Malfind,
	interfaces.plugins.windows.memmap.Memmap,
	interfaces.plugins.windows.modscan.ModScan,
	interfaces.plugins.windows.modules.Modules,
	interfaces.plugins.windows.mutantscan.MutantScan,
	interfaces.plugins.windows.netscan.NetScan,
	interfaces.plugins.windows.poolscanner.PoolScanner,
	interfaces.plugins.windows.privileges.Privs,
	interfaces.plugins.windows.pslist.PsList,
	interfaces.plugins.windows.psscan.PsScan,
	interfaces.plugins.windows.pstree.PsTree,
	interfaces.plugins.windows.registry.certificates.Certificates,
	interfaces.plugins.windows.registry.hivelist.HiveList,
	interfaces.plugins.windows.registry.hivescan.HiveScan,
	interfaces.plugins.windows.registry.printkey.PrintKey,
	interfaces.plugins.windows.registry.userassist.UserAssist,
	interfaces.plugins.windows.ssdt.SSDT,
	interfaces.plugins.windows.statistics.Statistics,
	interfaces.plugins.windows.strings.Strings,
	interfaces.plugins.windows.svcscan.SvcScan,
	interfaces.plugins.windows.symlinkscan.SymlinkScan,
	interfaces.plugins.windows.vadinfo.VadInfo,
	interfaces.plugins.windows.vadyarascan.VadYaraScan,
	interfaces.plugins.windows.verinfo.VerInfo,
	interfaces.plugins.windows.virtmap.VirtMap,
	interfaces.plugins.yarascan.YaraScan
	]

# Windows versions
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
            "5": 
                {"WinNT":
                    {"2195":"Windows 2000",
                    "2600":"Windows XP 32-bit",
                    "3790":"Windows XP 64-bit"}
                }
            }
        
class Autovola:

    def __init__(self, image):
        self.image = image
        self.context = contexts.Context()
        self.db_id = None
        self.os = None

    def automate(self):
        self.os = self.get_os()
        if isinstance(self.os, tuple):
            if "linux".lower() in self.os:
                analyze_linux(self)
        elif isinstance(self.os, str):
            if self.os == "windows":
                analyze_windows(self)
            elif self.os == "unknown":
                print("possibly Mac image (logged)")
            elif self.os == "anomylous":
                print("error (logged)")

    def get_os(self):
        plugin = interfaces.plugins.banners.Banners
        automagics = self.get_automagic(plugin)
        banners, error = self.run_plugin(plugin, automagics)

        try:
            for banner in banners:
                if "linux" in banner["Banner"].lower():
                    return banner["Banner"]
        except IndexError:
            pass
        
        plugin = interfaces.plugins.windows.info.Info
        automagics = self.get_automagic(plugin)
        try:
            json_data, error = self.run_plugin(plugin, automagics)
        except exceptions.UnsatisfiedException:
            return "unknown"
        except:
            return "anomylous"

        return "windows"
        
    def get_automagic(self, plugin):
        file_name = os.path.abspath(self.image)
        single_location = "file:" + request.pathname2url(file_name)
        self.context.config['automagic.LayerStacker.single_location'] = single_location
        available_automagics = automagic.available(self.context)
        automagics = automagic.choose_automagic(available_automagics, plugin)
        return automagics

    def run_plugin(self, plugin, automagics):
        plugin_config_path = interfaces.configuration.path_join(base_config_path, plugin.__name__)
        unsatisfied = plugin.unsatisfied(self.context, plugin_config_path)
        try:
            constructed = plugins.construct_plugin(self.context, automagics, plugin, base_config_path, gridtojson.MuteProgress(), None)
            grid = constructed.run()
            json_data, error = gridtojson.ReturnJsonRenderer().render(grid)
        except exceptions.UnsatisfiedException:
            json_data = ""
            error = ""
        except Exception as e:
            print(e)
            json_data = ""
            error = ""
        finally:
            return json_data, error
    
    def analyze_linux(self):
        linux_obj = Linux(self.image)
        linux_obj.run_linux_plugins()

    def analyze_windows(self):
        windows_obj = Windows(self.image)
        windows_obj.get_system_version()
        print(windows_obj.os_info)
        #windows_obj.get_basic_details()
        #windows_obj.run_windows_plugins()
        #sys.exit()
    
    # Returns image size if it can be calculated
    def get_dump_size(self):
        try:
            size = os.stat(self.image).st_size
        except:
            print("LOG")
            size = ""
        return size

    def get_current_time(self):
        try:
            current_time = datetime.datetime.now()
        except:
            current_time = None
        return current_time.strftime("%Y-%m-%d %H:%M:%S")

    def send_to_mongo(self, data, table):
        database = "autovola"
        for x in range(1, 5):
            result = mongoconn.upload_data(database, table, data, self.db_id)
            print(result)
            if result == ("error" or "timeout"):
                print("oh no")
                continue
            elif result == "ok":
                break
            else:
                self.db_id = result

class Windows(Autovola):
    def __init__(self, image):
        super().__init__(image)
        self.context = contexts.Context()
        self.hive_list = None
        self.system_name = None
        self.os_info = dict()

    def get_basic_details(self):
        self.send_to_mongo({"currenttime": self.get_current_time()}, "windows_pluginresults")
        self.get_system_version()
        self.get_system_name()
        self.send_to_mongo({"dumpsize": self.get_dump_size()}, "windows_pluginresults")
        #https://en.wikipedia.org/wiki/Windows_NT
        
    def run_windows_plugins(self):
        windows_plugins = plugins_config.items("used_windows_plugins")
        self.run_big_pools()
        self.run_print_key()
        self.run_svcscan()
        self.run_hive_scan()
        self.run_vad_info()
        for plugin_name, plugin in windows_plugins:
            plugin = eval(plugin)
            self.context = contexts.Context()
            automagic = self.get_automagic(plugin)
            print("Plugin: " + str(plugin))
            try:
                plugin_data, error = self.run_plugin(plugin, automagic)
            except:
                plugin_data = None
            self.send_to_mongo({plugin_name: plugin_data}, "windows_pluginresults")
            print(str(plugin_data))

    def run_hive_scan(self):
        plugin = interfaces.plugins.windows.registry.hivescan.HiveScan
        self.context = contexts.Context()
        automagic = self.get_automagic(plugin)
        try:
            hive_scan_data, error = self.run_plugin(plugin, automagic)
        except: 
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
        vad_info_data, error = self.run_plugin(plugin, automagic)
        # MongoDB can only handle 8 byte integers so all parent data has to be typecasted to string since those values are too large to fit into 8 bytes
        for data in vad_info_data:
            try:
                data["Parent"] = str(data["Parent"])
            except:
                data["Parent"] = None
        self.send_to_mongo({"vadinfo": vad_info_data}, "windows_pluginresults")

    # separate method for BigPools plugin
    def run_big_pools(self):
        plugin = interfaces.plugins.windows.bigpools.BigPools
        self.context = contexts.Context()
        automagic = self.get_automagic(plugin)
        big_pools_data, error = self.run_plugin(plugin, automagic)
        # MongoDB can only handle 8 byte integers so all allocation data has to be typecasted to string since those values are too large to fit into 8 bytes
        for data in big_pools_data:
            try:
                data["Allocation"] = str(data["Allocation"])
            except:
                data["Allocation"] = None
        self.send_to_mongo({"bigpools": big_pools_data}, "windows_pluginresults")
    
    # Separate methods for SvcScan plugin
    def run_svcscan(self):
        plugin = interfaces.plugins.windows.svcscan.SvcScan
        self.context = contexts.Context()
        automagic = self.get_automagic(plugin)
        svcscan_data, error = self.run_plugin(plugin, automagic)
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
        system_name = self.get_registry_key("\\REGISTRY\\MACHINE\\SYSTEM","ControlSet001\Control\ComputerName\ComputerName", "ComputerName")
        try:
            self.system_name = system_name["Data"].decode().replace("\"", "")
        except AttributeError:
            self.system_name = system_name["Data"].replace("\"", "")
        result = self.send_to_mongo({"name": self.system_name}, "windows_pluginresults")

    def get_system_version(self):
        #https://www.itprotoday.com/windows-78/how-can-i-check-what-type-windows-nt-installation-i-have
        try:
            data = self.get_registry_key("\\REGISTRY\\MACHINE\\SYSTEM", "ControlSet001\\Control\\ProductOptions", "ProductType")
            product_type = data["Data"].decode().replace("\"","").replace("\x00", "")
        except (UnicodeDecodeError, AttributeError):
            product_type = data["Data"].replace("\"","").replace("\x00", "")
        except:
            product_type = None
        self.os_info["ProductType"] = product_type

        plugin = interfaces.plugins.windows.info.Info
        self.context = contexts.Context()
        automagic = self.get_automagic(plugin)
        json_data, error = self.run_plugin(plugin, automagic)
        for data in json_data:
            if data["Variable"] == "NtMajorVersion":
                self.os_info["NtMajorVersion"] = data["Value"]
            elif data["Variable"] == "NtMinorVersion":
                self.os_info["NtMinorVersion"] = data["Value"]
            elif data["Variable"] == "Major/Minor":
                self.os_info["Major/Minor"] = data["Value"]
        
        if isinstance(win_versions[self.os_info["NtMajorVersion"]][self.os_info["ProductType"]], str) == True:
            self.os_info["os"] = win_versions[self.os_info["NtMajorVersion"]][self.os_info["ProductType"]]
        elif isinstance(win_versions[self.os_info["NtMajorVersion"]][self.os_info["ProductType"]], dict) == True:
            self.os_info["os"] = win_versions[self.os_info["NtMajorVersion"]][self.os_info["ProductType"]][self.os_info["Major/Minor"].split(".")[-1]]
        result = self.send_to_mongo({"os_info": self.os_info}, "windows_pluginresults")
    
    # Separate method for PrintKey plugin
    def run_print_key(self):
        plugin = interfaces.plugins.windows.registry.printkey.PrintKey
        self.context = contexts.Context()
        automagic = self.get_automagic(plugin)
        print_key_data, error = self.run_plugin(plugin, automagic)
        # REG_DWORD values are in bytes format which causes issues when dumping data from DB
        # All REG_DWORD values are decoded to remove this issue
        for data in print_key_data:
            if data["Type"] == "REG_DWORD":
                try:
                    data["Data"] = data["Data"].decode()
                except:
                    data["Data"] = ""

        self.send_to_mongo({"printkey": print_key_data}, "windows_pluginresults")

    #def run_pslist(self):
    #    plugin = PsListOw
    #    self.context = contexts.Context()
    #    automagic = self.get_automagic(plugin)
    #    process_data, error = self.run_plugin(plugin, automagic)
    #    for data in process_data:
    #        print(data)

        #self.send_to_mongo({"printkey": print_key_data}, "windows_pluginresults")

    # Method to get all data from registry key or its entry if it is specified
    def get_registry_key(self, registry_path, key, entry=None):
        if self.hive_list == None:
            offset = None
            plugin = interfaces.plugins.windows.registry.hivelist.HiveList
            self.context = contexts.Context()
            automagic = self.get_automagic(plugin)
            hive_list, error = self.run_plugin(plugin, automagic)
            for hive in hive_list:
                if hive["FileFullPath"] == registry_path:
                    offset = hive["Offset"]
                    self.hive_list = hive_list
                    break
            if offset == None:
                return None
        else:
            for hive in self.hive_list:
                if hive["FileFullPath"] == registry_path:
                    offset = hive["Offset"]
                    break
            if offset == None:
                return None

        plugin = interfaces.plugins.windows.registry.printkey.PrintKey
        self.context = contexts.Context()
        self.context.config['plugins.PrintKey.key'] = key
        self.context.config['plugins.PrintKey.offset'] = offset
        automagic = self.get_automagic(plugin)
        json_data, error = self.run_plugin(plugin, automagic)
        # If no entry is specified in function call, all entries in the key are returned
        if entry == None:
            return json_data
        # If entry name is specified, only that entrys data is returned
        else:
            for value in json_data:
                if value["Name"] == entry:
                    return value
        return None

class Linux(Autovola):
    def __init__(self, image):
        super().__init__(image)
        self.context = contexts.Context()
        self.banner_info = None

    def run_linux_plugins(self):
        if self.os == None:
            self.os = self.get_banner()
        self.send_to_mongo({"currenttime": self.get_current_time()}, "linux_pluginresults")
        self.send_to_mongo({"dumpsize": self.get_dump_size()}, "linux_pluginresults")
        self.send_to_mongo({"os_info": self.os}, "linux_pluginresults")
        print(self.db_id)
        linux_plugins = plugins_config.items("used_linux_plugins")
        for plugin_name, plugin in linux_plugins:
            plugin = eval(plugin)
            self.context = contexts.Context()
            automagic = self.get_automagic(plugin)
            print("Plugin: " + str(plugin))
            try:
                plugin_data, error = self.run_plugin(plugin, automagic)
                print(plugin_data)
                print(error)
            except:
                plugin_data = None
            self.send_to_mongo({plugin_name: plugin_data}, "linux_pluginresults")
            print(str(plugin_data))

    def get_banner(self):
        plugin = interfaces.plugins.banners.Banners
        self.context = contexts.Context()
        automagics = self.get_automagic(plugin)
        banners, error = self.run_plugin(plugin, automagics)
        try:
            for banner in banners:
                if "linux" in banner["Banner"].lower():
                    return banner["Banner"]
        except IndexError:
            pass
        return None

/*
Plugins contains all the Windows plugins that will be shown to user in generic boxes. Each key in plugins is the plugin name, which is the same as its result field in DB.
Each plugin object contains info-attribute, which data will be rendered to infoBox contained in plugin header.
columns-attribute contains objects for each column names and styles that define the column width + update that tells which functions should be run to column data when it is retrieved from DB
*/

var plugins = {
    "netscan" : { // Plugin name
        // Data contained in infoBox which is found from each plugin
        info : `netscan scans for network objects present in windows memory image.\n
        - PID: Process ID\n
        - Owner: Process owning the connection.\n
        - Offset: Connection offset\n
        - Proto: Connection protocol\n
        - LocalAddr: Local connection address\n
        - LocalPort: Local connection port\n
        - ForeignAddr: Foreign connection address\n
        - ForeignPort: Foreign connection port\n
        - State: Current state for TCP connections\n
        - Created: Connection establishment time\n`
        , // Column names and styles that define the column width + update that tells which functions should be run to column data when it is retrieved from DB
        columns : [
            {"name": "PID", "style" : {width: "6%"}},
            {"name": "Owner", "style": {width: "16%"}},
            {"name": "Offset", "style": {width: "17%"}, "update" : "to64BitHex"}, // Turn Offset values received from DB to 64 bit hexadecimal
            {"name": "Proto", "style": {width: "6%"}},
            {"name": "LocalAddr", "style": {width: "8%"}},
            {"name": "LocalPort", "style": {width: "8%"}},
            {"name": "ForeignAddr", "style": {width: "10%"}},
            {"name": "ForeignPort", "style": {width: "7%"}},
            {"name": "State", "style": {width: "7%"}},
            {"name": "Created", "style": { "border-right": "none !important", width: "15%"}},
        ]
    },

    "dlllist" : {
        info : `dlllist displays process's loaded DLLs. It walks the doubly-linked list of _LDR_DATA_TABLE_ENTRY structures which is pointed to by the PEB's InLoadOrderModuleList.\n
        - PID: Process ID\n
        - Process: Process name\n
        - Name: DLL loaded by the process\n
        - Path: DLL path in file system\n
        - Base: DLL base address\n
        - Size: DLL size\n
        - LoadTime: Timestamp of process loading the DLL`
        ,
        columns : [
            {"name": "PID", "style": {width: "10%"}},
            {"name": "Process", "style": {width: "16%"}},
            {"name": "Name", "style": {width: "16%"}},
            {"name": "Path", "style": {width: "16%"}},
            {"name": "Base", "style": {width: "16%"}, "update" : "to64BitHex"},
            {"name": "Size", "style": {width: "10%"}, "update" : "bytesToSize"}, // Turn bytes received from DB to corresponding size (KB, MB etc.)
            {"name": "LoadTime", "style": {width: "16%"}}
        ]
    },

    "psscan" : {
        info : `psscan scans for processes present in memory image.\n
        - ImageFileName: File which process was created from\n
        - PID: Process ID\n
        - PPID: Process parent ID\n
        - Offset: Process offset\n
        - Handles: Handles opened\n
        - Threads: Threads running in the process\n
        - SessionId: Session ID\n
        -- empty session ID will likely mean that process has started before smss.exe which is the session manager.\n
        - File output: File output\n
        - CreateTime: Time when process was created\n
        - ExitTime: Time when process ended if it has ended\n
        - Wow64: 32-bit applications on a 64–bit operating system`
        ,
        columns : [
            {"name": "ImageFileName", "style": {width : "10%"}},
            {"name": "PID", "style": {width : "10%"}},
            {"name": "PPID", "style": {width : "10%"}},
            {"name": "Offset", "style": {width : "10%"}, "update" : "to64BitHex"},
            {"name": "Handles", "style": {width : "10%"}},
            {"name": "Threads", "style": {width : "10%"}},
            {"name": "SessionId", "style": {width : "10%"}},
            {"name": "CreateTime", "style": {width : "10%"}},
            {"name": "ExitTime", "style": {width : "10%"}},
            {"name": "Wow64", "style": {width : "10%"}, "update" : "toString"}
        ]
    },

    "handles" : {
        info : `handles displays open handles in processes. This applies to files, registry keys, mutexes, named pipes, events, window stations, desktops, threads, and all other types of securable executive objects.\n
        - Offset: Offset of the handle\n
        - PID: Process id\n
        - Process: Process name\n
        - Name: Handle target\n
        - Type: Type of the handle target\n
        - GrantedAccess: Details of the granted access\n
        - HandleValue: Handle value`
        ,
        columns : [
            {"name": "Offset", "style": {width : "17.5%"}, "update" : "to64BitHex"},
            {"name": "PID", "style": {width : "8%"}},
            {"name": "Process", "style": {width : "10%"}},
            {"name": "Name", "style": {width : "25%"}},
            {"name": "HandleValue", "style": {width : "12%"}},
            {"name": "Type", "style": {width : "12%"}},
            {"name": "GrantedAccess", "style": {width : "15.5%"}, "update" : "toHex"} // Turn values received from DB to hexadecimal
        ]
    },

    "envars" : {
        info : `envars displays process environment variables.\n
        - PID: Process ID\n
        - Process: process name\n
        - Block: variable location in memory\n
        - Variable: environment variable name\n
        - Value: environment variable value\n`
        ,
        columns : [
            {"name": "PID", "style": {width : "10%"}},
            {"name": "Process", "style": {width : "22.5%"}},
            {"name": "Block", "style": {width : "22.5%"}},
            {"name": "Variable", "style": {width : "22.5%"}},
            {"name": "Value", "style": {width : "22.5%"}}
        ]
    },

    "callbacks" : {
        info : `callbacks lists kernel callbacks and notification routines\n
        - Module: Module name\n
        - Type: Callback type\n
        - Callback: Callback address \n
        - Symbol: Symbol name\n
        - Detail: Details about the callback`
        ,
        columns : [
            {"name": "Module", "style": {width : "15%"}},
            {"name": "Type", "style": {width : "23.33%"}},
            {"name": "Callback", "style": {width : "23.33%"}, "update" : "to64BitHex"},
            {"name": "Symbol", "style": {width : "23.33%"}},
            {"name": "Detail", "style": {width : "15%"}},
        ]
    },

    "modscan" : {
        info : `modscan command finds LDR_DATA_TABLE_ENTRY structures by scanning physical memory for pool tags. This can pick up previously unloaded drivers and drivers that have been hidden/unlinked by rootkits. Unlike modules the order of results has no relationship with the order in which the drivers loaded.\n
        - Offset: Module physical offset\n
        - Base: Module base address\n
        - Name: Module name \n
        - Path: Module path in disk\n
        - Size: Module size`
        ,
        columns : [
            {"name": "Offset", "style": {width : "20%"}, "update" : "to64BitHex"},
            {"name": "Base", "style": {width : "20%"}, "update" : "to64BitHex"},
            {"name": "Name", "style": {width : "20%"}},
            {"name": "Path", "style": {width : "30%"}},
            {"name": "Size", "style": {width : "10%"}, "update" : "bytesToSize"}
        ]
    },


    "modules" : {
        info : `modules lists kernel drivers loaded on the system by walking the doubly-linked list of LDR_DATA_TABLE_ENTRY structures pointed to by PsLoadedModuleList. It cannot find hidden/unlinked kernel drivers, however modscan serves that purpose.\n
        - Offset: Module physical offset\n
        - Base: Module base address\n
        - Name: Module name \n
        - Path: Module path in disk\n
        - Size: Module size`
        ,
        columns : [
            {"name": "Offset", "style": {width : "20%"}, "update" : "to64BitHex"},
            {"name": "Base", "style": {width : "20%"}, "update" : "to64BitHex"},
            {"name": "Name", "style": {width : "20%"}},
            {"name": "Path", "style": {width : "30%"}},
            {"name": "Size", "style": {width : "10%"}, "update" : "bytesToSize"}
        ]
    },

    "driverscan" : {
        info : `driverscan scans for drivers present in windows memory image.\n
        - Offset: Physical offset of the _DRIVER_OBJECT structure\n
        - Name: Device driver or filesystem driver\n
        - Driver Name: Name of the driver\n
        - Start: Starting memory address of the driver\n
        - Service Key: Service key name\n
        - Size: Driver size`
        ,
        columns : [
            {"name": "Offset", "style": {width : "18%"}, "update" : "to64BitHex"},
            {"name": "Name", "style": {width : "18%"}},
            {"name": "Driver Name", "style": {width : "18%"}},
            {"name": "Start", "style": {width : "18%"}, "update" : "to64BitHex"},
            {"name": "Service Key", "style": {width : "18%"}},
            {"name": "Size", "style": {width : "10%"}, "update" : "bytesToSize"}
        ]
    },

    "filescan" : {
        info : `filescan finds FILE_OBJECTs in physical memory using pool tag scanning.\n
        - Name: File name\n
        - Offset: Physical offset of the FILE_OBJECT\n
        - Size: FILE_OBJECT size\n`
        ,
        columns : [
            {"name": "Name", "style": {width : "40%"}},
            {"name": "Offset", "style": {width : "40%"}, "update" : "to64BitHex"},
            {"name": "Size", "style": {width : "20%"}}
        ]
    },

    "getserviceids" : {
        info : `getserviceids calculates the SIDs for services on a dump.\n
        - Service: Service name\n
        - SID: Calculated SID for the service`
        ,
        columns : [
            {"name": "Service", "style": {width : "25%"}},
            {"name": "SID", "style": {width : "75%"}},
        ]
    },

    "getsids" : {
        info : `getsids shows SIDs (Security Identifiers) associated with processes.\n
        - PID: Process ID\n
        - Process: Process name\n
        - Name: security principal name\n
        - SID: Security identifier value`
        ,
        columns : [
            {"name": "PID", "style": {width : "15%"}},
            {"name": "Process", "style": {width : "15%"}},
            {"name": "Name", "style": {width : "35%"}},
            {"name": "SID", "style": {width : "35%"}}
        ]
    },

    "privs" : {
        info : `privs lists process token privileges.\n
        - PID: Process ID\n
        - Process: Process name\n
        - Value: Privilege number\n
        - Attributes: Privilege attributes\n
        - Privilege: Privilege name\n
        - Description: Privilege description\n`
        ,
        columns : [
            {"name": "PID", "style" : {width : "8%"}},
            {"name": "Process", "style": {width : "21%"}},
            {"name": "Value", "style": {width : "8%"}},
            {"name": "Attributes", "style": {width : "21%"}},
            {"name": "Privilege", "style": {width : "21%"}},
            {"name": "Description", "style": {width : "21%"}}
        ]
    },

    "svcscan" : {
        info : `svcscan finds windows services from memory dump.\n
        - Offset: Offset of the service\n
        - Order: Service boot order value\n
        - PID: Host process ID\n
        - Name: Service name\n
        - Display: Service display name\n
        - Type: Type of the service\n
        - Start: Service start option\n
        -- SERVICE_AUTO_START: A service started automatically by the service control manager during system startup.\n
        -- SERVICE_BOOT_START: A device driver started by the system loader. This value is valid only for driver services.\n
        -- SERVICE_DEMAND_START: A service started by the service control manager when a process calls the StartService function.\n
        -- SERVICE_DISABLED: A service that cannot be started. Attempts to start the service result in the error code ERROR_SERVICE_DISABLED.\n
        -- SERVICE_SYSTEM_START: A device driver started by the IoInitSystem function. This value is valid only for driver services.\n
        - State: Current state of the service\n
        - Binary: Binary path of the service`
        ,
        columns : [
            {"name": "Offset", "style": {width: "13.16666%"}, "update" : "to64BitHex"},
            {"name": "Order", "style": {width: "7%"}},
            {"name": "PID", "style": {width: "7%"}},
            {"name": "Name", "style": {width: "13.16666%"}},
            {"name": "Display", "style": {width: "13.16666%"}},
            {"name": "Type", "style": {width: "13.16666%"}},
            {"name": "Start", "style": {width: "13.16666%"}},
            {"name": "State", "style": {width: "13.16666%"}},
            {"name": "Binary", "style": {width: "7%"}}
        ]
    },

    "mutantscan" : {
        info : `mutantscan scans for mutexes present in windows memory image.\n
        - Offset: Offset of the mutex\n
        - Name: Mutant name`
        ,
        columns : [
            {"name": "Offset", "style": {width: "35%"}, "update" : "to64BitHex"},
            {"name": "Name", "style": {width: "65%"}},
        ]
    },

    "poolscanner" : {
        info : `Generic poolscanner.\n
        - Offset: Pool offset\n
        - Name: Pool header filename\n
        - Tag: Pool tag\n
        - Layer: Memory layer`
        ,
        columns : [
            {"name": "Offset", "style": {width: "20%"}, "update" : "to64BitHex"},
            {"name": "Name", "style": {width: "30%"}},
            {"name": "Tag", "style": {width: "30%"}},
            {"name": "Layer", "style": {width: "20%"}}
        ]
    },

    "bigpools" : {
        info : `bigpools lists big page pools.\n
        - Allocation: Kernel memory address where the allocation begins\n
        - Tag: Pool tag name\n
        - PoolType: Type of allocated system memory\n
        - NumberOfBytes: Amount of allocated bytes`
        ,
        columns : [
            {"name": "Allocation", "style": {width: "26%"}, "update" : ["parseInt","to64BitHex"]}, // Turns string to integer and then integer to Hex, order of the array values is important here
            {"name": "Tag", "style": {width: "23%"}},
            {"name": "PoolType", "style": {width: "26%"}},
            {"name": "NumberOfBytes", "style": {width: "23%"}, "update" : "bytesToSize"}
        ]
    },

    "driverirp" : {
        info : `driverirp lists IRPs for drivers.\n
        - Offset: IRP function offset\n
        - Driver Name: Driver name\n
        - IRP: IRP name\n
        - Address: Driver address\n
        - Module: Module name\n
        - Symbol: Symbol name`
        ,
        columns : [
            {"name": "Offset", "style": {width: "16.666%"}, "update" : "to64BitHex"},
            {"name": "Driver Name", "style": {width: "16.666%"}},
            {"name": "IRP", "style": {width: "16.666%"}},
            {"name": "Address", "style": {width: "16.666%"}, "update" : "to64BitHex"},
            {"name": "Module", "style": {width: "16.666%"}},
            {"name": "Symbol", "style": {width: "16.666%"}}
        ]
    },

    "verinfo" : {
        info : `verinfo lists version information from PE files.\n
        - PID: Process ID\n
        - Process: Process name\n
        - Base: Base address of the PE\n
        - Name: File name\n
        - Major: Major version\n
        - Minor: Minor version\n
        - Product: Product number\n
        - Build: Build number`
        ,
        columns : [
            {"name": "PID", "style": {width: "10%"}},
            {"name": "Process", "style": {width: "16.6666%"}},
            {"name": "Base", "style": {width: "16.6666%"}, "update" : "to64BitHex"},
            {"name": "Name", "style": {width: "16.6666%"}},
            {"name": "Major", "style": {width: "10%"}},
            {"name": "Minor", "style": {width: "10%"}},
            {"name": "Product", "style": {width: "10%"}},
            {"name": "Build", "style": {width: "10%"}}
        ]
    },

    "symlinkscan" : {
        info : `symlinkscan scans for symbolic link objects and outputs their information.\n
        - Offset: Process ID\n
        - CreateTime: Symbolic link creation time\n
        - From Name: Original name\n
        - To Name: Target name`
        ,
        columns : [
            {"name": "Offset", "style": {width: "20%"}, "update" : "to64BitHex"},
            {"name": "CreateTime", "style": {width: "20%"}},
            {"name": "From Name", "style": {width: "30%"}},
            {"name": "To Name", "style": {width: "30%"}}
        ]
    },

    "userassist" : {
        info : `userassist finds UserAssist keys from image.\n
        - Hive Offset: Offset of the key\n
        - Hive Name: Hive name\n
        - Path: Key path\n
        - Last Write Time: Last write time\n
        - Type: Data type\n
        - Name: Entry name\n
        - ID: Session ID\n
        - Count: Number of times the application was ran\n
        - Focus Count: Number of times the application has been focused into\n
        - Time Focused: Total time the application has been focused\n
        - Last Updated: Last time the application was ran`
        ,
        columns : [
            {"name": "Hive Offset", "style": {width: "10.8333%"}, "update" : "to64BitHex"},
            {"name": "Hive Name", "style": {width: "10.8333%"}},
            {"name": "Path", "style": {width: "10.8333%"}},
            {"name": "Last Write Time", "style": {width: "10.8333%"}},
            {"name": "Type", "style": {width: "7%"}},
            {"name": "Name", "style": {width: "10.8333%"}},
            {"name": "ID", "style": {width: "7%"}},
            {"name": "Count", "style": {width: "7%"}},
            {"name": "Focus Count", "style": {width: "7%"}},
            {"name": "Time Focused", "style": {width: "7%"}},
            {"name": "Last Updated", "style": {width: "10.8333%"}}
        ]
    },

    "printkey" : {
        info : `printkey searches all hives and prints key information. This plugin has been run with default settings.\n
        - Hive Offset: Hive offset\n
        - Key: Key name\n
        - Name: Entry name\n
        - Type: Data type\n
        - Last Write Time: Last time modified\n
        - Volatile: Tells if keys or subkeys are either stable or volatile\n
        - Data: Entry data (Most likely always empty because no specific key is targeted)`
        ,
        columns : [
            {"name": "Hive Offset", "style": {width: "16.8%"}, "update" : "to64BitHex"},
            {"name": "Key", "style": {width: "16.8%"}},
            {"name": "Name", "style": {width: "16.8%"}},
            {"name": "Type", "style": {width: "8%"}},
            {"name": "Last Write Time", "style": {width: "16.8%"}},
            {"name": "Volatile", "style": {width: "8%"}, "update" : "toString"},
            {"name": "Data", "style": {width: "16.8%"}}
        ]
    },

    "virtmap" : {
        info : `virtmap lists virtual mapped sections.\n
        - Region: Region name\n
        - Start offset: Section starting offset\n
        - End offset: Section ending offset`
        ,
        columns : [
            {"name": "Region", "style": {width: "30%"}},
            {"name": "Start offset", "style": {width: "35%"}, "update" : "to64BitHex"},
            {"name": "End offset", "style": {width: "35%"}, "update" : "to64BitHex"}
        ]
    },

    "vadinfo" : {
        info : `vadinfo displays extended information about a process's VAD nodes.\n
        - PID: Process ID\n
        - Process: Process name\n
        - Offset: VAD offset\n
        - Start VPN: Starting virtual addresses in process memory that the MMVAD structure pertains to\n
        - End VPN: Ending virtual addresses in process memory that the MMVAD structure pertains to\n
        - Tag: VAD tag\n
        - Protection: Memory protection\n
        - CommitCharge: This value specifies the number of committed pages in the region\n
        - PrivateMemory: Committed regions that cannot be shared with other processes\n
        - Parent: Parent node address\n
        - File: File path`
        ,
        columns : [
            {"name": "PID", "style": {width : "6%"}},
            {"name": "Process", "style": {width : "13%"}},
            {"name": "Offset", "style": {width : "10%"}, "update" : "to64BitHex"},
            {"name": "Start VPN", "style": {width : "10%"}, "update" : "to64BitHex"},
            {"name": "End VPN", "style": {width : "10%"}, "update" : "to64BitHex"},
            {"name": "Tag", "style": {width : "6%"}},
            {"name": "CommitCharge", "style": {width : "6%"}},
            {"name": "Protection", "style": {width : "10%"}},
            {"name": "PrivateMemory", "style": {width : "6%"}},
            {"name": "Parent", "style": {width : "10%"}, "update" : ["parseInt","to64BitHex"]},
            {"name": "File", "style": {width : "13%"}}
        ]
    },

    "hivelist" : {
        info : `hivelist locates virtual addresses of registry hives in memory.\n
        - Offset: Hive offset\n
        - FileFullPath: Hive path on disk`
        ,
        columns : [
            {"name": "Offset", "style": {width: "30%"}, "update" : "to64BitHex"},
            {"name": "FileFullPath", "style": {width: "70%"}}
        ]
    },

    "ssdt" : {
        info : `ssdt lists system call table.\n
        - Index: SSDT index number\n
        - Address: SSDT location in memory\n
        - Module: Module owning the SSDT\n
        - Symbol: SSDT name\n`
        ,
        columns : [
            {"name": "Index", "style" : {width : "10%"}},
            {"name": "Address", "style": {width : "30%"}, "update" : "to64BitHex"},
            {"name": "Module", "style": {width : "30%"}},
            {"name": "Symbol", "style": {width : "30%"}}
        ]
    },

    "malfind" : {
        info : `malfind lists process memory ranges that potentially contain injected code. It looks for mappings with certain protection bits and displays the matching mappings.\n
        - Process: Process name\n
        - PID: Process ID\n
        - Start VPN: Starting virtual address in the process memory\n
        - End VPN: Ending virtual address in the process memory\n
        - PrivateMemory: Private memory bit value\n
        - Protection: Describes what kind of access is permitted to this memory area.\n
        - Tag: VAD Tag\n
        - CommitCharge: specifies the number of pages committed in the region described by the
        VAD node\n
        - Hexdump: Preview hexdump from the memory\n
        - Disasm: Preview disassembled if possible\n`
        ,
        columns : [
            {"name": "Process", "style": {width : "14%"}},
            {"name": "PID", "style": {width : "6%"}},
            {"name": "Start VPN", "style": {width : "11%"}, "update" : "to64BitHex"},
            {"name": "End VPN", "style": {width : "11%"}, "update" : "to64BitHex"},
            {"name": "PrivateMemory", "style": {width : "7%"}},
            {"name": "Protection", "style": {width : "11%"}},
            {"name": "Tag", "style": {width : "6%"}},
            {"name": "CommitCharge", "style": {width : "6%"}},
            {"name": "Hexdump", "style": {width : "14%"}},
            {"name": "Disasm", "style": {width : "14%"}}
        ]
    },

    "info" : {
        info : `info shows OS & kernel details of the memory sample being analyzed.\n
        - Kernel Base: Kernel base virtual offset\n
        - DTB: Directory Table Base which contains list of processes page tables\n
        - Is64BIt: Is the system 64-bit\n
        - IsPAE: Are physical address extensions enabled\n
        - Primary: Primary layer name\n
        - Memory Layer: Memory layer name\n
        - KdVersionBlock: Kernel debugger data block \n
        - Major/Minor: Major and minor build numbers\n
        - Machine Type: Specifies the machine's CPU architecture\n
        - KeNumberProcessors: Number of processors in the system\n
        - NtSystemRoot: directory where the core of Windows operating systems files are stored\n
        - NtProductType: indicates the Windows product type\n
        - NtMajorVersion: Major OS version\n
        - NtMinorVersion: Minor OS version\n
        - PE Major Operating System Version: Major version number of the required operating system\n
        - PE Major Operating System Version: Minor version number of the required operating system\n
        - PE Machine: Type of target machine\n
        - PE Time Date Stamp: Indicates when the file was created\n`
    }
}

export { plugins };
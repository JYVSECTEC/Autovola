/*
Plugins contains all the Windows plugins that will be shown to user in generic boxes. Each key in plugins is the plugin name, which is the same as its result field in DB.
Each plugin object contains info-attribute, which data will be rendered to infoBox contained in plugin header.
columns-attribute contains objects for each column names and styles that define the column width + update that tells which functions should be run to column data when it is retrieved from DB
*/

var plugins = {
    "pslist" : {
        info : `pslist shows basic details of processes running in the system.\n
        - COMM: Name of the process running\n
        - PID: Process ID\n
        - PPID: Parent process ID`
        ,
        columns : [
            {"name": "COMM", "style": {width: "50%"}},
            {"name": "PID", "style": {width : "25%"}},
            {"name": "PPID", "style": {width : "25%"}}
        ]
    },

    "elfs" : {
        info : `elfs lists all memory mapped ELF files for all processes.\n
        - Process: Process name\n
        - PID: Process ID\n
        - File Path: Path to file or object\n
        -- [vdso]: small shared library that the kernel automatically maps into the address space of all user-space applications
        - Start: Starting virtual address in the process memory\n
        - End: Ending virtual address in the process memory\n`
        ,
        columns : [
            {"name": "Process", "style": {width : "22.5%"}},
            {"name": "PID", "style": {width : "10%"}},
            {"name": "File Path", "style": {width : "22.5%"}},
            {"name": "Start", "style": {width : "22.5%"}, "update" : "to64BitHex"},
            {"name": "End", "style": {width : "22.5%"}, "update" : "to64BitHex"}
        ]
    },

    "check_modules" : {
        info : `check_modules compares module list to sysfs info, if available.\n
        - Module Name: Name of the module\n
        - Module Address: Memory address of the module\n`
        ,
        columns : [
            {"name": "Module Name", "style": {width : "50%"}},
            {"name": "Module Address", "style": {width : "50%"}, "update" : "to64BitHex"}
        ]
    },

    "check_creds" : {
        info : `check_creds checks if any processes are sharing credential structures.\n
        - PIDs: Process IDs of the processes sharing "cred" structures\n`
        ,
        columns : [
            {"name": "PIDs", "style": {width : "100%"}}
        ]
    },

    "lsmod" : {
        info : `lsmod lists loaded kernel modules.\n
        - Offset: Module location in memory\n
        - Name: Name of the module\n
        - Size: Module size in memory`
        ,
        columns : [
            {"name": "Offset", "style": {width : "40%"}, "update" : "to64BitHex"},
            {"name": "Name", "style": {width : "40%"}},
            {"name": "Size", "style": {width : "20%"}, "update" : "bytesToSize"}
        ]
    },

    "lsof" : {
        info : `lsof lists all memory maps for all processes.\n
        - Process: Process name\n
        - PID: Process ID\n
        - FD: File descriptor\n
        - Path: Path to the file descriptor`
        ,
        columns : [
            {"name": "Process", "style": {width : "35%"}},
            {"name": "PID", "style": {width : "15%"}},
            {"name": "FD", "style": {width : "15%"}},
            {"name": "Path", "style": {width : "35%"}}
        ]
    },

    "keyboard_notifiers" : {
        info : `Parses the keyboard notifier call chain. Plugin walks the kernel "keyboard_notifier_list" and checks if each notifier (callback) is within the kernel.\n
        - Address: Handlers memory address\n
        - Module: Name of the module hooking\n
        - Symbol: Name of the symbol\n`
        ,
        columns : [
            {"name": "Address", "style": {width : "33.3%"}, "update" : "to64BitHex"},
            {"name": "Module", "style": {width : "33.3%"}},
            {"name": "Symbol", "style": {width : "33.3%"}}
        ]
    },

    "check_idt" : {
        info : `check_idt checks if the Linux interrupt-descriptor table has been altered.\n
        - Index: Index number\n
        - Address: Module address in memory\n
        - Module: Module name\n
        - Symbol: Name of the symbol`
        ,
        columns : [
            {"name": "Index", "style": {width : "15%"}},
            {"name": "Address", "style": {width : "35%"}, "update" : "to64BitHex"},
            {"name": "Module", "style": {width : "15%"}},
            {"name": "Symbol", "style": {width : "35%"}}
        ]
    },

    "tty_check" : {
        info : `Checks tty devices for hooks. It works by checking the receive_buf function pointer for every active tty driver on the system.\n
        - Name: TTY device name\n
        - Address: Handlers memory address\n
        - Module: Name of the hooking module\n
        - Symbol: Name of the symbol\n`
        ,
        columns : [
            {"name": "Name", "style": {width : "10%"}},
            {"name": "Address", "style": {width : "30%"}, "update" : "to64BitHex"},
            {"name": "Module", "style": {width : "30%"}},
            {"name": "Symbol", "style": {width : "30%"}}
        ]
    },

    "check_syscall" : {
        info : `check_syscall checks system call table for hooks.\n
        - Table Name: Name of the syscall table\n
        - Table Address: Memory address of the syscall table\n
        - Index: Index number\n
        - Handler Symbol: Handlers symbol name\n
        - Handler Address: Memory address of the handler`
        ,
        columns : [
            {"name": "Table Name", "style": {width : "10%"}},
            {"name": "Table Address", "style": {width : "26.5%"}, "update" : "to64BitHex"},
            {"name": "Index", "style": {width : "10%"}},
            {"name": "Handler Symbol", "style": {width : "26.5%"}},
            {"name": "Handler Address", "style": {width : "26.5%"}, "update" : "to64BitHex"}
        ]
    },

    "check_afinfo" : {
        info : `Verifies the operation function pointers of network protocols. Plugin walks the file_operations and sequence_operations structures of all UDP and TCP protocol structures including, tcp6_seq_afinfo, tcp4_seq_afinfo, udplite6_seq_afinfo, udp6_seq_afinfo, udplite4_seq_afinfo, and udp4_seq_afinfo, and verifies each member.\n
        - Symbol Name: Name of the structure (e.g. udplite6_seq_afinfo)\n
        - Member: Member name (e.g. show)\n
        - Handler Address: Handlers memory address\n`
        ,
        columns : [
            {"name": "Symbol Name", "style": {width : "33.3%"}},
            {"name": "Member", "style": {width : "33.3%"}},
            {"name": "Handler Address", "style": {width : "33.3%"}, "update" : "to64BitHex"}
        ]
    },

    "maps" : {
        info : `maps lists all memory maps for all processes, which includes heaps, stacks, and shared libraries.\n
        - Process: Process name\n
        - PID: Process ID\n
        - File Path: Path to file or object\n
        -- Anonymous Mapping: Memory not relating to any named object or file within the file system is reported as this.
        - Start: Starting virtual address in the process memory\n
        - End: Ending virtual address in the process memory\n
        - Flags: flags (rwx) describe what kind of access is permitted to this memory area.\n
        -- r: memory block is readable.\n
        -- w: memory block is writable.\n
        -- x: memory block is executable.\n
        - Inode: Inode number\n
        - Major/Minor: Each device file has a major ID number and a minor ID number.
        -- Major: Major ID identifies the general class of device, and is used by the kernel to look up the appropriate driver for this type of device.\n
        -- Minor: Minor ID uniquely identifies a particular device within a general class. \n
        - PgOff: Offset into the file that the region maps.`
        ,
        columns : [
            {"name": "Process", "style": {width : "15%"}},
            {"name": "PID", "style": {width : "5%"}},
            {"name": "File Path", "style": {width : "15%"}},
            {"name": "Start", "style": {width : "15%"}, "update" : "to64BitHex"},
            {"name": "End", "style": {width : "15%"}, "update" : "to64BitHex"},
            {"name": "Flags", "style": {width : "5%"}},
            {"name": "Inode", "style": {width : "15%"}},
            {"name": "Major", "style": {width : "5%"}},
            {"name": "Minor", "style": {width : "5%"}},
            {"name": "PgOff", "style": {width : "5%"}}
        ]
    },

    "malfind" : {
        info : `malfind lists process memory ranges that potentially contain injected code. It looks for mappings with certain protection bits and displays the matching mappings.\n
        - Process: Process name\n
        - PID: Process ID\n
        - Start: Starting virtual address in the process memory\n
        - End: Ending virtual address in the process memory\n
        - Protection: flags (rwx) describe what kind of access is permitted to this memory area.\n
        -- r: memory block is readable.\n
        -- w: memory block is writable.\n
        -- x: memory block is executable.\n \n
        - Hexdump: Preview hexdump from the memory\n
        - Disasm: Preview disassembled if possible\n`
        ,
        columns : [
            {"name": "Process", "style": {width : "15.6%"}},
            {"name": "PID", "style": {width : "6%"}},
            {"name": "Start", "style": {width : "15.6%"}, "update" : "to64BitHex"},
            {"name": "End", "style": {width : "15.6%"}, "update" : "to64BitHex"},
            {"name": "Protection", "style": {width : "6%"}},
            {"name": "Hexdump", "style": {width : "20.6%"}},
            {"name": "Disasm", "style": {width : "20.6%"}}
        ]
    }
}


export { plugins };
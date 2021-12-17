import $ from "jquery";
import React from "react";
import "../Upload.css";
import "./Symbols.css";
import {buildInfoPopUp, showInfoPopUp} from "../app/Utils.js";

class SymbolUpload extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            symbolTable: null, // Symbol file
            os: "linux", // Operating System (Windows or Linux currently)
            chunkSize : 5000000, // Sets amount of bytes to be sent in one chunk
            windowsSubDir : "ntkrnlmp.pdb" // Windows sub dir name
        }
        // State change
        this.onFileChange = this.onFileChange.bind(this)
        this.onOsChange = this.onOsChange.bind(this)
        this.onSubDirChange = this.onSubDirChange.bind(this)
        // Symbol upload
        this.uploadSymbolTable = this.uploadSymbolTable.bind(this)
        this.uploadChunk = this.uploadChunk.bind(this)
        // Pop-up functions
        this.buildInfoPopUp = buildInfoPopUp.bind(this)
        this.showInfoPopUp = showInfoPopUp.bind(this)
    }

    // Set sub dir
    onSubDirChange = event => { 
        this.setState({ windowsSubDir: event.target.value });
    }

    // Update OS
    onOsChange = event => { 

        if (event.target.value === "windows") {
            $("#windows-sub-dir-dropdown").css("display", "block") // Show sub dir dropdown
            this.setState({ os: event.target.value });
        } 
        else { // If linux or other
            $("#windows-sub-dir-dropdown").hide()
            this.setState({ os: event.target.value, windowsSubDir: null });  
        }
    };

    // Set symbol file location
    onFileChange = event => { 
        // Update name of file
        this.setState({ symbolTable: event.target.files[0] }); 
    };

    // Display upload progress bar to user
    async progressBar (currentChunk, lastChunk) {
        var width = (currentChunk / lastChunk) * 100
        $("#bar").css("width", width + "%");
        $("#bar-text").text(width.toFixed(2) + "%");
        if($("#progress-bar-container").css("display") == "none") {
            $("#progress-bar-container").css("display", "block")
        }
        if (currentChunk === lastChunk) { // Hide progress bar after upload is complete
            this.showInfoPopUp("File: " + this.state.symbolTable.name + " uploaded", "#5DD55D", false)
            setTimeout( function() {
                $("#bar").css("width", "0%")
                $("#progress-bar-container").css("display", "none")
            }, 3000);
        }
    }

    // Send symbol file in chunks to back end
    async uploadSymbolTable(ev) {
        ev.preventDefault();
        if (this.state.symbolTable == null) {
            this.showInfoPopUp("Select ISF to upload", "#FF4D4D", false)
            return;
        }
        if (this.state.os == null) {
            this.showInfoPopUp("Select operating system", "#FF4D4D", false)
            return;
        }
        var start = 0;
        var end = this.state.chunkSize;
        var file = this.state.symbolTable
        var total = file.size
        var system = this.state.os;
        var requestsCounter = Math.ceil(total / this.state.chunkSize) // Calculate how many requests have to be made
        var url = "http://autovola.com:8080/api/v1/upload/symbols/"
        var blob = file.slice(start, end);
        var file_id = new Date().getTime()
        var data = new FormData();
        if (system === "windows") { // Add user selected Windows directory to form
            if (this.state.windowsSubDir == null) {
                this.showInfoPopUp("Select Windows sub dir", "#FF4D4D", false)
                return;
            }
            data.set('windir', this.state.windowsSubDir);
        }
        data.set('last_chunk', requestsCounter);
        data.set('file_id', file_id);
        data.set('system', system);
        data.set('filename', file.name);

        for (var i = 1; i <= requestsCounter; i++) { // send file in chunks one by one to back end
            blob = file.slice(start, end)
            data.set('chunk', blob);
            data.set('current_chunk', i);
            if (this.uploadChunk(data, file, url) !== true) { // chunk upload fails
                this.showInfoPopUp("Failed to send " + file.name, "#FF4D4D", false)
                break;
            }
            start = start + this.state.chunkSize; // Calculate next chunk starting point
            end = start + this.state.chunkSize; // Calculate next chunk ending point
            this.progressBar(i, requestsCounter);
        }
    };

    // Upload file in chunks to back end
    uploadChunk(data, file, url) {
        var proceed = true // false = file upload is stopped / true = keep uploading
        $.ajax({
            contentType: false,
            processData: false,
            cache: false,
            enctype: 'multipart/form-data',
            headers: {'Access-Control-Allow-Origin': '*' },
            url: url,
            retryLimit : 3, // How many times Fail response can be received before stopping upload
            tryCount: 0,
            type: "POST", 
            data: data,
            async: false,
            complete: function(data, textStatus, jqXHR){
                try {
                    if (data.responseJSON.response === "Fail") { // If fail is received too many times, upload is cancelled
                        this.tryCount++;
                        if (this.tryCount <= this.retryLimit) { // Try few times again
                            $.ajax(this);
                            proceed = true;
                        }
                        proceed = false;
                    }
                    else if (data.responseJSON.response === "Done") { // Upload is complete
                        console.log("File: " + file.name + " uploaded")
                    }
                    else if (data.responseJSON.response === "OK") { // OK received -->  upload can continue by setting proceed to true
                        proceed = true;
                    }
                    else { // Something else was returned
                        console.log("Response from server: " + String(data.responseJSON.response))
                    }
                } catch(err) {
                    proceed = false;
                }
            },
        })
        return proceed;
    };

    render() {
        return (
            <div id="container">
                {this.buildInfoPopUp()}
                <form method="post" id="data" encType="multipart/form-data" onSubmit={this.uploadSymbolTable}>
                    <h1>Choose ISF to upload</h1>
                    <div className="input-container">  
                        <input type="file" id="symbol-table" name="symbol-table" onChange={this.onFileChange}></input>
                    </div>
                    <select name="os" id="os-dropdown" onChange={this.onOsChange} value={this.state.os}>
                        <option disabled> Select OS </option>
                        <option value="linux">Linux</option>
                        <option value="windows">Windows</option>
                    </select>
                    <select name="windows-sub-dir" id="windows-sub-dir-dropdown"  value={this.state.windowsSubDir} onChange={this.onSubDirChange}>
                        <option disabled> Select Windows sub directory </option>
                        <option value="ntkrnlmp.pdb">ntkrnlmp.pdb</option>
                        <option value="ntkrnlpa.pdb">ntkrnlpa.pdb</option>
                        <option value="ntkrpamp.pdb">ntkrpamp.pdb</option>
                        <option value="ntoskrnl.pdb">ntoskrnl.pdb</option>
                    </select>
                    <button id="upload-btn"> Upload </button>
                </form>
                <div id="progress-bar-container">
                    <div id="bar"></div>
                    <p id="bar-text"></p>
                </div>
                <div id="manual">
                    <h2>Usage</h2>
                    <p>Intermediate symbol files (ISF) are stored as JSON, so when uploading symbol file make sure that the file has .json extension. Alternatively GZIP and XZ compressed JSON files are accepted, so if the symbol file is compressed it should be given corresponding extension .json.gz or .json.xz.</p>
                    <p>It is good practice to test the symbol file locally before uploading it to Autovola. You can achieve this by following these steps in LINUX system (Steps are similar for Windows, but paths and commands are bit different):</p>
                    <p>1. Move the file to <span style={{color: "CornflowerBlue"}}>(top-level Volatility path)/volatility3/framework/symbols/(windows or linux)/filename.json</span> </p>
                    <p>2. Remove Volatility cache for user running the plugin <span style={{color: "grey"}}>rm ~/.cache/volatility3/*</span></p>
                    <p>3. Then use either Volatility Linux or Windows plugin to dump and check that no symbol table or translation layer requirement errors are seen. <b>NOTE:</b> For windows dumps Volatility tries to automatically download corresponding PDB file from Microsoft's Symbol Server as stated in Windows section, so the manually added symbol file may not be correct.</p>
                    <h3>Windows</h3>
                    <p>Autovola contains these Windows symbol files for default <a href="https://downloads.volatilityfoundation.org/volatility3/symbols/windows.zip">windows.zip</a>.</p>
                    <p>Volatility tries to automatically download PDB file from Microsoft’s Symbol Server if appropriate symbol file is not found locally. If Autovola is not connected to internet, symbol file can be created manually.</p>
                    <p>For windows symbol tables, volatility uses <span style={{color: "green"}}>&lt;pdb-name&gt;/&lt;GUID&gt;-&lt;AGE&gt;.json</span> naming convention.</p>
                    <p>These JSON files can be constructed from PDB-files using Volatility 3 tool called pdbconv.py. It can be run directly from top-level Volatility path by using command <span style={{color: "grey"}}>PYTHONPATH="." python volatility3/framework/symbols/windows/pdbconv.py</span></p>
                    <p>Autovola supports uploading of pdbconv.py converted ntkrnlmp.pdb, ntkrnlpa.pdb, ntkrpamp.pdb and ntoskrnl.pdb files. When uploading ISF processed by pdbconv, remember to select the right sub directory or Volatility is not able to find the ISF.</p>
                    <h4>Windows version 20H2 build 19042.804 example</h4>
                    <ol>
                        <li>Start by cloning Volatility 3 by running <b>git clone https://github.com/volatilityfoundation/volatility3</b>. Install Volatility 3 python package by running <b>python3 setup.py install</b> in Volatility 3 base folder.</li>
                        <li>Download <a style={{"textAlign": "left"}} href="https://github.com/rajkumar-rangaraj/PDB-Downloader/releases/download/v1.0/PDBDownloader.exe">PDBDownloader.exe</a>. PDB Downloader is used to get symbol files for specific libraries from Microsoft’s Symbol Server.</li>
                        <li>Start PDB Downloader and click button <b>Open File(s)</b>.</li>
                        <li>Select <b>C:\Windows\System32\ntoskrnl.exe</b> and press start on PDB Downloader. PDB Downloader should download the right PDB file somewhere under C:\Symbols and open file explorer in C:\Symbols.</li>
                        <li>There should be a directory called ntkrnlmp.pdb and inside that is directory 5278AFF86C341677D7D7835C85B7B8441 (GUID), which contains PDB file ntkrnlmp.pdb. Save this file for Volatility's pdbconv.</li>
                        <li>(For Linux) Go to Volatility3 base directory and run <b>python3 volatility3/framework/symbols/windows/pdbconv.py -f ~/ntkrnlmp.pdb</b>. -f flag specifies the PDB file location. In this example it is user's home directory.</li>
                        <li>Volatility creates ISF in base folder with name similar to this: 5278AFF86C341677D7D7835C85B7B844-5.json.xz. <b>Do not change the file name!</b> Now upload that ISF to Autovola by setting OS to Windows and Windows Sub Directory to <b>ntkrnlmp.pdb</b></li>
                        <li>Now Volatility should be able to analyse all dumps taken from Windows systems similar to this.</li>
                    </ol>
                    <h3>Linux</h3>
                    <p>All Linux symbol files have to be created manually due to large amount of kernel versions and different distributions that get frequently updated.</p>
                    <p>Volatility foundation offers GO written tool called <a href="https://github.com/volatilityfoundation/dwarf2json">dwarf2json</a> for this purpose. Tool can be used to create ISF (Intermediate Symbol File) JSON file, which serves as proper symbol file for Linux and MacOS's.</p>
                    <p>dwarf2json has good documentation of how to create proper symbol file for Linux. Easiest way is to use kernel debug symbol file to generate ISF from Linux system, from which the dump is created from.</p>
                    <p>If kernel debug symbol file is not available and you are experiencing difficulties trying to generate proper ISF, there is also <a href="https://github.com/volatilityfoundation/dwarf2json/tree/linux-module-method">linux-module-method</a> branch, which offers alternative way to create ISF.</p>
                    <h3>Helpful links</h3>
                    <ul>
                        <li><a style={{"textAlign": "left"}} href="https://github.com/volatilityfoundation/volatility3">Volatility 3 GitHub page</a></li>
                        <li><a style={{"textAlign": "left"}} href="https://volatility3.readthedocs.io/en/latest/symbol-tables.html">Official Volatility foundation symbol file creation documentation</a></li>
                        <li><a style={{"textAlign": "left"}} href="https://docs.microsoft.com/en-us/archive/blogs/webtopics/pdb-downloader">Microsoft documentation of PDB Downloader</a></li>
                    </ul>
                </div>
            </div>
        );
    }
}

export default SymbolUpload;
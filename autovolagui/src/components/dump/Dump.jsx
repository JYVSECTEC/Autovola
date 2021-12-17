import $ from "jquery";
import React from "react";
import "../Upload.css";
import {buildInfoPopUp, showInfoPopUp} from "../app/Utils.js";

class DumpUpload extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            dump: null,
            os: "windows",
            description: "",
            chunkSize : 5000000
        }
        // State change
        this.onDescriptionChange = this.onDescriptionChange.bind(this)
        this.onFileChange = this.onFileChange.bind(this)
        this.onOsChange = this.onOsChange.bind(this)
        // Dump upload 
        this.uploadDump = this.uploadDump.bind(this)
        this.uploadChunk = this.uploadChunk.bind(this)
        this.progressBar = this.progressBar.bind(this)
        // Pop-up 
        this.buildInfoPopUp = buildInfoPopUp.bind(this)
        this.showInfoPopUp = showInfoPopUp.bind(this)
    }

    // Updates description-state to current textarea value
    onDescriptionChange = event => {
        this.setState({ description: event.target.value }); 
    }

    // Updates os-state to current os-select value
    onOsChange = event => { 
        this.setState({ os: event.target.value }); 
    };

    // Updates dump-state to currently chosen dump
    onFileChange = event => { 
        this.setState({ dump: event.target.files[0] });  
    };

    // Progress bar
    async progressBar (currentChunk, lastChunk) {
        var width = (currentChunk / lastChunk) * 100
        $("#bar").css("width", width + "%");
        $("#bar-text").text(width.toFixed(2) + "%");
        if($("#progress-bar-container").css("display") == "none") {
            $("#progress-bar-container").css("display", "block")
        }
        if (currentChunk === lastChunk) {
            this.showInfoPopUp("File: " + this.state.dump.name + " uploaded", "#5DD55D", false)
            setTimeout( function() {
                $("#bar").css("width", "0%")
                $("#progress-bar-container").css("display", "none")
            }, 3000);
        }
    }

    // Send dump in chunks to back end
    async uploadDump(ev) {
        ev.preventDefault();
        if (this.state.dump == null) {
            this.showInfoPopUp("Select dump to upload", "#FF4D4D", false)
            return;
        }
        if (this.state.os == null) {
            this.showInfoPopUp("Select operating system", "#FF4D4D", false)
            return;
        }
        var start = 0;
        var end = this.state.chunkSize;
        var file = this.state.dump;
        var total = file.size; // Get file size 
        var system = this.state.os;
        var description = this.state.description;
        var requestsCounter = Math.ceil(total / this.state.chunkSize) // Calculate how many requests have to be made
        var url = "http://autovola.com:8080/api/v1/upload/dump/"
        var blob = file.slice(start, end);
        var file_id = new Date().getTime()
        var data = new FormData();
        data.set('last_chunk', requestsCounter);
        data.set('file_id', file_id);
        data.set('system', system);
        data.set('filename', file.name);
        data.set('description', description);

        for (var i = 1; i <= requestsCounter; i++) { // send file in chunks one by one to server
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

    // Upload dump in chunks to back end
    uploadChunk(data, file, url) {
        var proceed = true // false = file upload is stopped / true = keep uploading
        $.ajax({
            contentType: false,
            processData: false,
            cache: false,
            enctype: 'multipart/form-data',
            headers: {'Access-Control-Allow-Origin': '*' },
            url: url,
            tryCount : 0,
            retryLimit : 3,
            type: "POST", 
            data: data,
            async: false,
            complete: function(data, textStatus, jqXHR){
                try {
                    if (data.responseJSON.response === "Fail") { // If fail is received too many times, upload is cancelled
                        this.tryCount++;
                        if (this.tryCount <= this.retryLimit) {
                            $.ajax(this);
                            proceed = true;
                        }
                        proceed = false;
                    }
                    else if (data.responseJSON.response === "Done") { // Upload is complete
                        console.log("File: " + file.name + " uploaded")
                    }
                    else if (data.responseJSON.response === "OK") { // OK received -->  upload can continue
                        proceed = true;
                    }
                    else { // Something else was returned
                        console.log("Server returned: " + String(data.responseJSON.response))
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
                <form method="post" id="data" encType="multipart/form-data" onSubmit={this.uploadDump}>
                    <h1>Choose memory dump to upload</h1>
                    <div className="input-container">  
                        <input type="file" id="dump" name="dump" onChange={this.onFileChange}></input>
                    </div>
                    <select name="os" id="os-dropdown" onChange={this.onOsChange} value={this.state.os}>
                        <option disabled> Select OS</option>
                        <option value="linux">Linux</option>
                        <option value="windows">Windows</option>
                    </select>
                    <div id="description-container">
                        <textarea type="text" id="description" name="description" placeholder="Add description (Optional)" onChange={this.onDescriptionChange}></textarea>
                    </div>
                    <button id="upload-btn"> Upload </button>
                </form>
                <div id="progress-bar-container">
                    <div id="bar"></div>
                    <p id="bar-text"></p>
                </div>
                <div id="manual">
                    <h2>Usage</h2>
                    <p>Select dump you want to analyse and choose operating system from which the dump was taken from.</p>
                    <p>In the description field you can write notes about the dump. Description can be modified later at any time.</p>
                    <p>This version of Autovola supports analysis of Windows and Linux dumps.</p>
                    <p>During the upload, page will be unresponsive.</p>
                    <p><b>Known issues:</b> Progress bar may not be visible with Chrome browsers when uploading dump.</p>
                </div>
            </div>
        );
    }
}

export default DumpUpload;
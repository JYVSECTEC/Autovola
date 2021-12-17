import $ from "jquery";
import React from "react";
import ReactDOM from 'react-dom';
import LinuxDetails from "./details/linux/LinuxDetails";
import WindowsDetails from "./details/windows/WindowsDetails";
import {buildInfoPopUp, showInfoPopUp, pluginInfo, infoBox, DOMParserInfoBox} from "../app/Utils.js";
import {reportSearch, processFilters, filterSearch, checkReports, removeFilters} from "./Search.js";
import { reportsSearchUsage, reportsUsage, pluginSelectImages } from "./Usage.js";
import "./Reports.css";
import { plugins as windowsPlugins } from "./details/windows/Plugins";
import { plugins as linuxPlugins } from "./details/linux/Plugins";

class Reports extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            basicLinuxData: [], // Contains general information of each linux dump
            basicWindowsData: [], // Contains general information of each windows dump
            analyzeMode: false, // false: no specific dump is being analysed - true: dump is being analysed
            analysedDump: [], // Analysed dump data
            analysedDumpOS: null, // Analysed dump OS
            tagColor: "#F68B8B", // Current tagColor
            search: "" // Contains search filters
        };

        // Building blocks for reports and columns
        this.buildLinuxReports = this.buildLinuxReports.bind(this);
        this.buildWindowsReports = this.buildWindowsReports.bind(this);
        this.buildResultsColumns = this.buildResultsColumns.bind(this);
        this.DOMParserInfoBox = DOMParserInfoBox.bind(this);
        this.pluginInfo = pluginInfo.bind(this);
        this.infoBox = infoBox.bind(this);
        // Get report / reports
        this.getReports = this.getReports.bind(this);
        // Search functions
        this.reportSearch = reportSearch.bind(this);
        this.processFilters = processFilters.bind(this);
        this.filterSearch = filterSearch.bind(this);
        this.checkReports = checkReports.bind(this);
        this.removeFilters = removeFilters.bind(this);
        // Pop-up functions
        this.buildInfoPopUp = buildInfoPopUp.bind(this);
        this.showInfoPopUp = showInfoPopUp.bind(this);
        // Plugin select functions
        this.buildPluginSelectBox = this.buildPluginSelectBox.bind(this);
        this.selectAllPlugins = this.selectAllPlugins.bind(this);
        this.runPlugins = this.runPlugins.bind(this);
        this.getPluginRunStatus = this.getPluginRunStatus.bind(this);
        // Editbox functions
        this.buildEditBox = this.buildEditBox.bind(this);
        this.updateDumpData = this.updateDumpData.bind(this);
        // Tag functions
        this.chooseTagColor = this.chooseTagColor.bind(this);
        this.addTag = this.addTag.bind(this);
        this.buildTags = this.buildTags.bind(this);
        this.removeTag = this.removeTag.bind(this);
        this.tagToSearch = this.tagToSearch.bind(this);
        // Delete functions
        this.buildDeleteBox = this.buildDeleteBox.bind(this);
        this.deleteDumpData = this.deleteDumpData.bind(this);
        this.displayCheckBox = this.displayCheckBox.bind(this);
        // Analyse functions
        this.StartAnalyzeMode = this.StartAnalyzeMode.bind(this);
        //this.analyzeModeState = this.analyzeModeState.bind(this);
        this.returnFromAnalysis = this.returnFromAnalysis.bind(this);
    }

    // When component mounts for the first time, it tries to contact DB through Flask API and get basic data from all Linux and Windows dumps
    componentDidMount() {
        this._isMounted = true;
        // If Linux or Windows data state is empty, get reports 
        if ((!this.state.basicLinuxData.length || !this.state.basicWindowsData.length) && this.state.analyzeMode === false) { 
            var linuxData = this.getReports("linux");
            var windowsData = this.getReports("windows");
            // All the dumps basic data is put into these states
            this.setState({basicLinuxData: linuxData, basicWindowsData: windowsData}, function() {
                console.log("+ Basic data from dumps retrieved")
            });
        }
        else if (this.state.analyzeMode === false) { // If no specific dump is being analysed
            var results = this.buildWindowsReports();
            results.push(this.buildLinuxReports())
            ReactDOM.render(results, document.getElementById('results'))
        }
    }
    
    // Whenever a component gets updated it renders the basic data from dumps if no dump is being analyzed
    componentDidUpdate () {
        if (this.state.analyzeMode === false) {
            $("#loading-reports").show()
            var results = [];
            results.push(this.buildWindowsReports());
            results.push(this.buildLinuxReports())
            if (results != undefined) {
                $("#loading-reports").hide()
                ReactDOM.render(results, document.getElementById('results'))
            }
            $("#loading-reports").hide()
        }
    }

    // Sets analyseMode state
    StartAnalyzeMode(evt, os, mode) {

        // analyzeMode-state is set to true
        // chosen dump data is retrieved from DB (evt.target.name is the ID used to get specific dumb data from DB)
        var dumpData = this.getReports(os, evt.target.name);
        // Update states with dump's data and set analyseMode to true 
        this.setState({analyzeMode: mode, analysedDump: dumpData, analysedDumpOS: os}); 
    }

    // Sets tagColor state
    tagColorState(color) {
        this.setState({tagColor: color})
    }

    // Builds columns for linux and windows reports
    buildResultsColumns () {
        const items  = [];
        // If a dump is being analyzed, this will not be rendered
        var searchName = "search"
        var nameResults = "left-column"

        if (this.state.analyzeMode === false) {
            items.push(
                <div id="page-box">
                    {this.buildInfoPopUp()}
                    <form id="reports-search-container" onSubmit={(evt) => { evt.preventDefault(); this.setState({search: $('[name="search"]')[0].value})}}>
                        <button className="search-btn" onClick={() => this.setState({search: $('[name="search"]')[0].value})}> Search </button>
                        <input type="text" className="search-field" name="search"></input>
                        <img id="loading-reports" src="images/plugin-loading.gif" />
                        <img src="images/plugin-info.png" name={searchName} id="info-button" onClick={() => this.pluginInfo(searchName)} />
                        {this.DOMParserInfoBox(searchName, reportsSearchUsage, "Search how-to")}
                    </form>
                    <div id="results-container">
                        <div className="results-columns">
                            <ul id="columns">
                                <li id="column" className="left-column">
                                    <img src="images/plugin-info-white.png" name={nameResults} id="info-button" onClick={() => this.pluginInfo(nameResults)} />
                                    {this.DOMParserInfoBox(nameResults, reportsUsage, "Reports usage")}
                                </li>
                                <li id="column">Name</li>
                                <li id="column">Description</li>
                                <li id="column">OS</li>
                                <li id="column">Type</li>
                                <li id="column">Date</li>
                                <li id="column" className="tags">Tags</li>
                            </ul>
                        </div>
                        <div id="results">
                        </div>
                    </div>
                </div>
            )
        }
        return items;
    }

    // Builds edit-box for each dump
    buildEditBox (db_id, name, description, os, tags) {
        if (name == null) {
            name = ""
        }
        if (description == null) {
            description = ""
        }

        const items = [];
        items.push(
            <div id="edit-box" name={db_id} style={{display : "none"}} key={"edit-box" + db_id}> 
                <div id="edit-box-header" key={"edit-box-header" + db_id}>
                    <p>Update visible data and add tags</p>
                    <img id="close-button" src="images/close-red.png" name={db_id} onClick={(evt) => this.displayCheckBox(evt, "#edit-box")}/>
                </div>
                <div id="data-edit-block" key={"edit-box-block" + db_id + 1}>
                    <p id="title">Change name:</p>
                    <input type="text" id="edit-field" className="name-edit-field" name={db_id} placeholder={name}></input>
                    <button id="edit-button" onClick={(evt) => this.updateDumpData(evt, db_id, os, "name", $("[name='" + db_id +  "'].name-edit-field").val())}> Change </button>
                </div>
                <div id="data-edit-block" key={"edit-box-block" + db_id + 2}>
                    <p id="title">Change description:</p>
                    <textarea type="text" id="edit-field" className="description-edit-field" name={db_id} placeholder={description}></textarea>
                    <button id="edit-button" onClick={(evt) => this.updateDumpData(evt, db_id, os, "description", $("[name='" + db_id +  "'].description-edit-field").val())}> Update </button>
                </div>
                <div id="data-edit-block" key={"edit-box-block" + db_id + 3}>
                    <p id="title">Current tags:</p>
                    <div id="current-tags" key={"currenttags" + db_id}>
                        {this.buildTags(db_id, os, tags)}
                    </div>
                </div>
                <div id="data-edit-block" key={"edit-box-block" + db_id + 4}>
                    <p id="title">Add tag:</p>
                    <input type="text" id="edit-field" className="tag-edit-field" name={db_id}></input>
                    <ul id="tag-colors">
                        <li id="tag-color" className="red" alt="#F68B8B" onClick={(evt) => this.chooseTagColor(evt)}></li>
                        <li id="tag-color" className="green" alt="#CDFF8E" onClick={(evt) => this.chooseTagColor(evt)}></li>
                        <li id="tag-color" className="blue" alt="#62B3FD" onClick={(evt) => this.chooseTagColor(evt)}></li>
                        <li id="tag-color" className="orange" alt="#FFC188" onClick={(evt) => this.chooseTagColor(evt)}></li>
                        <li id="tag-color" className="purple" alt="#EE84FF" onClick={(evt) => this.chooseTagColor(evt)}></li>
                        <li id="tag-color" className="yellow" alt="#F9DC45" onClick={(evt) => this.chooseTagColor(evt)}></li>
                        <li id="tag-color" className="turquoise" alt="#A1FFE9" onClick={(evt) => this.chooseTagColor(evt)}></li>
                    </ul>
                    <button id="edit-button" className="color-add" onClick={(evt) => this.addTag(evt, db_id, os, "tags", tags, $("[name='" + db_id +  "'].tag-edit-field").val())}> Add </button>
                </div>
            </div>
        )
        return items;
    }

    // Changes picked tag color border to red and updates tagColor-state
    chooseTagColor (evt) {
        var color = evt.target.attributes.alt.value; // color is taken from selected #tag-color alt-attribute
        var cls = evt.target.className;
        $("[id=tag-color]").css("border", "1px black solid") // All #tag-color elements are given black borders
        $("#tag-color." + cls).css("border", "2px red solid") // Selected color is given red border for clarity
        this.tagColorState(color) // tagColor-state is updated with the new color
    }

    // Newly created tag is appended to existing tags and send to database
    addTag (evt, db_id, os, target, tags, newTag) {

        // If no tags yet exist, object is created for them
        if (tags == null) {
            tags = {};
        }
        // Else stringified JSON is parsed to object containing current tags
        else {
            tags = JSON.parse(tags)
        }
        // New tag is added and object containing all tags is send to database
        tags[newTag] = this.state.tagColor;
        this.updateDumpData(evt, db_id, os, target, JSON.stringify(tags))
        // Get os dump reports again so DOM will be updated with the new tag
        if (os === "linux") {
            var linuxData = this.getReports("linux");
            this.setState({basicLinuxData: linuxData}, function() {
                $("[id=tag-color]").css("border", "1px black solid")
                $("#tag-color.red").css("border", "2px red solid")
                this.setState({tagColor: "#F68B8B"}) // tagColor-state is set back to default color
            });
        }
        else if (os === "windows") {
            var windowsData = this.getReports("windows");
            this.setState({basicWindowsData: windowsData}, function() {
                $("[id=tag-color]").css("border", "1px black solid")
                $("#tag-color.red").css("border", "2px red solid")
                this.setState({tagColor: "#F68B8B"}) // tagColor-state is set back to default color
            });
        }
    }

    // Selected tag is removed by deleting it from database
    removeTag (evt, tags, db_id, os, target) {
        var tag = evt.target.attributes.name.value; // #remove-tag element attribute contains the tag key to delete
        // Tag is removed and object containing remaining tags is send to database
        delete tags[tag]
        this.updateDumpData(evt, db_id, os, target, JSON.stringify(tags))
        // Get os dump reports again so the tag will be removed from DOM
        if (os === "linux") {
            var linuxData = this.getReports("linux");
            this.setState({basicLinuxData: linuxData});
        }
        else if (os === "windows") {
            var windowsData = this.getReports("windows");
            this.setState({basicWindowsData: windowsData});
        }
    }
    // Builds current tags for dump
    buildTags (db_id, os, tags) {
        // If no tags are found
        if (tags == null) {
            return "";
        }
        // tags-variable is stringified so it is parsed to object
        const items = [];
        tags = JSON.parse(tags)
        for (var tag in tags) { // Each tag is pushed to array
            items.push(
                <div id="tag-block" style={{"background-color": tags[tag]}} key={tag + db_id}>
                    <div id="tag-text" onClick={(evt) => this.tagToSearch(evt)} key={tag + db_id}>{tag}</div>
                    <img id="remove-tag" src="images/close-grey.png" name={tag} onClick={(evt) => this.removeTag(evt, tags, db_id, os, "tags")} key={tag + db_id}/>
                </div>
            )
        }
        return items;
    }

    // When user clicks tag, update search value with the tag value
    tagToSearch (evt) {
        let tagValue = evt.target.innerHTML;
        $(".search-field").val(tagValue)
    }

    // Updates document value in selected MongoDB table
    updateDumpData (evt, db_id, os, target, value) {
    
        // Data is sent inside FormData-object
        var data = new FormData();
        data.set('db_id', String(db_id)); // Dump document DB ID
        data.set('os', String(os)); // Dump OS so right table will be picked in backend (linux_pluginresults or windows_pluginresults) 
        data.set('data', String(value)); // Data to update the specified table column

        $.ajax({ // Send update request to API
            contentType: false,
            processData: false,
            cache: false,
            enctype: 'multipart/form-data',
            url: "http://autovola.com:8080/api/v1/update/" + String(target) + "/", // target-variable is the column to be updated
            type: "POST",
            data: data,
            async: false,
            complete: function(json, textStatus, jqXHR){ // Update basic data state
                if (os === "linux") {
                    var linuxData = this.getReports("linux");
                    this.setState({basicLinuxData: linuxData});
                }
                else if (os === "windows") {
                    var windowsData = this.getReports("windows");
                    this.setState({basicWindowsData: windowsData});
                }
            }.bind(this)
        });
    }

    // Builds delete box and returns it
    buildDeleteBox(os, db_id) {
        const items = [];

        items.push(
            <div id="delete-dump-box" name={db_id} style={{display : "none"}} key={"delbox" + db_id}>
                <div id="delete-dump-box-header" key={"delboxheader" + db_id}>
                    <p key={"deldump" + db_id}>Delete dump</p>
                    <img key={"closedelete" + db_id} id="close-button" src="images/close-red.png" name={db_id} onClick={(evt) => this.displayCheckBox(evt, "#delete-dump-box")}/>
                </div>
                <p key={"deletecheck" + db_id}>Are you sure?</p>
                <button key={"deletepermanent" + db_id} id="delete-button" onClick={() => this.deleteDumpData(os, db_id)}> Delete </button>
            </div>
        )
        return items;
    }

    // Send request to API, so specified dump and its DB document will be removed
    deleteDumpData (os, db_id) {

        var data = new FormData();
        data.set('db_id', String(db_id)); // Dump document DB ID
        data.set('os', String(os)); // Dump OS so right table (linux_pluginresults or windows_pluginresults) and directory (symbols/linux/ or symbols/windows/) will be picked in backend 

        $.ajax({ // Send remove request to API
            contentType: false,
            processData: false,
            url: "http://autovola.com:8080/api/v1/delete/dump/",
            type: "POST",
            data: data,
            dataType: "json",
            async: false,
            complete: function(json, textStatus, jqXHR){
                data = json.responseJSON
                if (data === "Fail") {
                    showInfoPopUp("Failed to remove file and/or DB results", "#FF4D4D", true)
                }
            }
        });

        // Get reports again, so removed dump will not be shown anymore in the dump list
        if (os === "linux") {
            var linuxData = this.getReports("linux");
            this.setState({basicLinuxData: linuxData});
        }
        else if (os === "windows") {
            var windowsData = this.getReports("windows");
            this.setState({basicWindowsData: windowsData});
        }
    }

    // Used to get basic dump data from DB or all plugins data from one report (id-variable)
    // If no id is given, all chosen os data ("linux" or "windows") is retrieved from DB
    getReports(os, id = null) {
        var data = null;

        $.ajax({ 
            url: "http://autovola.com:8080/api/v1/results/"+ os + "/",
            type: "GET",
            data: {
                id: id
            },
            dataType: "json",
            contentType: 'application/javascript',
            async: false,
            complete: function(json, textStatus, jqXHR){
                data = json.responseJSON
                if (data === "Fail") {
                    showInfoPopUp("Failed to get results", "#FF4D4D", true)
                }
            }
        });
        return data;
    }

    // Starts to analyse selected dump by setting analysemode to true, getting all dump data from DB and rendering OS specific component
    showDumpDetails(evt, os) {

    }

    // Shows box if it is hidden and hides it, if it is shown
    displayCheckBox (evt, elementName, os = null) {
        
        var db_id = evt.target.attributes.name.value // Database ID is found from element name-attribute
        var element = $(elementName + "[name='" + db_id +  "']") // #edit-box corresponding to DB ID is saved

        if (element.css("display") === "none") { // If box is opened
            element.show();
            if (elementName === "#plugin-select-box") { // If plugin select box is opened
                this.getPluginRunStatus(os, db_id)
            }
        }
        else if (element.css("display") === "block") { // If box is closed
            element.hide();
        }
    }

    // Display status about plugin results in DB as image next to plugin name
    async getPluginRunStatus (os, db_id) {
        $("#plugin[name='" + db_id +"'] #plugin-run-status").attr("src", "images/plugin-loading.gif") // Set loading gif
        let reports = this.getReports(os, db_id)
        var pluginNames;
        if (os === "linux") {
            pluginNames = linuxPlugins;
        }
        else if (os === "windows") {
            pluginNames = windowsPlugins;
        }
        
        for (var plugin in pluginNames) { // Loop through plugin names
            if (plugin in reports) { // If plugin results are found from dump's data
                let pluginStatusImg = $("#plugin[name='" + db_id +"'] #plugin-run-status[name='" + plugin + "']")
                if (reports[plugin] === "ERROR" || reports[plugin] === "") { // Error has occurred when running plugin
                    pluginStatusImg.attr("src", "images/plugin-error.png")
                }
                else if (reports[plugin] === "UNSATISFIED") { // Unsatisfied requirements for plugin to run
                    pluginStatusImg.attr("src", "images/plugin-unsatisfied.png")
                }
                else if (Array.isArray(reports[plugin])) {
                    if (reports[plugin].length > 0) { // Plugin has run correctly and returned results
                        pluginStatusImg.attr("src", "images/plugin-ok.png")
                    }
                    else if (reports[plugin].length === 0) { // Plugin has most likely run correctly, but no results to display
                        pluginStatusImg.attr("src", "images/plugin-empty.png")
                    }
                }
            }
            else { // Plugin results not found from DB
                $("#plugin[name='" + db_id +"'] #plugin-run-status[name='" + plugin + "']").attr("src", "images/plugin-not-found.png")
            }
        }
    }

    // Builds plugin select box and returns it
    buildPluginSelectBox(os, db_id) {
        const items = [];
        const plugins = [];
        var pluginsToUse;
        if (os === "linux") { // Get Linux plugins
            pluginsToUse = linuxPlugins;
        } 
        else if (os === "windows") { // Get Windows plugins
            pluginsToUse = windowsPlugins;
        }

        const pluginCheckBoxes = [];
        for (let i = 0; Object.keys(pluginsToUse).length > i; i+=3) { // Create table for plugins in plugin select box
            pluginCheckBoxes.push(
                <tbody key={"tbody" + "plugincheckboxes" + db_id + i}>
                    <tr key={"tr" + "plugincheckboxes" + db_id + i}>
                        {Object.keys(pluginsToUse).slice(i, i+3).map(plugin => {
                            return (<td id="plugin" key={"plugin" + db_id + i + plugin} name={db_id}>
                                        <input type="checkbox" name={db_id} value={plugin} key={"checkbox" + db_id + i + plugin}/>
                                        <label htmlFor={db_id} key={"checkbox_label" + db_id + i + plugin}>{plugin}</label>
                                        <img id="plugin-run-status" key={"plugin-run-status" + db_id + i + plugin} name={plugin} key={i}/>
                                    </td>)
                        })}
                    </tr>
                </tbody>
            )
        }

        // Both Windows and Linux have basicdetails plugin and select all -checkbox, so we can display them in each OS plugin select box 
        plugins.push(
            <div id="plugins" name={db_id} key={"plugin-select" + db_id}>
                <table key={"table" + db_id}>
                    <tbody key={"tbody1" + db_id}>
                        <tr key={"tr1" + db_id}>
                            <td id="plugin" key={"td1" + "select-all" + db_id}>
                                <input key={"input" + "select-all" + db_id} type="checkbox" name={db_id} value="select all" onClick={() => this.selectAllPlugins(db_id)}/>
                                <label key={"label" + "select-all" + db_id} htmlFor={db_id}>Select all</label>
                            </td>
                        </tr>
                    </tbody>
                    <tbody key={"tbody2" + db_id}>
                        <tr key={"tr2" + db_id}>
                            <td id="plugin" key={"td2" + "select-all" + db_id}>
                                <input key={"input" + "basicdetails" + db_id} type="checkbox" name={db_id} value="basicdetails" />
                                <label key={"label" + "basicdetails" + db_id} htmlFor={db_id}>basicdetails</label>
                                <img key={"img" + "basicdetails" + db_id} id="plugin-run-status" name="basicdetails" />
                            </td>
                        </tr>
                    </tbody>
                    {pluginCheckBoxes}
                </table>
            </div>
        )

        // Create the actual box and put plugins inside it
        items.push(
            <div id="plugin-select-box" name={db_id} style={{display : "none"}} key={"pluginselectbox" + db_id}>
                <div id="select-plugins-box-header" key={"pluginselectboxheader" + db_id}>
                    <p key={"pluginselection" + db_id}>Plugin selection</p>
                    <img key={"icons-meaning" + db_id} src="images/plugin-info-white.png" name="icons-meaning" id="info-button" onClick={() => this.pluginInfo("icons-meaning")} />
                    {this.DOMParserInfoBox("icons-meaning", pluginSelectImages)}
                    <img key={"closeplugselect" + db_id} id="close-button" src="images/close-red.png" name={db_id} onClick={(evt) => this.displayCheckBox(evt, "#plugin-select-box", os)}/>
                </div>
                <h3 key={"selectrun" + db_id}>Select plugins to run</h3>
                {plugins}
                <button id="run-plugins-button" name={db_id} onClick={() => this.runPlugins(os, db_id)}> Run plugins </button>
            </div>
        )
        return items;
    }

    // Make all checkboxes selected or deselected in plugin select
    selectAllPlugins(db_id) {
        $("input[type=checkbox][name='" + db_id +  "']").each(function() {
            if(this.checked) {
                // Iterate each checkbox
                $(':checkbox').each(function() {
                    this.checked = true;                        
                });
            } else {
                $(':checkbox').each(function() {
                    this.checked = false;                       
                });
            }
        })
    }

    // Send user selected plugins and target dump DB ID to backend so they can be run
    runPlugins (os, db_id) {
        var pluginList = [];
        // Gather plugins that are selected
        pluginList = $("input[type=checkbox][name='" + db_id +  "']:checked").map(function() {
            return $(this).val();
        }).get();
        pluginList = pluginList.filter(e => e !== "select all") // Remove "select all"

        // Data is sent inside FormData-object
        var data = new FormData();
        data.set('db_id', String(db_id)); // Dump document DB ID
        data.set('os', String(os)); // Dump OS so right table will be picked in backend (linux_pluginresults or windows_pluginresults)
        data.set('plugins', pluginList);

        $.ajax({ // Send plugin run request to API
            contentType: false,
            processData: false,
            cache: false,
            enctype: 'multipart/form-data',
            url: "http://autovola.com:8080/api/v1/run/plugins/",
            type: "POST",
            data: data,
            async: false,
            complete: function(json, textStatus, jqXHR){
                var data = json.responseJSON
                $("#plugin-select-box[name='" + db_id +  "']").hide() // Hide plugin select box
                $("input[type=checkbox][name='" + db_id +  "'][value='select all']").prop('checked', false)
                this.selectAllPlugins(db_id) // Make all plugins deselected
                showInfoPopUp("Running plugins: " + pluginList, "#5DD55D", true)
            }.bind(this)
        });
    }

    // Renders Linux reports inside #results element
    buildLinuxReports() {

        var osName = "linux";
        var linuxData = this.reportSearch(this.state.basicLinuxData, this.state.search, osName); // Filter dumps that will be rendered to report list
        const items = [];

        if (linuxData == null) {
            return;
        }
  
        // loops through all linux dumps
        for (let i = 0; i < Object.keys(linuxData).length; i++) {
            // If linux header takes too much space its text is shrinked
            try {
                let os_length = linuxData[i].os_info.length
                var os_styles = {}
                if (os_length < 40)
                    os_styles = {"font-size" : "20px"};
                else if (os_length > 40 && os_length < 250)
                    os_styles = {"font-size" : "18px"};
            }     
            catch (error) {}
            // Builds the report block for specific dump
            items.push(
                <ul id="linux-data-container" key={"linux-data-container" + linuxData[i]._id + i}>
                    <li id="data-block" className="button-block" key={"button-block" + linuxData[i]._id + i}>
                        <input className="analyze-button"  type="image" src="images/analyze.png" alt="Analyze" name={linuxData[i]._id} onClick={(evt) => this.StartAnalyzeMode(evt, "linux", true)}  key={"analyze-button" + linuxData[i]._id + i}/>
                        <input className="plugin-display-button" type="image" src="images/select-plugins.png" alt="plugins" name={linuxData[i]._id} onClick={(evt) => this.displayCheckBox(evt, "#plugin-select-box", osName)} key={"plugin-display-button" + linuxData[i]._id + i}/>
                        {this.buildPluginSelectBox(osName, linuxData[i]._id)}
                        <input className="edit-dump-data-button" type="image" src="images/edit.png" alt="edit-dump-data" name={linuxData[i]._id} onClick={(evt) => this.displayCheckBox(evt, "#edit-box")} key={"edit-dump-data-button" + linuxData[i]._id + i}/>
                        {this.buildEditBox(linuxData[i]._id, linuxData[i].name, linuxData[i].description, osName, linuxData[i].tags)}
                        <input className="delete-dump-check-button" type="image" src="images/delete.png" alt="delete" name={linuxData[i]._id} onClick={(evt) => this.displayCheckBox(evt, "#delete-dump-box")} key={"delete-dump-check-button" + linuxData[i]._id + i}/>
                        {this.buildDeleteBox(osName, linuxData[i]._id)}
                    </li>
                    <li id="data-block" key={1 + linuxData[i]._id + i}> {linuxData[i].name == null ? "-" : linuxData[i].name} </li>
                    <li id="data-block" key={2 + linuxData[i]._id + i}> {linuxData[i].description == null ? "-" : linuxData[i].description} </li>
                    <li id="data-block" key={3 + linuxData[i]._id + i}  style={os_styles}>{linuxData[i].os_info == null ? "-" : linuxData[i].os_info}</li>
                    <li id="data-block" key={4 + linuxData[i]._id + i}>-</li>
                    <li id="data-block" key={5 + linuxData[i]._id + i}>{linuxData[i].currenttime == null ? "-" : linuxData[i].currenttime}</li>
                    <li id="data-block" key={6 + linuxData[i]._id + i} className="tags-block"> {this.buildTags(linuxData[i]._id, osName ,linuxData[i].tags)}</li>
                </ul>
            )
        }
        return items;
    }

    // Renders Windows reports inside #results element
    buildWindowsReports() {

        var osName = "windows"
        var windowsData = this.reportSearch(this.state.basicWindowsData, this.state.search, osName); // Filter dumps that will be rendered to report list
        const items = [];
        // loops through all Windows dumps
        if (windowsData == null) {
            return;
        }

        for (let i = 0; i < Object.keys(windowsData).length; i++) {
            // Checks if os version details found from dump
            var osData = ""
            try {
                osData = windowsData[i].os_info.ProductType + " " + windowsData[i].os_info["NtMajorVersion"] + "." + windowsData[i].os_info["NtMinorVersion"]
            }
            catch (err) {
                osData = "-"
            }
            // Checks if operating system found from dump
            var os = ""
            try {
                os = windowsData[i].os_info.os
            }
            catch (err) {
                os = "-"
            }
            // Builds the report block for specific dump
            items.push(
                <ul id="windows-data-container" key={"windows-data-container" + windowsData[i]._id + i}>
                    <li id="data-block" className="button-block" key={"button-block" + windowsData[i]._id + i}>
                        <input className="analyze-button" type="image" src="images/analyze.png" alt="Analyze" name={windowsData[i]._id} onClick={(evt) => this.StartAnalyzeMode(evt, "windows", true)} key={"analyze-button" + windowsData[i]._id + i}/>
                        <input className="plugin-display-button" type="image" src="images/select-plugins.png" alt="plugins" name={windowsData[i]._id} onClick={(evt) => this.displayCheckBox(evt, "#plugin-select-box", osName)} key={"plugin-display-button" + windowsData[i]._id + i}/>
                        {this.buildPluginSelectBox(osName, windowsData[i]._id)}
                        <input className="edit-dump-data-button" type="image" src="images/edit.png" alt="edit-dump-data" name={windowsData[i]._id} onClick={(evt) => this.displayCheckBox(evt, "#edit-box")} key={"edit-dump-data-button" + windowsData[i]._id + i}/>
                        {this.buildEditBox(windowsData[i]._id, windowsData[i].name, windowsData[i].description, osName, windowsData[i].tags)}
                        <input className="delete-dump-check-button" type="image" src="images/delete.png" alt="delete" name={windowsData[i]._id} onClick={(evt) => this.displayCheckBox(evt, "#delete-dump-box")} key={"delete-dump-check-button" + windowsData[i]._id + i}/>
                        {this.buildDeleteBox(osName, windowsData[i]._id)}
                    </li>
                    <li id="data-block" key={1 + windowsData[i]._id + i}>{typeof windowsData[i].name === "undefined" ? "-" : windowsData[i].name}</li>
                    <li id="data-block" key={2 + windowsData[i]._id + i}> {windowsData[i].description == null ? "-" : windowsData[i].description} </li>
                    <li id="data-block" key={3 + windowsData[i]._id + i}>{os}</li>
                    <li id="data-block" key={4 + windowsData[i]._id + i}>{osData}</li>
                    <li id="data-block" key={5 + windowsData[i]._id + i}>{windowsData[i].currenttime}</li>
                    <li id="data-block" key={6 + windowsData[i]._id + i} name={windowsData[i]._id} className="tags-block">{this.buildTags(windowsData[i]._id, osName, windowsData[i].tags)}</li>
                </ul>
            )
        }
        return items;
    }

    // Function is sent as prop to child components LinuxDetails and WindowsDetails
    // It is called from child component to return from dump analyzing mode
    returnFromAnalysis () {
        this.setState({analysedDumpOS: null, analysedDump: null, analyzeMode: false});
        //ReactDOM.render(this.buildResultsColumns(), document.getElementById('page'));
    }

    render() {

        if (this.state.analyzeMode === false) {
            return (
                <div id="page">
                    {this.buildResultsColumns()}
                </div>
            );
        }
        if (this.state.analyzeMode === true) { // If analyseMode is set to true, render LinuxDetails or WindowsDetails
            if (this.state.analysedDumpOS === "linux") {
                return (
                    <div id="page">
                        <LinuxDetails dumpData={this.state.analysedDump} returnFromAnalysis={this.returnFromAnalysis} showPopUp={this.showPopUp} buildInfoPopUp={this.buildInfoPopUp} />
                    </div>
                )
            } else if (this.state.analysedDumpOS === "windows") {
                return (
                    <div id="page">
                        <WindowsDetails dumpData={this.state.analysedDump} returnFromAnalysis={this.returnFromAnalysis} showPopUp={this.showPopUp} buildInfoPopUp={this.buildInfoPopUp} />
                    </div>
                )
            }
        }
    }
}

export default Reports;
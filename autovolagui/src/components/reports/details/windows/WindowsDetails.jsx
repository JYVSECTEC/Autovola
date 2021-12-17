import React from "react";
import Select from 'react-select';
import { searchBar, search, setSearch, filterSearch, processFilters} from "../../Search";
import {pageHeader, pluginInfo, checkIfSelected, buildBasicPluginBox, infoBox, DOMParserInfoBox,
    pluginBoxHeader, pluginDataColumns, pluginContainerFooter, buildHeaderBlocksMenu, 
    to64BitHex, toHex, bytesToSize, allVisibleDataBlocks, buildJSONDownloadIcon, pluginDataBlocksFill} from "../../../app/Utils.js";
import { plugins } from "./Plugins";
import WindowsPlugin from "./WindowsPlugin";
import {pageHeaderUsage} from "../../Usage.js";
import "../../Reports.css";
import "../Common.css";
import "./WindowsDetails.css";
import "../../Reports";


// Contains all plugins that are available to user
const pluginNames = [
    { value: 'basicdetails', label: 'basicdetails' },
    { value: 'bigpools', label: 'bigpools' },
    { value: 'callbacks', label: 'callbacks' },
    { value: 'dlllist', label: 'dlllist' },
    { value: 'driverirp', label: 'driverirp' },
    { value: 'driverscan', label: 'driverscan' },
    { value: 'envars', label: 'envars' },
    { value: 'filescan', label: 'filescan' },
    { value: 'getserviceids', label: 'getserviceids' },
    { value: 'getsids', label: 'getsids' },
    { value: 'handles', label: 'handles' },
    { value: 'hivelist', label: 'hivelist' },
    { value: 'info', label: 'info' },
    { value: 'malfind', label: 'malfind' },
    { value: 'modscan', label: 'modscan' },
    { value: 'modules', label: 'modules' },
    { value: 'mutantscan', label: 'mutantscan' },
    { value: 'netscan', label: 'netscan' },
    { value: 'poolscanner', label: 'poolscanner' },
    { value: 'printkey', label: 'printkey' },
    { value: 'privs', label: 'privs' },
    { value: 'psscan', label: 'psscan' },
    { value: 'ssdt', label: 'ssdt' },
    { value: 'svcscan', label: 'svcscan' },
    { value: 'symlinkscan', label: 'symlinkscan' },
    { value: 'userassist', label: 'userassist' },
    { value: 'vadinfo', label: 'vadinfo' },
    { value: 'verinfo', label: 'verinfo' },
    { value: 'virtmap', label: 'virtmap' },
];

// Plugin dropdown select-menu styles
const selectStyles = {
    container: base => ({ 
        ...base, 
        width: 300,
        "@media screen and (max-width: 1700px)": {
            ...base["@media only screen and (max-width: 1700px)"],
            width: 200,
            "marginLeft": 10,
        },
    }),
    control: (base, state) => ({
        ...base,
        width: 300,
        whiteSpace: "nowrap",
        overflow: "hidden",
        "maxHeight": state.menuIsOpen ? "none" : 30,
        "@media screen and (max-width: 1700px)": {
        ...base["@media only screen and (max-width: 1700px)"],
        width: 200
        },
      }),
    indicatorsContainer: (base, state) => ({
        ...base,
        "maxHeight": state.menuIsOpen ? "none" : 40,
    }),
    menu: base => ({ 
        ...base, 
        width: 300,
        "@media screen and (max-width: 1700px)": {
            ...base["@media only screen and (max-width: 1700px)"],
            width: 200
        },
    }),
}

class WindowsDetails extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            dumpData: {}, // Object containing all dump data from DB like plugin results, system name etc.
            search: "", // Search filters
            pageDetails : { pages : {} }, // Plugin page details
            selectedPlugins: pluginNames, // Currently selected plugins (These are visible to user)
            pluginCategory: "all" // Plugin category
        };

        // Main function
        this.buildPage = this.buildPage.bind(this);
        // Page header functions
        this.pageHeader = pageHeader.bind(this);
        this.buildHeaderBlocksMenu = buildHeaderBlocksMenu.bind(this);
        this.buildPluginCheckBox = this.buildPluginCheckBox.bind(this);
        this.buildPluginCategoryMenu = this.buildPluginCategoryMenu.bind(this);
        // Functions for rendering plugin data
        this.basicWindowsDetails = this.basicWindowsDetails.bind(this);
        this.buildBasicPluginBox = buildBasicPluginBox.bind(this);
        this.info = this.info.bind(this);
        // Plugin box related functions
        this.pluginBoxHeader = pluginBoxHeader.bind(this); 
        this.pluginDataColumns = pluginDataColumns.bind(this);
        this.pluginContainerFooter = pluginContainerFooter.bind(this);
        this.pluginDataBlocksFill = pluginDataBlocksFill.bind(this);
        this.DOMParserInfoBox = DOMParserInfoBox.bind(this);
        this.pluginInfo = pluginInfo.bind(this);
        this.infoBox = infoBox.bind(this);
        this.buildJSONDownloadIcon = buildJSONDownloadIcon.bind(this);
        // Category related functions
        this.checkIfSelected = checkIfSelected.bind(this);
        this.pickSelectedPlugins = this.pickSelectedPlugins.bind(this);
        // Search functions
        this.filterSearch = filterSearch.bind(this);
        this.searchBar = searchBar.bind(this);
        this.search = search.bind(this);
        this.processFilters = processFilters.bind(this);
        this.setSearch = setSearch.bind(this);
        // Data modification functions
        this.toHex = toHex.bind(this)
        this.to64BitHex = to64BitHex.bind(this);
        this.bytesToSize = bytesToSize.bind(this);
        // Page displaying functions
        this.allVisibleDataBlocks = allVisibleDataBlocks.bind(this);
    }

    // If state changes, render plugins again
    static getDerivedStateFromProps(nextProps, prevState) {

        // Ignore these keys when populating this.state.pagedetails
        const ignore = [ "_id", "os_info", "info", "currenttime", "analyse_state"] 

        // When dump plugin data is rendered the first time
        if (Object.keys(prevState.pageDetails.pages).length === 0) {
            let pages = { pages : {} };
            for (const value in nextProps.dumpData) { // Populate this.state.pageDetails with default values
                if (Array.isArray(nextProps.dumpData[value]) && !(value in ignore)) {
                    pages.pages[value] = {pageNumber : 1, showAll : false, elementsVisible : 20};
                }
            }

            // this.state.dumpData is copied
            var dumpDataCopy = JSON.parse(JSON.stringify(nextProps.dumpData))

            // Update plugin data if specified by "update" attribute in Plugins.js
            for (var plugin in plugins) { // Loop through plugins
                for (var column in plugins[plugin].columns) { // Loop through plugin column array
                    if ("update" in plugins[plugin].columns[column]) { // If one of columns objects has "update" attribute, all that column data is processed someway depending on the "update" attribute value
                        if (plugins[plugin].columns[column]["update"].includes("parseInt")) { // To Integer
                            for (var data in dumpDataCopy[plugin]) { // Go through through all objects in plugin
                                try {
                                    dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]] = parseInt(dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]])
                                }
                                catch(err){ // null values cannot be converted to int
                                    continue;
                                }
                            }
                        }
                        else if (plugins[plugin].columns[column]["update"].includes("toString")) { // To String
                            for (var data in dumpDataCopy[plugin]) {  // Go through through all objects in plugin
                                try {
                                    dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]] = dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]].toString()
                                }
                                catch(err){ // null values cannot be converted to string
                                    continue;
                                }
                            }
                        }
                        if (plugins[plugin].columns[column]["update"].includes("to64BitHex")) { // Integer to HEX
                            for (var data in dumpDataCopy[plugin]) {  // Go through through all objects in plugin
                                try {
                                    dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]] = to64BitHex(dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]])
                                }
                                catch(err) {
                                    continue;
                                }
                            }
                        }
                        else if (plugins[plugin].columns[column]["update"].includes("bytesToSize")) { // Bytes to size (KB, MB, GB etc.)
                            for (var data in dumpDataCopy[plugin]) {  // Go through through all objects in plugin
                                try {
                                    dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]] = bytesToSize(dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]])
                                }
                                catch(err) {
                                    continue;
                                }
                            }
                        }
                        else if (plugins[plugin].columns[column]["update"].includes("toHex")) { // To HEX
                            for (var data in dumpDataCopy[plugin]) {  // Go through through all objects in plugin
                                try {
                                    dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]] = toHex(dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]])
                                }
                                catch(err) {
                                    continue;
                                }
                            }
                        }
                    }
                }
            }

            return { // Update pageDetails and dumpData states
                pageDetails : pages,
                dumpData: dumpDataCopy
            };
        }
        else { // If not rendered for first time
            var pages = prevState.pageDetails;
            return {
                pageDetails : pages,
                dumpData: prevState.dumpData
            };
        }
    }

    // Build react-select checkbox to header
    buildPluginCheckBox () {
        const { selectedPlugins } = this.state;
    
        return <Select
        autoFocus
        isMulti
        placeholder={"Remove plugins"}
        className={"plugin-select"}
        value={selectedPlugins}
        onChange={this.handleChange}
        options={pluginNames}
        closeMenuOnSelect={false}
        hideSelectedOptions={true}
        allowSelectAll={true}
        styles={selectStyles}
        />;
    }

    // Main function called by render bringing all blocks together
    buildPage () {

        // For debugging
        // console.log(this.state.dumpData) 
        const items = [];

        items.push(this.pageHeader(pageHeaderUsage))
        items.push(this.basicWindowsDetails())
        items.push(this.info())
        var ignore = ["info"];
        for (var plugin in plugins) { // Create generic boxes for plugins in Plugins.js file

            if (ignore.includes(plugin)) {
                continue;
            }

            if (this.checkIfSelected(this.state.selectedPlugins, plugin) === false) { // Check if plugin is selected
                continue;
            }
                    
            let dumpData = this.search(this.state.dumpData[plugin]); // Do search for the plugin data

            try { // Check that plugin passes search filters
                if (dumpData.length === 0 ||dumpData == null || dumpData === "ERROR" || dumpData === "UNSATISFIED") {
                    continue;
                }
            } catch (error) {
                continue;
            }
            // Create plugin box and push it to DOM
            items.push(<WindowsPlugin dumpData={dumpData} 
                    pages={this.state.pageDetails.pages[plugin]}
                    selectedPlugins={this.state.selectedPlugins}
                    pluginName={plugin}
                    columns={plugins[plugin].columns}
                    info={plugins[plugin].info}
                    search={this.state.search}
                    />)
        }
        return items;
    }

    // Update selectedPlugins-state
    handleChange = selectedPlugins => {
        this.setState({ selectedPlugins });
        console.log(`Option selected:`, selectedPlugins);
    };

    // Picks plugins that will be rendered to user
    pickSelectedPlugins(value) {

        var categoryPlugins = []; // array populated with selected plugins

        if (value === "all") { // Show all plugins
            categoryPlugins = pluginNames;
        } else if (value === "processes") { // Show process related plugins
            categoryPlugins = [
                { value: 'envars', label: 'envars' },
                { value: 'handles', label: 'handles' },
                { value: 'malfind', label: 'malfind' },
                { value: 'mutantscan', label: 'mutantscan' },
                { value: 'privs', label: 'privs' },
                { value: 'psscan', label: 'psscan' },
                { value: 'vadinfo', label: 'vadinfo' }
            ];
        } else if (value === "kernel") { // Show kernel related plugins
            categoryPlugins = [
                { value: 'bigpools', label: 'bigpools' },
                { value: 'callbacks', label: 'callbacks' },
                { value: 'poolscanner', label: 'poolscanner' },
                { value: 'ssdt', label: 'ssdt' },
                { value: 'virtmap', label: 'virtmap' }
            ];
        } else if (value === "network") { // Show network related plugins
            categoryPlugins = [
                { value: 'netscan', label: 'netscan' },
                { value: 'netstat', label: 'netstat' },
            ];
        } else if (value === "modules") { // Show modules related plugins
            categoryPlugins = [
                { value: 'driverirp', label: 'driverirp' },
                { value: 'driverscan', label: 'driverscan' },
                { value: 'modscan', label: 'modscan' },
                { value: 'modules', label: 'modules' }
            ];
        } else if (value === "services") { // Show services related plugins
            categoryPlugins = [
                { value: 'getserviceids', label: 'getserviceids' },
                { value: 'getsids', label: 'getsids' },
                { value: 'svcscan', label: 'svcscan' }
            ];
        } else if (value === "registry") { // Show registry related plugins
            categoryPlugins = [
                { value: 'hivelist', label: 'hivelist' },
                { value: 'printkey', label: 'printkey' },
                { value: 'userassist', label: 'userassist' }
            ];
        } else if (value === "files") { // Show files related plugins
            categoryPlugins = [
                { value: 'dlllist', label: 'dlllist' },
                { value: 'filescan', label: 'filescan' },
                { value: 'symlinkscan', label: 'symlinkscan' },
                { value: 'verinfo', label: 'verinfo' }
            ];
        }
        this.handleChange(categoryPlugins);
    }

    // Builds plugin category menu inside the header
    buildPluginCategoryMenu () {
        const items = [];
        items.push(
            <select id="plugin-category-select" onChange={(evt) => this.pickSelectedPlugins(evt.target.value)}>
                <option disabled value >Plugin categories</option>
                <option value="all">All</option>
                <option value="kernel">Kernel</option>
                <option value="processes">Processes</option>
                <option value="modules">Modules</option>
                <option value="network">Network</option>
                <option value="services">Services</option>
                <option value="registry">Registry</option>
                <option value="files">Files</option>
            </select>
        )
        return items;
    }

    // Builds and returns structure containing general information about the dump which is being analysed
    basicWindowsDetails () {

        const items = [];
        var name = "basicdetails"
        var dumpData = this.state.dumpData
        if (this.checkIfSelected(this.state.selectedPlugins, name) === false) {
            return null;
        }

        var info = `This primary section of the report contains basic information about the dump.\n
        Under this section is search field and tables for each plugin used on the dump. These tables display data retrieved from the plugin.\n
        Each plugin section contains information button like this one. Pressing the button displays basic information related to the plugin and its columns.`; 

        try { // Check if OS related data is available and create string containing all that data
            var osData = dumpData.os_info.os + " " + dumpData.os_info["ProductType"] + " " + dumpData.os_info["NtMajorVersion"] + "." + dumpData.os_info["NtMinorVersion"]
        }
        catch (err) {
            var osData = "-"
        }

        items.push(
            <div id="basic-details-container" className="windows">
                <div id="header">
                    <img src="images/plugin-info.png" id="info-button" onClick={() => this.pluginInfo(name)} />
                    {this.infoBox(name, info, "Basic details")}
                    <div id="header-name">Basic details</div>
                </div>
                <div id="details">
                    <ul id="detail-block">
                        <li id="detail-header">System Name</li>
                        <li id="detail-data">{dumpData.name == null ? "-" : dumpData.name}</li>
                    </ul>
                    <ul id="detail-block">
                        <li id="detail-header">Dump size</li>
                        <li id="detail-data">{dumpData.dumpsize == null ? "-" : this.bytesToSize(dumpData.dumpsize)}</li>
                    </ul>
                    <ul id="detail-block">
                        <li id="detail-header">OS</li>
                        <li id="detail-data">{osData}</li>
                    </ul>
                    <ul id="detail-block">
                        <li id="detail-header">Processes</li>
                        <li id="detail-data">{Array.isArray(dumpData.psscan) === false ? "-" : dumpData.psscan.length}</li>
                    </ul>
                    <ul id="detail-block" className="right-side">
                        <li id="detail-header">Kernel modules</li>
                        <li id="detail-data">{Array.isArray(dumpData.modscan) === false ? "-" : dumpData.modscan.length}</li>
                    </ul>
                </div>
            </div>
        )
        return items;
    }

    // Individual plugin-container created for windows.info.Info-plugin, since its data structure differs from all other plugins
    info () {
        const items = [];
        var pluginName = "info"
        var dumpData = this.state.dumpData[pluginName]
        if (this.checkIfSelected(this.state.selectedPlugins, pluginName) === false) {
            return null;
        }
        dumpData = this.search(dumpData);
        try {
            if (dumpData.length === 0)
                return null;
        } catch (error) {
            return null;
        }

        try {
            var info = plugins[pluginName].info; // Get info from Plugins.js
            var filteredData = dumpData.filter(function(dump) { return dump.Variable != ("Symbols" || "SystemTime"); }); // Remove symbols and SystemTime data
        } catch (error) {
            return null;
       }

        // Build all data blocks
        items.push(
        <div id="plugin-box" className={pluginName} key={"pluginbo" + pluginName}>
            {this.pluginBoxHeader(pluginName, info)}
            <table id="plugin-container" className={pluginName} key={"plugin-container" + pluginName}>
                <tbody key={"plugin-container tbody" + pluginName}>
                    {filteredData.map((column, index) => (
                        <tr id="info-block" key={"info info-block" + index}>
                            <th id="info-column" key={"info info-column" + index}>{column.Variable}</th>
                            <td id="info-value" key={"info info-value" + index}>{column.Value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        );
        return items;
    }

    render() {
        return(
            <div id="windows-dump-page">
                {this.buildPage(this)}
            </div>
        )
    }
}

export default WindowsDetails;
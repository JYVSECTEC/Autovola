import $ from "jquery";
import React, { Component } from "react";
import ReactDOM from 'react-dom';
import Select from 'react-select';
import { searchBar, search, setSearch, filterSearch, processFilters} from "../../Search";
import {pageHeader, pluginInfo, checkIfSelected, buildBasicPluginBox, infoBox, DOMParserInfoBox,
    pluginBoxHeader, pluginDataColumns, pluginContainerFooter, buildHeaderBlocksMenu, 
    to64BitHex, toHex, bytesToSize, changePage, visibleDataBlocks, allVisibleDataBlocks, displayOrder, showAll, showLess, buildJSONDownloadIcon, pluginDataBlocksFill} from "../../../app/Utils.js";
import { plugins } from "./Plugins";
import LinuxPlugin from "./LinuxPlugin";
import {pageHeaderUsage} from "../../Usage.js";
import "../../Reports.css";
import "../Common.css"
import "./LinuxDetails.css";
import "../../Reports";

// Contains all plugins that are available to user
const pluginNames = [
    { value: 'basicdetails', label: 'basicdetails' },
    { value: 'check_afinfo', label: 'check_afinfo' },
    { value: 'check_creds', label: 'check_creds' },
    { value: 'check_idt', label: 'check_idt' },
    { value: 'check_modules', label: 'check_modules' },
    { value: 'check_syscall', label: 'check_syscall' },
    { value: 'elfs', label: 'elfs' },
    { value: 'keyboard_notifiers', label: 'keyboard_notifiers' },
    { value: 'lsmod', label: 'lsmod' },
    { value: 'lsof', label: 'lsof' },
    { value: 'malfind', label: 'malfind' },
    { value: 'maps', label: 'maps' },
    { value: 'pslist', label: 'pslist' },
    { value: 'tty_check', label: 'tty_check' },
];

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

class LinuxDetails extends React.Component {
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
        this.basicLinuxDetails = this.basicLinuxDetails.bind(this);
        this.buildBasicPluginBox = buildBasicPluginBox.bind(this);
        // Plugin box related functions
        this.pluginBoxHeader = pluginBoxHeader.bind(this); 
        this.pluginDataColumns = pluginDataColumns.bind(this);
        this.pluginContainerFooter = pluginContainerFooter.bind(this);
        this.pluginDataBlocksFill = pluginDataBlocksFill.bind(this);
        this.pluginInfo = pluginInfo.bind(this);
        this.infoBox = infoBox.bind(this);
        this.buildJSONDownloadIcon = buildJSONDownloadIcon.bind(this);
        this.DOMParserInfoBox = DOMParserInfoBox.bind(this);
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
        this.to64BitHex = to64BitHex.bind(this);
        this.bytesToSize = bytesToSize.bind(this);
        this.toHex = toHex.bind(this);
        // Page displaying functions
        this.changePage = changePage.bind(this);
        this.displayOrder = displayOrder.bind(this);
        this.showLess = showLess.bind(this);
        this.showAll = showAll.bind(this);
        this.visibleDataBlocks = visibleDataBlocks.bind(this);
        this.allVisibleDataBlocks = allVisibleDataBlocks.bind(this);
    }


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
            for (var plugin in plugins) {
                for (var column in plugins[plugin].columns) {
                    if ("update" in plugins[plugin].columns[column]) {
                        if (plugins[plugin].columns[column]["update"].includes("parseInt")) { // To Integer
                            for (var data in dumpDataCopy[plugin]) {
                                try {
                                    dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]] = parseInt(dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]])
                                }
                                catch(err){ // null values cannot be converted to string
                                    continue;
                                }
                            }
                        }
                        else if (plugins[plugin].columns[column]["update"].includes("toString")) { // To String
                            for (var data in dumpDataCopy[plugin]) {
                                try {
                                    dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]] = dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]].toString()
                                }
                                catch(err){ // null values cannot be converted to string
                                    continue;
                                }
                            }
                        }
                        if (plugins[plugin].columns[column]["update"].includes("to64BitHex")) { // Integer to HEX
                            for (var data in dumpDataCopy[plugin]) {
                                try {
                                    dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]] = to64BitHex(dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]])
                                }
                                catch(err) {
                                    continue;
                                }
                            }
                        }
                        else if (plugins[plugin].columns[column]["update"].includes("bytesToSize")) { // Bytes to size (KB, MB, GB etc.)
                            for (var data in dumpDataCopy[plugin]) {
                                try {
                                    dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]] = bytesToSize(dumpDataCopy[plugin][data][plugins[plugin].columns[column]["name"]])
                                }
                                catch(err) {
                                    continue;
                                }
                            }
                        }
                        else if (plugins[plugin].columns[column]["update"].includes("toHex")) { // To HEX
                            for (var data in dumpDataCopy[plugin]) {
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

            return {
                pageDetails : pages,
                dumpData: dumpDataCopy
            };
        }
        else {
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
        const items = [];
        items.push(this.pageHeader(pageHeaderUsage))
        items.push(this.basicLinuxDetails())
        var ignore = [];
        for (var plugin in plugins) { // Create generic plugin boxes for plugins in Plugins.js file

            if (ignore.includes(plugin)) {
                continue;
            }

            if (this.checkIfSelected(this.state.selectedPlugins, plugin) === false) { // Check if plugin is selected
                continue;
            }
                    
            let dumpData = this.search(this.state.dumpData[plugin]); // Do search for the plugin data

            try { // Check that plugin passes search filters
                if (dumpData.length === 0 || dumpData == null || dumpData === "ERROR" || dumpData === "UNSATISFIED") {
                    continue;
                }
            } catch (error) {
                continue;
            }

            items.push(<LinuxPlugin dumpData={dumpData} 
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

    // Picks plugins that will be rendered to user
    pickSelectedPlugins(value) {
        var categoryPlugins = []; // array populated with selected plugins

        if (value === "all") { // Show all plugins
            categoryPlugins = pluginNames;
        } else if (value === "processes") { // Show process related plugins
            categoryPlugins = [
                { value: 'pslist', label: 'pslist' },
                { value: 'lsof', label: 'lsof' },
                { value: 'elfs', label: 'elfs' },
                { value: 'check_creds', label: 'check_creds' },
                { value: 'maps', label: 'maps' }
            ];
        } else if (value === "kernel") { // Show kernel related plugins
            categoryPlugins = [
                { value: 'check_afinfo', label: 'check_afinfo' },
                { value: 'check_idt', label: 'check_idt' },
                { value: 'check_syscall', label: 'check_syscall' },
                { value: 'tty_check', label: 'tty_check' },
                { value: 'keyboard_notifiers', label: 'keyboard_notifiers' }
            ];
        } else if (value === "modules") { // Show modules related plugins
            categoryPlugins = [
                { value: 'check_modules', label: 'check_modules' },
                { value: 'lsmod', label: 'lsmod' }
            ];
        } else if (value === "malware") { // Show malware related plugins
            categoryPlugins = [
                { value: 'malfind', label: 'malfind' }
            ];
        }
        this.handleChange(categoryPlugins);
    }

    // Update selectedPlugins-state
    handleChange = selectedPlugins => {
        this.setState({ selectedPlugins });
        console.log(`Option selected:`, selectedPlugins);
    };

    // Builds plugin category menu inside the header
    buildPluginCategoryMenu () {
        const items = [];
        items.push(
            <select id="plugin-category-select" onChange={(evt) => this.pickSelectedPlugins(evt.target.value)}>
                <option disabled selected value >Plugin categories</option>
                <option value="all">All</option>
                <option value="kernel">Kernel</option>
                <option value="processes">Processes</option>
                <option value="modules">Modules</option>
                <option value="files">Files</option>
            </select>
        )
        return items;
    }

    // Builds and returns structure containing general information about the dump which is being analysed
    basicLinuxDetails () {

        const items = [];
        var name = "basicdetails"
        var dumpData = this.state.dumpData
        if (this.checkIfSelected(this.state.selectedPlugins, name) === false) {
            return null;
        }
        var os_styles = {}
        try { // If Linux OS info takes too much space its text is shrinked
            var os_length = dumpData.os_info.length
            if (os_length < 40)
                os_styles = {"font-size" : "25px"};
            if (os_length > 40 && os_length < 250)
                os_styles = {"font-size" : "18px"};
        }
        catch (err) {}

        var info = `This primary section of the report contains basic information about the dump.\n
        Under this section is search field and tables for each plugin used on the dump. These tables display data retrieved from the plugin.\n
        Each plugin section contains information button like this one. Pressing the button displays basic information related to the plugin and its columns.`;

        items.push(
            <div id="basic-details-container" className="linux">
                <div id="header">
                    <img src="images/plugin-info.png" id="info-button" onClick={() => this.pluginInfo(name)} />
                    {this.infoBox(name, info, "Basic details")}
                    <div id="header-name">Basic details</div>
                </div>
                <div id="details">
                    <ul id="detail-block">
                        <li id="detail-header">Dump size</li>
                        <li id="detail-data">{dumpData.dumpsize == null ? "-" : this.bytesToSize(dumpData.dumpsize)}</li>
                    </ul>
                    <ul id="detail-block">
                        <li id="detail-header">OS details</li>
                        <li id="detail-data" style={os_styles}>{dumpData.os_info == null ? "-" : dumpData.os_info}</li>
                    </ul>
                    <ul id="detail-block">
                        <li id="detail-header">Processes</li>
                        <li id="detail-data">{Array.isArray(dumpData.pslist) === false ? "-" : dumpData.pslist.length}</li>
                    </ul>
                    <ul id="detail-block" className="right-side">
                        <li id="detail-header">Kernel modules</li>
                        <li id="detail-data">{Array.isArray(dumpData.lsmod) === false ? "-" : dumpData.lsmod.length}</li>
                    </ul>
                </div>
            </div>
        )
        return items;
    }

    render() {

        return(
            <div id="linux-dump-page">
                {this.buildPage(this)}
            </div>
        )
    }
}

export default LinuxDetails;
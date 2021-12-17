import React from "react";
import { search, setSearch, filterSearch, processFilters} from "../../Search";
import {pluginInfo, checkIfSelected, buildBasicPluginBox, infoBox,
    pluginBoxHeader, pluginDataColumns, pluginContainerFooter,
    changePage, visibleDataBlocks, displayOrder, showAll, showLess, 
    buildJSONDownloadIcon, pluginDataBlocksFill} from "../../../app/Utils.js";
import "../Common.css";
import "./WindowsDetails.css";

class WindowsPlugin extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            dumpData: {}, // Object containing all plugin data from DB
            pages : null, // Plugin page details
            pagesCopy : null, // Copy of page details
            search : ""
        };

        this.buildPlugin = this.buildPlugin.bind(this);
        this.buildBasicPluginBox = buildBasicPluginBox.bind(this);
        // Plugin box related functions
        this.pluginBoxHeader = pluginBoxHeader.bind(this); 
        this.pluginDataColumns = pluginDataColumns.bind(this);
        this.pluginContainerFooter = pluginContainerFooter.bind(this);
        this.pluginDataBlocksFill = pluginDataBlocksFill.bind(this);
        this.pluginInfo = pluginInfo.bind(this);
        this.buildJSONDownloadIcon = buildJSONDownloadIcon.bind(this);
        this.infoBox = infoBox.bind(this);
        // Category related functions
        this.checkIfSelected = checkIfSelected.bind(this);
        // Search functions
        this.filterSearch = filterSearch.bind(this);
        this.search = search.bind(this);
        this.processFilters = processFilters.bind(this);
        this.setSearch = setSearch.bind(this);
        // Page displaying functions
        this.changePage = changePage.bind(this);
        this.visibleDataBlocks = visibleDataBlocks.bind(this);
        this.displayOrder = displayOrder.bind(this);
        this.showLess = showLess.bind(this);
        this.showAll = showAll.bind(this);
    }
    
    static getDerivedStateFromProps(nextProps, prevState) {
        if (prevState.pages == null) { // Plugin is rendered first time - fill all states with corresponding props
            return {
                pages: nextProps.pages,
                pagesCopy: nextProps.pages,
                dumpData: nextProps.dumpData,
                selectedPlugins: nextProps.selectedPlugins,
                search: nextProps.search
            };
        } else if (nextProps.pages !== prevState.pagesCopy) { // If all plugins data row visibility amount is changed
            return {
                pages: nextProps.pages,
                pagesCopy: nextProps.pages,
                selectedPlugins: nextProps.selectedPlugins,
                dumpData: nextProps.dumpData
            };
        } else if ((prevState.dumpData.length === nextProps.dumpData.length && prevState.dumpData !== nextProps.dumpData) || (nextProps.search == prevState.search && nextProps.pages === prevState.pagesCopy) || (nextProps.search != prevState.search && nextProps.search === "")) { // Checks to make column order display work
            return {
                pages: prevState.pages,
                selectedPlugins: nextProps.selectedPlugins,
                dumpData: prevState.dumpData
            }
        }
        else { // This plugin's data rows visibility amount is changed
            return {
                pages: prevState.pages,
                selectedPlugins: nextProps.selectedPlugins,
                dumpData: nextProps.dumpData
            };
        }
    }

    // Build basic box for plugin data
    buildPlugin () {
        return this.buildBasicPluginBox(this.props.pluginName, this.props.columns, this.props.info);
    }

    render() {
        // Build container for the plugin
        var pluginBox = this.buildPlugin(this)

        // If no data is returned from buildPlugin, return null
        if (pluginBox == null) {
            return (null);
        }
        else { // Render plugin
            return(
                <div id="outer-plugin-box" className={this.props.pluginName} key={"outerpluginbox" + this.props.pluginName}>
                    {pluginBox}
                </div>
            )
        }
    }
}

export default WindowsPlugin;
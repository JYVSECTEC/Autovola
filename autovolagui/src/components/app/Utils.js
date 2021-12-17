import $ from "jquery";

// Build pop-up box
export const  buildInfoPopUp = function buildInfoPopUp () {
    const items = [];
    items.push(
        <div id="info-pop-up" style={{display: "none"}}>
            <p></p>
            <input id="close-pop-up-button" type="image" src="images/pop-up-close.png" alt="close" onClick={() => $("#info-pop-up").hide()}/>
        </div>
    )
    return items;
}

// Show pop-up box 
export const showInfoPopUp = function showInfoPopUp (message, color, fade = true) {
    var popUp = $( "#info-pop-up" );
    popUp.find( "p" ).text(message)
    popUp.css("background-color", color)
    popUp.show();
    if (fade === true) { // Box disappers in 3 seconds
        popUp.delay(3000).fadeOut();
    }
}

// Change current plugin page to the one user selected
export const changePage = function changePage (evt) {
    const node = evt.target.attributes.name.nodeValue;
    var newPage = parseInt(evt.target.innerText)
    let stateCopy = JSON.parse(JSON.stringify(this.state.pages))
    stateCopy.pageNumber = newPage
    this.setState({pages: stateCopy})
}

// Show all data rows in plugin
export const showAll = function showAll (evt) {
    // http://jsfiddle.net/cse_tushar/6FzSb/
    const node = evt.target.attributes.name.nodeValue;
    let stateCopy = JSON.parse(JSON.stringify(this.state.pages))
    stateCopy.showAll = true;
    this.setState({pages: stateCopy})
}

// Stop showing all data rows in plugin
export const showLess = function showLess (evt) {
    const node = evt.target.attributes.name.nodeValue;
    let stateCopy = JSON.parse(JSON.stringify(this.state.pages))
    stateCopy.showAll = false;
    this.setState({pages: stateCopy})
}

// Updates how many data rows can be seen in plugin
export const visibleDataBlocks = function visibleDataBlocks (evt) {
    const node = evt.target.attributes.name.nodeValue;
    const value = parseInt(evt.target.innerText)
    let stateCopy = JSON.parse(JSON.stringify(this.state.pages))
    stateCopy.elementsVisible = value;
    stateCopy.pageNumber = 1; // Change current page to 1
    this.setState({pages: stateCopy})
}

// Change order of plugin data rows to descending or ascending
export const displayOrder = function displayOrder (evt) {
    const order = evt.target.attributes.alt.nodeValue; // "desc" or "asc" depending on arrow pressed 
    const column = evt.target.parentElement.previousSibling.innerText; // column name
    let stateCopy = JSON.parse(JSON.stringify(this.state.dumpData)) // Copy of the plugin data

    // Fill null nodes with empty strings
    stateCopy.forEach(function (arrayItem) {
        if (arrayItem[column] == null) {
            arrayItem[column] = "";
        }
    });
    // Nodes are sorted either descending or ascending 
    try {
        if(order === "desc") {
            stateCopy.sort((a,b) => (a[column].toLowerCase() > b[column].toLowerCase()) ? 1 : ((b[column].toLowerCase() > a[column].toLowerCase()) ? -1 : 0));
        }
        else if(order === "asc") {
            stateCopy.sort((a,b) => (a[column].toLowerCase() < b[column].toLowerCase()) ? 1 : ((b[column].toLowerCase() < a[column].toLowerCase()) ? -1 : 0));
        }
    // If typeError occurs, numerical ordering is done instead
    } catch (error) {
        if (error instanceof TypeError) {
            if(order === "desc") {
                stateCopy.sort((a,b) => a[column] - b [column])
            }
            else if(order === "asc") {
                stateCopy.sort((a,b) => b[column] - a [column])
            }
        }
    }
    this.setState({dumpData: stateCopy}) // Update order
}

// Turns decimal to 8 bytes hexadecimal string
export const to64BitHex = function to64BitHex (decimalNumber) {
    var hex = decimalNumber.toString(16).toUpperCase()
    for (let i = hex.length; i < 16; i+=2) {
        hex = "00" + hex;
    };
    hex = "0x" + hex;
    return hex;
}

// Turns decimal number to hexadecimal string
export const toHex = function toHex (decimalNumber) {
    var hex = decimalNumber.toString(16).toUpperCase()
    hex = "0x" + hex;
    return hex;
}

// Turns decimal to size
export const bytesToSize = function bytesToSize (bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

// Build header top of the page
export const pageHeader = function pageHeader (info) {
    const items = [];

    var name = "page-header"

    items.push(
        <div id="plugin-page-header">
            <img src="images/return.png" id="return-button" onClick={this.props.returnFromAnalysis}/>
            {this.buildHeaderBlocksMenu()} {/* Add these additional blocks inside the header*/}
            {this.searchBar()}
            {this.buildPluginCheckBox()}
            {this.buildPluginCategoryMenu()}
            <div id="header-info-container">
                <img src="images/plugin-info-white.png" name={name} id="info-button" onClick={() => this.pluginInfo(name)} />
                {this.DOMParserInfoBox(name, info)}
            </div>
        </div>
    )
    return items;
}

// Builds select-menu used to change visible data rows of all plugins
export const buildHeaderBlocksMenu = function buildHeaderBlocksMenu () {
    const items = [];
    items.push(
        <select id="all-data-blocks-amount" defaultValue="20" onChange={(evt) => this.allVisibleDataBlocks(this.state.pageDetails, evt.target.value)}>
            <option disabled value>Data blocks</option>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="200">200</option>
        </select>
    )
    return items;
}

// Check if plugin is selected in categories
export const checkIfSelected = function checkIfSelected (selectedPlugins, plugin) {
    for (var i in selectedPlugins) {
        if (selectedPlugins[i].value === plugin) {
            return true;
        }
    }
    return false;
}

// Changes visible data rows of all plugins
export const allVisibleDataBlocks = function allVisibleDataBlocks (pageDetails, value) {
    let stateCopy = JSON.parse(JSON.stringify(pageDetails))
    var pages = JSON.parse(JSON.stringify(stateCopy.pages))
    for (var page in pages) { // Loop through each plugins pages
        pages[page]["elementsVisible"] = parseInt(value);
    }
    stateCopy.pages = JSON.parse(JSON.stringify(pages))
    this.setState({pageDetails: stateCopy})
}

// Show or hide info-box
export const pluginInfo = function pluginInfo (name) {

    var elem = $('#info-box[name="' + name + '"]')

    if (elem.css("display") === "block") {
        elem.fadeOut();
    } else if (elem.css("display") === "none") {
        elem.fadeIn();
    }
}

// Build plugin JSON download icon
export const buildJSONDownloadIcon = function buildJSONDownloadIcon (pluginName) {
    var items = [];
    if (pluginName === "info") {
        var data = 'data:attachment/text,' + encodeURI(JSON.stringify(this.state.dumpData.info))
    }
    else {
        var data = 'data:attachment/text,' + encodeURI(JSON.stringify(this.state.dumpData))
    }

    items.push (
        <a target="_blank" download={pluginName + ".json"} href={data} key={"jsondownload" + pluginName}>
            <img src="images/json-download.svg" id="json-download-button" />
        </a>
    )
    return items;
}

// Build header for plugin
export const pluginBoxHeader = function pluginBoxHeader (pluginName, info) {

    const items = [];

    items.push(
        <div id="plugin-box-header" key={"plugin-box-header" + pluginName}>
            <div id="plugin-name" key={"plugin-name" + pluginName}>{pluginName}</div>
            {this.buildJSONDownloadIcon(pluginName)}
            <img src="images/plugin-info.png" id="plugin-info-button" name={pluginName} onClick={() => this.pluginInfo(pluginName)} key={"plugin-info-button" + pluginName}/>
            {this.infoBox(pluginName, info, pluginName)}
        </div>
    )
    return items;
}

// Regular infobox
export const infoBox = function infoBox (name, info, header) {
    var i = 0;
    return (
        <div id="info-box" name={name} style={{display : "none"}} key={header + name}>
            <img src="images/close-grey.png" id="close-info-box" name={name} onClick={() => this.pluginInfo(name)} />
            <h2>{header}</h2>
            {info.split('\n').map(str => <p key={"header" + i++}>{str}</p>)}
        </div>
    )
}

// Create infobox that sets inner html to DOM elements
export const DOMParserInfoBox = function DOMParserInfoBox (name, info) {
    return (
        <div id="info-box" name={name} style={{display : "none"}} key={name}>
            <img src="images/close-grey.png" id="close-info-box" name={name} onClick={() => this.pluginInfo(name)} />
            <div dangerouslySetInnerHTML={{__html: info}} key={"danger" + name} />
        </div>
    )
}

// Build footer for plugin
export const pluginContainerFooter = function pluginContainerFooter (pluginName, currentPage, pagesSum, showAll) {
        
    const items = [];

    // Builds footer structure that contains show and hide buttons, visible pages displayed buttons and page change buttons 
    items.push (
        <div id="options-block">
            <div id="option" style={showAll === true ? {} : {display:"none"} } name={pluginName} onClick={(evt) => this.showLess(evt)}>Hide</div>
            <div id="option" style={showAll === false ? {} : {display:"none"} } name={pluginName} onClick={(evt) => this.showAll(evt)}>Show all</div>
            <div id="amounts">
                <div id="amount" style={showAll === false ? {} : {display:"none"} } name={pluginName} onClick={(evt) => this.visibleDataBlocks(evt)}>5</div>
                <div id="amount" style={showAll === false ? {} : {display:"none"} } name={pluginName} onClick={(evt) => this.visibleDataBlocks(evt)}>10</div>
                <div id="amount" style={showAll === false ? {} : {display:"none"} } name={pluginName} onClick={(evt) => this.visibleDataBlocks(evt)}>20</div>
                <div id="amount" style={showAll === false ? {} : {display:"none"} } name={pluginName} onClick={(evt) => this.visibleDataBlocks(evt)}>50</div>
                <div id="amount" style={showAll === false ? {} : {display:"none"} } name={pluginName} onClick={(evt) => this.visibleDataBlocks(evt)}>200</div>
            </div>
            <div id="pages">
                <div id="first-page" style={currentPage === 1 || showAll === true ? {display:"none"} : {}} name={pluginName} onClick={(evt) => this.changePage(evt)}>1</div>
                <div id="mid-page" style={currentPage > 4 && showAll === false ? {} : {display:"none"}}>..</div>
                <div id="mid-page" style={currentPage > 3 && showAll === false ? {} : {display:"none"}} name={pluginName} onClick={(evt) => this.changePage(evt)}>{currentPage-2}</div>
                <div id="mid-page" style={currentPage > 2 && showAll === false ? {} : {display:"none"}} name={pluginName} onClick={(evt) => this.changePage(evt)}>{currentPage-1}</div>
                <div id="current-page" style={showAll === false ? {} : {display:"none"}} >{this.state.pages.pageNumber}</div>
                <div id="mid-page" style={currentPage < pagesSum-1 && showAll === false ? {} : {display:"none"}} name={pluginName} onClick={(evt) => this.changePage(evt)}>{currentPage+1}</div>
                <div id="mid-page" style={currentPage < pagesSum-2 && showAll === false ? {} : {display:"none"}} name={pluginName} onClick={(evt) => this.changePage(evt)}>{currentPage+2}</div>
                <div id="mid-page" style={currentPage < pagesSum-3 && showAll === false ? {} : {display:"none"}}>..</div>
                <div id="last-page" style={currentPage === pagesSum || showAll === true ? {display:"none"} : {}} name={pluginName} onClick={(evt) => this.changePage(evt)}>{pagesSum}</div>
            </div>
        </div>
    )
    return items;
}

// Build and return columns for plugin
export const pluginDataColumns = function pluginDataColumns (pluginName, columns) {

    const items = [];

    items.push(
        <ul className="columns" key={pluginName + "columns"}>
            {columns.map((column, index) => (
            <li id="column" style={column.style} key={pluginName + + "column" + index}>
                <div id="column-name" key={pluginName + column + "column-name" + index}>{column.name}</div>
                <ul id="column-arrows" key={pluginName + column + "column-arrows" + index}>
                    <li id="column-arrow-up" key={pluginName + column + "column-arrow-up" + index} alt="asc" name={pluginName} onClick={(evt) => this.displayOrder(evt)}>&uarr;</li>
                    <li id="column-arrow-down" key={pluginName + column + "column-arrow-down" + index} alt="desc" name={pluginName} onClick={(evt) => this.displayOrder(evt)}>&darr;</li>
                </ul>
            </li>))}
        </ul>
    )
    return items;
}

// Create empty data blocks as filling
export const pluginDataBlocksFill = function pluginDataBlocksFill (columns, ev, currentPage, dumpLength, showAll) {
    const items = [];
    const emptyBlocks = [];

    if (showAll === true) {
        return;
    }

    // Build empty blocks
    Object.keys(columns).forEach((item, i, arr) => {
        if(!arr[i + 1]) { // If last item, add right-side class to it
            emptyBlocks.push(<li id="data-block" className="right-side" style={columns[item]["style"]} key={"emptyblockright" + i + columns[item]}></li>)
        } else {
            emptyBlocks.push(<li id="data-block" style={columns[item]["style"]} key={"emptyblockright" + i + columns[item]}></li>)  
        }
    });

    for (var i = dumpLength; i < currentPage*ev; i++) { // Wrap each created block inside container
        items.push(
            <ul id="plugin-data-container" key={"plugindatacontainer2" + i + ev}>
                {emptyBlocks}
            </ul>
        )
    }
    return items;
}

// Builds basic plugin box, which is used for most of the plugins to render their data
export const buildBasicPluginBox = function buildBasicPluginBox (pluginName, columns, info) {
    const items = [];
    var dumpData = this.state.dumpData // Pick dump data
 
    try { // Check that plugin passes search filters
        if (dumpData.length === 0) {
            return null;
        }
    } catch (error) {
        return null;
    }

    var currentPage = this.state.pages.pageNumber // Current page number
    var showAll = this.state.pages.showAll // Should all data rows be shown (false or true)
    var ev = this.state.pages.elementsVisible // How many elements visible - not relevant if showAll equals true
    var pagesSum = Math.ceil(dumpData.length / ev); // How many pages there are overall

    // Builds structure for the plugin
    items.push(
        <div id="inner-plugin-box" className={pluginName} key={"innerplugbox" + pluginName}>
            {this.pluginBoxHeader(pluginName, info)}
            <div id="plugin-container" key={"plugincontainer" + pluginName}>
                <div className="plugin-columns" name={pluginName} key={"plugin-columns" + pluginName}>
                    {this.pluginDataColumns(pluginName, columns)}
                </div>
                <div name={pluginName} key={"plugincontainer div" + pluginName}>
                    {dumpData.slice(showAll === true ? 0 : currentPage*ev-ev, showAll === true ? dumpData.length : currentPage*ev).map((key, index) => (
                    <ul id="plugin-data-container" key={"plugindatacontainer" + index + pluginName}>
                        {columns.map((column, i, arr) => (
                            (arr.length - 1 === i ? 
                                (<li id="data-block" className="right-side" style={column.style} key={"datablock-right" + i + key + index + pluginName}>{key[column["name"]]}</li>) 
                                : (<li id="data-block" style={column.style} key={"datablock" + i + key + index + pluginName}>{key[column["name"]]}</li>))  
                            ))}
                    </ul>
                    ))}
                    {this.pluginDataBlocksFill(columns, ev, currentPage, dumpData.length, showAll)}
                </div>
                {this.pluginContainerFooter(pluginName, currentPage, pagesSum, showAll)}
             </div>
        </div>
    );
    return items;
}
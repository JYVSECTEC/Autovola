import $ from "jquery";

// Calls processFilters and saves processed search filters to search-state
export const setSearch = function setSearch (searchData) {
    var filteredSearchData = this.processFilters(searchData)
    this.setState({search: filteredSearchData})
}

// Dump page search bar
export const searchBar = function searchBar () {
    const items = [];

    items.push( 
        <form id="plugin-search-container" onSubmit={(evt) => { evt.preventDefault(); this.setSearch($('[name="search"]')[0].value)}}> {/* Stop page reload with prevent default */}
            <button className="search-btn" onClick={() => this.setSearch($('[name="search"]')[0].value)}> Search </button>
            <input type="text" className="search-field" name="search"></input>
        </form>
    )
    return items;
}

// Processes searches done in reports page
export const reportSearch = function reportSearch (reportData, filter, os) {

    if (filter == "" || (reportData == null)) {
        return reportData;
    }

    var filteredData = [];

    if (filter.startsWith("GLOBAL ")) { // All dumps search
        filter = filter.replace("GLOBAL ", "")
        filteredData = this.checkReports(filter, reportData, os);
    }
    else if (filter.startsWith("LINUX ")) { // Linux dumps search
        if (os === "windows") {
            return;
        }
        filter = filter.replace("LINUX ", "") 
        filteredData = this.checkReports(filter, reportData, os);
    }
    else if (filter.startsWith("WINDOWS ")) { // Windows dumps search
        if (os === "linux") {
            return;
        }
        filter = filter.replace("WINDOWS ", "")
        filteredData = this.checkReports(filter, reportData, os);
    }
    else { // Visible reports data search
        var filters = [];
        filters = filter.match(/(\([^)]*\)|\S)*/ig).filter(Boolean)
    
        filteredData = reportData.filter(function (node) {
        
            var filterList = filters;
    
            for (var value in node) {
                // Skip empty arrays
                try {
                    if(node[value].length == 0) {
                        continue;
                    }
                }
                catch(err) {
                    continue;
                } // Check that filter contains
                if (filterList.filter(a =>String(node[value]).includes(a))) {
                    var removedFilters = filterList.filter(a =>String(node[value]).includes(a))
                    filterList = filterList.filter( function( el ) {
                        return !removedFilters.includes( el );
                    });
                }
            }
            if (filterList.length === 0) {
                return node;
            }
        }, this);
    }
    return filteredData;
}

// Goes through all chosen OS reports and returns the ones that pass filters
export const checkReports = function checkReports (filter, reportData, os) {
    var filteredData = [];
    var filteredSearch = processFilters(filter) // Turn filters into structured format
    const ignore = ["_id", "analyse_state", "description", "dumpsize", "currenttime", "os_info", "name", "tags"] // Ignore keys in search
    if (filteredSearch.length === 0) {
        return reportData;
    }
    else {
        filteredData = reportData.filter(function (node) { // Proceed through dump reports
            var dumpData = this.getReports(os, node._id) // Get full report containing all plugin data for filtering
            for (let key in dumpData) {  // Remove ignored object keys
                if (ignore.includes(key)) {
                    delete dumpData[key]
                }
            }
            
            dumpData = Object.keys(dumpData).map(key => { // Turn object into array
                return dumpData[key];
            });

            dumpData = dumpData.filter(el => { // Check that plugin data does not contain any of these
                return el != null && el != '' && el != "ERROR" && el != "UNDEFINED";
            });
            
            dumpData = dumpData.filter( function( plugin ) { // proceed through plugins

                let filters = filteredSearch;
                filters = removeFilters(filters, plugin[0]);
                try {
                    plugin = plugin.filter(function (pluginDataBlock) { // proceed through each data block in plugin
                        return this.filterSearch(pluginDataBlock, filters);
                    }, this);
                    if (plugin.length > 0) { // If atleast 1 plugin data blcok passed filters, return it
                        return plugin;
                    }
                } catch (err) {}
            }, this);
            if (dumpData.length > 0) { // If dumpData isn't empty, return dump and it will be listed to user
                return node;
            }
        }, this);
    }
    return filteredData; // Return dumps that will be listed to user
} 

// Some filters that might negatively affect the results of plugin are removed
export const removeFilters = function removeFilters (filters, pluginData) {

    var filtersCopy = filters;

    var filtersLength = filters.length;
    for (var i = 0; i < filtersLength; i ++) { // Loop through filters
        if (filters[i].hasOwnProperty("")) { // No column name specified, nothing needs to be done
            continue;
        }
        else if (Array.isArray(filters[i])) { // Variable is array
            let nestedFilters = removeFilters(filters[i], pluginData) // Recursive call
            if (nestedFilters.length === 0) { // If recursive call gives empty array, it can be removed from filters
                filtersCopy = filtersCopy.filter(function(flt) { return ![nestedFilters].includes(flt); });
            }
            else { // Update corresponding nested filter with updated version of it
                let filter = filters[i].indexOf(filters[i]);
                if (filter !== -1) {
                    filtersCopy[filter] = nestedFilters;
                }
            }
        }
        else if (typeof filters[i] === 'object' && filters[i] !== null) { // If variable is object
            if (filters[i][Object.keys(filters[i])[0]].negate === true) { // If negating search keyword
                let columnMatch = false;

                try {
                    for (const [key, value] of Object.entries(pluginData)) { // If same Column name is found from pluginData and filter
                        if (Object.keys(filters[i])[0] === key) {
                            columnMatch = true;
                        }
                    }
                    if (columnMatch === false) { // If filter column name is not found from pluginData, filter is removed and max 1 Logical OR next to it
                        filtersCopy = filtersCopy.filter(function(flt) { return ![filters[i]].includes(flt); });
                        if (filters[i-1] === "OR" || (filters[i-1] === "OR" && filters[i+1] === "OR")) {
                            filtersCopy = filtersCopy.filter(function(flt) { return ![filters[i-1]].includes(flt); });
                        } 
                        else if (filters[i+1] === "OR") {
                            filtersCopy = filtersCopy.filter(function(flt) { return ![filters[i+1]].includes(flt); });
                        }
                    } else {
                        continue;
                    }
                } catch (error) {}
            } else {
                continue;
            }
        }
    }
    return filtersCopy
}

// Return plugin data after running search filters to it
export const search = function search (pluginData) {
    var filters = this.state.search;
    if (filters === "" || pluginData == null || pluginData === "ERROR" || pluginData === "UNSATISFIED") { // Return if no data
        return pluginData;
    }

    // Remove unnecessary filters for this particular plugin
    filters = removeFilters(filters, pluginData[0]);

    try { // If error happens while filtering, return empty array
        pluginData = pluginData.filter(function (pluginDataBlock) { // Filter each object one by one
            return this.filterSearch(pluginDataBlock, filters);
        }, this);
    } catch (err) {
        pluginData = [];
    }
    return pluginData;
}

// Recursively goes throug all filters and creates data structure that filterSearch can process
export const processFilters = function processFilters (filter) {
    var filters = [];
    try { // Regex to put search string into desired parts
        filters = filter.match(/(("((?:\\.|[^"\\])*)"):(("((?:\\.|[^"\\])*)")|((?<!\\)\(.*?(?<!\\)\))))|((?<!\\)("|-").*?(?<!\\)")|(?<!\\)\(.*?(?<!\\)\)|([^\s]*:(("((?:\\.|[^"\\])*)")|((?<!\\)\(.*?(?<!\\)\))))|(\S+)/ig).filter(Boolean)
    } catch (error) {
        return "";
    }

    filters = filters.map(element => {
        if (element.charAt(0) === "(" && element.slice(-1) === ")") {
            element = element.substring(1); // Remove "(" from beginning of string
            element = element.slice(0, -1); // Remove ")" from end of string
            element = processFilters(element); // Recursively call this function again
        }

        let negate = false;
        let columnObj = {};
        if (Array.isArray(element)) { // Return nested filter
            return element;
        }
        else if (element === "OR") { // OR does not need modifications
            columnObj = {"type": "logical", "value": "OR"};
            return columnObj;
        } 
        else if (/\S+(?<!\\):\(.*?(?<!\\)(\)|\\\))/.test(element)) { // Check if range selection
            if (element.charAt(0) === "-") { // Check if there is minus front of the column name
                negate = true;
                element = element.substring(1); // remove - from column name
            }
            if (element.charAt(0) === "\"") { // If column name is inside quotation marks
                var columnName = element.split("\":(")[0].substring(1)
            } else {
                var columnName = element.split(":(")[0]
            }
            if (element.includes("\\")) {
                element = element.replace(/(?:\\(.))/g, "$1") // Remove single backslashes
            }
            let columnRangeValue = element.match(/\(([^)]+)\)/)[1].replace(/\s/g,'');
            let start = columnRangeValue.split("-")[0]
            let end = columnRangeValue.split("-")[1]
            columnObj[columnName] = {"type": "range", "start": parseInt(start), "end": parseInt(end), "negate": negate};
            return columnObj;
        }
        else if (/[^\s]*:"(?:[^"\\]|\\.)*"/.test(element)) { // Column name before quotation marks
            if (element.charAt(0) === "-") { // Check if there is minus front of the column name
                negate = true;

                element = element.substring(1); // remove - from column name
            }
            if (element.charAt(0) === "\"") { // If column name is inside quotation marks
                var columnName = element.split("\":\"")[0].substring(1)
                var columnValue = element.split(":\"")[1].slice(0, -1)
            } else {
                var columnName = element.split(":\"")[0]
                var columnValue = element.split(":\"")[1].slice(0, -1)
            }
            columnObj[columnName] = {"type": "value", "value": columnValue, "negate": negate};
            return columnObj;
        }
        else {
            if (element.charAt(0) === "-") { // Check if there is minus front of the column name
                negate = true;
                element = element.substring(1); // remove minus from column name
            }
            if (element.charAt(0) === "\"" && element.slice(-1) === "\"") { // Check if quotation marks around filter
                element = element.substring(1);  // Remove " from beginning of string
                element = element.slice(0, -1); // Remove " from end of string
            }
            let columnName = "";
            let columnValue = element;
            columnObj[columnName] = {"type": "value", "value": columnValue, "negate": negate};
            return columnObj;
        }
    });
    return filters;
}

// Returns each data block, which passes all filters
export const filterSearch = function filterSearch (pluginDataBlock, filters, nested=false) {

    var filtersCopy = filters; // If filtersCopy is emptied, Data block is returned and will be shown to user

    for (var block in pluginDataBlock) { // Loop through single plugin data block
        var filterLength = filters.length; // Filters amount
        var or = false; // logical or - Set to true if "OR" is filter value
        var negateAllFilterFail = false; // Used to check if all-matchin negating filter fails and is in OR combined filters.
        if (filtersCopy.length === 0 && nested === false) {
            return pluginDataBlock;
        }
        for (var i = 0; i < filterLength; i++) { // Loop through filters
            if (filters[i].constructor === Object && filters[i] !== null) { // If filter is object
                try {
                    if (filters[i].hasOwnProperty("type")) { // If logical OR
                        if (filters[i].value === "OR") {
                            if (!filtersCopy.indexOf(filters[i-1])) { // If previous filter has not been passed
                                or = true; // Set or to true
                            }
                            else if (filtersCopy.indexOf(filters[i-1])) { // If previous filter has been passed
                                filtersCopy = filtersCopy.filter(function(flt) { return flt !== filters[i]; }); // Remove "OR" and next filter 
                                filtersCopy = filtersCopy.filter(function(flt) { return flt !== filters[i+1]; });
                            }
                        }
                    }
                    else if (filters[i].hasOwnProperty(block)) { // Filter column matches the data block column
                        if (filters[i][block].type === "value") { // Filter type is value
                            let regex = new RegExp('^' + String(filters[i][block].value).replace(/\*/g, '.*') + '$')  // Turn filter into regex
                            let regexResult = (regex).test(pluginDataBlock[block])
                            if (regexResult && filters[i][block].negate === false) {
                                if (or === false) {
                                    filtersCopy = filtersCopy.filter(function(flt) { return flt !== filters[i]; });  // remove filter
                                } else if (or === true) { 
                                    try {
                                        filtersCopy = filtersCopy.filter(function(flt) { return ![filters[i], filters[i-1], filters[i-2]].includes(flt); }); // remove OR combined filters
                                    } catch (error) {
                                        filtersCopy = filtersCopy.filter(function(flt) { return ![filters[i], filters[i-1]].includes(flt); });
                                    }
                                }
                                negateAllFilterFail = false;
                            }
                            else if (!regexResult && filters[i][block].negate === true) {
                                if (or === false) {
                                    filtersCopy = filtersCopy.filter(function(flt) { return flt !== filters[i]; });  // remove filter
                                } else if (or === true) {
                                    filtersCopy = filtersCopy.filter(function(flt) { return ![filters[i], filters[i-1], filters[i-2]].includes(flt); });  // remove OR combined filters
                                }
                                negateAllFilterFail = false;
                            }
                            else if (negateAllFilterFail === true) {
                                if (nested)
                                    return false;
                                else
                                    return;
                            }
                            or = false;
                        }
                        else if (filters[i][block].type === "range") { // Filter type is range
                            if ((filters[i][block].start <= parseInt(pluginDataBlock[block]) && filters[i][block].end >= parseInt(pluginDataBlock[block])) && filters[i][block].negate === false) { // Data block value matches range and negate is false
                                if (or === false) {
                                    filtersCopy = filtersCopy.filter(function(flt) { return flt !== filters[i]; });  // remove filter
                                } else if (or === true) {
                                    filtersCopy = filtersCopy.filter(function(flt) { return ![filters[i], filters[i-1], filters[i-2]].includes(flt); });  // remove OR combined filters
                                }
                                negateAllFilterFail = false;
                            }
                            else if (!(filters[i][block].start <= parseInt(pluginDataBlock[block]) && filters[i][block].end >= parseInt(pluginDataBlock[block])) && filters[i][block].negate === true) { // Data block does not match range and negate is true
                                if (or === false) {
                                    filtersCopy = filtersCopy.filter(function(flt) { return flt !== filters[i]; });  // remove filter
                                } else if (or === true) {
                                    filtersCopy = filtersCopy.filter(function(flt) { return ![filters[i], filters[i-1], filters[i-2]].includes(flt); });  // remove OR combined filters
                                }
                                negateAllFilterFail = false;
                            }
                            else if (negateAllFilterFail === true) {
                                if (nested)
                                    return false;
                                else
                                    return;
                            }
                            or = false;
                        }
                    }
                    else if (filters[i].hasOwnProperty("")) { // Filter applies to all data blocks
                        if (filters[i][""].type === "value") { // Filter type is value
                            let regex = new RegExp('^' + String(filters[i][""].value).replace(/\*/g, '.*') + '$')  // Turn filter into regex
                            let regexResult = (regex).test(pluginDataBlock[block])
                            if (regexResult && filters[i][""].negate === false) { // Filter is inclusive and passes test
                                if (or === false) {
                                    filtersCopy = filtersCopy.filter(function(flt) { return flt !== filters[i]; });  // remove filter
                                } 
                                else if (or === true) {
                                    filtersCopy = filtersCopy.filter(function(flt) { return ![filters[i], filters[i-1], filters[i-2]].includes(flt); });  // remove filter
                                }
                                negateAllFilterFail = false;
                            }
                            else if (!regexResult && filters[i][""].negate === true) { // Filter is negating and does not pass test
                                if (or === false) {
                                    filtersCopy = filtersCopy.filter(function(flt) { return flt !== filters[i]; });  // remove filter
                                } else if (or === true) {
                                    filtersCopy = filtersCopy.filter(function(flt) { return ![filters[i], filters[i-1], filters[i-2]].includes(flt); });  // remove OR combined filters
                                }
                                negateAllFilterFail = false;
                            }
                            else if (negateAllFilterFail === true) {
                                if (nested)
                                    return "fail"; // Do not add data block - return from 1st recursion
                                else
                                    return;
                            }
                            else if (regexResult && filters[i][""].negate === true) { // Filter is negating and passes test
                                try {
                                    if (filters[i+1].value === "OR") { // If next value is OR
                                        negateAllFilterFail = true; // Set negateAllFilterFail to true
                                        continue;
                                    } else {
                                        if (nested)
                                            return "fail"; // Do not add data block - return from 1st recursion
                                        else
                                            return;
                                    }
                                } catch (error) {
                                    if (nested)
                                        return "fail"; // Do not add data block - return from 1st recursion
                                    else
                                        return;
                                }
                            }
                        }
                        or = false;
                    }
                } catch (error) {
                    continue;
                }
            }
            else if (Array.isArray(filters[i])) { // Nested filters, run filterSearch recursively, but set optional parameter nested to true
                let nestedBlock = new Object; // Create object for the current block being tested from pluginDataBlocks
                nestedBlock[block] = pluginDataBlock[block];
                var nestedSearch = this.filterSearch(pluginDataBlock, filters[i], true); // Run recursive search
                if (nestedSearch  === true) { //
                    if (or === false) {
                        filtersCopy = filtersCopy.filter(function(flt) { return flt !== filters[i]; });  // remove filter
                    } else if (or === true) {
                        filtersCopy = filtersCopy.filter(function(flt) { return ![filters[i], filters[i-1], filters[i-2]].includes(flt); });  // remove OR combined filters
                    }
                    negateAllFilterFail = false;
                }
                else if (nestedSearch === "fail") { // Negating all-matching filter has not been matched
                    return;
                }
                else if (nestedSearch === false) {
                    if (or === true) { // Filter is OR combined
                        if (negateAllFilterFail === true) { // Also previous filter failed
                            break;
                        }
                        else if (negateAllFilterFail === false) {
                            continue;
                        }
                    } else if (or === false) {
                        try {
                            if (filters[i+1].value === "OR") { // If next value is OR
                                negateAllFilterFail = true; // Set negateAllFilterFail to true
                                continue;
                            }
                        } catch (error) {
                            break;
                        }
                    }
                }
                or = false;
            }
        }
    }
    if (filtersCopy.length === 0 && nested === false) {
        return pluginDataBlock;
    }
    else if (filtersCopy.length === 0 && nested === true) {
        return true;
    }
    else if (filtersCopy.length !== 0 && nested === true) {
        return filtersCopy;
        //return false;
    }
}
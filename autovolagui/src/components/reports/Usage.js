const reportsSearchUsage = `<h2>Search how-to</h2>
<p>Search can be used to filter visible reports by supplying strings that contain letters equivalent to report column values.
Search works with logical AND, so all whitespaces between words equal logical AND operator.</p>
<p>Reports can also be filtered by data outputted by Volatility plugins. There are 3 keywords for this: </p>
<ul>
    <li><span style="color:green">WINDOWS</span> - filter Windows reports</li>
    <li><span style="color:green">LINUX</span> - filter Linux reports</li>
    <li><span style="color:green">GLOBAL</span> - filter both Linux and Windows reports</li>
</ul>
<p>Keyword must be the first word in the search. Search words after the keyword follow same principal as when analysing dump.</p>
<p>Analysis search is more advanced and contains several features listed below.</p>
<h3>Operators</h3>
<p>Search strings are combined with logical AND (Whitespace) by default, but can also be combined with logical OR by writing OR between the strings.</p>
<ol>
    <li><span style="color:green">WINDOWS PID:"620" OR PID:"800"</span> - Show Windows dump report if it contains column PID with either value 620 OR 800</li>
    <li><span style="color:green">WINDOWS PID:"620" Value:"AMD64"</span> - Show Windows dump report if it contains data row that has column PID with value 620 AND another column Value with value AMD64. (<b>NOTE</b>: Value is column name like Process, PID, Modules, Offset etc. and has nothing to do with search syntax)</li>
</ol>
<h3>Regex</h3>
<p>Quotation mark and free search use regex, so it is important to know special regex characters which are <b>. + * ? ^ $ ( ) [ ] { } | \\</b> . If any these marks are part of the value you are searching, you should comment the mark out using <b>\\</b>, which is one of the special characters, so the same policy applies to it as well.</p>
<ol>
    <li><span style="color:green">WINDOWS Path:"C:\\\\Windows\\\\System32\\\\kernel32\\.dll"</span> - Show Windows dump reports that have column Path that contains value C:\\Windows\\System32\\kernel32.dll. <b>NOTE:</b> Commenting dot is usually not needed since it applies to any character except newline in regex syntax.</li>
    <li><span style="color:green">LINUX "File Path":"\\[vdso\\]"</span> - Show Linux dump reports that contain column File Path with value [vdso].</li>
</ol>
<h3>Quotation marks</h3>
<p>Strings that are surrounded by quotation marks are compared to values in each column in each plugin. This search uses regex, so all regex marks should be commented. Quotation marks that are part of the value should also be commented using \\, so the value can be parsed correctly.</p>
<ol>
    <li><span style="color:green">LINUX "/dev/*"</span> - Show Linux dump report if any column contains value that starts with /dev/</li>
    <li><span style="color:green">WINDOWS Variable:"EXAMPLE" Value:"\\[\\\"text\\\"\\]"</span> - Show Windows dump report if it contains data row that has column Variable with value EXAMPLE AND column Value with value ["text"].</li>
</ol>
<h3>Free search</h3>
<p>Strings that are not surrounded by quotation marks are parsed mostly the sameway as strings surrounded by quotation marks.</p>
<p>Difference is that non-quotation marked strings are separated by whitespaces, so values can't contain any whitespaces and non-quotation marked strings target all columns, so they cannot be used to target single column name by using column name as prefix (e.g. <span style="color:green">WINDOWS PID:1000</span> would search all Windows reports columns for value PID:1000).</sp>
<ol>
    <li><span style="color:green">WINDOWS *\\.ps1</span> - Show Windows dump report if any column contains value that ends with .ps1.</li>
    <li><span style="color:green">GLOBAL VBoxClient*</span> - Show Windows and Linux reports that contain any column with value starting with VBoxClient.</li>
</ol>
<h3>Ranges</h3>
<p>Range filters can be used to search <b>numerical</b> data within certain range. Range needs to always have a prefix containing column name which is targeted. Range syntax is: <span style="color:green">column:(startvalue-endvalue)</span>. No whitespaces inside brackets are allowed.</p>
<ol>
    <li><span style="color:green">GLOBAL Offset:(0x0000850000036750-0x00008F03C0E483B0)</span> - Show Windows and Linux reports that contain column Offset which has value between 0x0000850000036750 and 0x00008F03C0E483B0.</li>
    <li><span style="color:green">LINUX PID:(50-1000)</span> - Show Linux reports that contain column PID which has value between 50 and 1000.</li>
</ol>
<h3>Column names</h3>
<p> Column names before the actual value tell which column is being targeted. Currently there is no way to specify an individual plugin with certain value. e.g. if search is: <span style="color:green">PID:"500"</span>, all plugins with column PID are targeted. If column name contains whitespaces, it can be surrounded by quotation marks. Column name can not be specified when using free search.</p>
<ol>
    <li><span style="color:green">WINDOWS "Last Write Time":"2019-09-18*"</span> - Show Windows reports that contain column Last Write Time with value starting with 2019-09-18</li>
</ol>
<h3>Negating search</h3>
<p>Negating search can be used to remove out some results from search. It works the opposite way as regular search. Other than nested and free search can be turned into negating search by adding - front of the search string. <b>NOTE:</b> Currently this is more useful feature in the analysis search and not very practical in this one.</p>
<ol>
    <li><span style="color:green">GLOBAL -Offset:(0x0000850000036750-0x00008F03C0E483B0)</span> - Show Windows and Linux reports that do not contain ANY columns with Offset which has value between 0x0000850000036750 and 0x00008F03C0E483B0. This maybe works for one plugin with Offset column, but some other plugins do not have Offset column, so the report is shown.</li>
    <li><span style="color:green">LINUX -"*a*" OR -"*0*"</span> - Show Linux reports if it does not contain any a or 0 characters under any column</li>
</ol>
<h3>Nested search</h3>
<p>Nested searches can be used to do more complex searches. In nested search, search strings are put inside brackets turning them into a group. If range search is used inside nested search, closing bracket ) at the end of the search has to be commented out. Currently nested search doesn't support negating searches and other nests inside nest.</p>
<p><b>NOTE:</b> nested searches can be very heavy to browser if several of them occur in same search string!</p>
<ol>
    <li><span style="color:green">WINDOWS (Process:"smss.exe" Variable:"*SystemDrive*") OR (Module:"Wd*" -Type:"KeBugCheckReasonCallbackListHead")</span> - Show Windows reports that contain (column Process with value smss.exe AND column Variable containing SystemDrive somewhere within value) OR (column Module which has value starting with Wd*, but that row does not have column Type with value KeBugCheckReasonCallbackListHead).</li>
    <li><span style="color:green">WINDOWS Process:"lsass.exe" (Base:(140702881546240-140709896912896\\) OR Variable:"*")</span> - Show Windows reports that contain column Process with value lsass.exe AND (column base with value between 140702881546240 and 140709896912896 OR column Variable with any value)</li>
</ol>
<h3>Known issues:</h3>
<ul>
    <li>When using Offsets, Addresses and other hexadecimal values in this search, you likely need to turn the hexadecimal value into decimal. e.g. Hex 0x0000D98D0AA0E000 converts into decimal number 239199791931392.</li>
    <li>Size column can not be currently used in this search.</li>
    <li>Reports Type and Windows reports OS columns can not be currently used in this search.</li>
</ul>
`;

const reportsUsage = `
<h2>Reports table</h2>
<p>Each uploaded dump is displayed in this table, which has columns where you can e.g. insert data helping to identify dumps from each other.</p>
<p>You can start to analyse dump by pressing  <img style="max-width: 1em" src="images/analyze.png" />  icon.</p>
<p>You can open up plugin selection by pressing  <img style="max-width: 1em" src="images/select-plugins.png" />  icon next to dump. From there you can select which plugins should be run on the dump. Results of the plugins will appear to analysis page. basicdetails is run by default when dump is uploaded and info when Windows dump uploaded.</p>
<p>When pressing <img style="max-width: 1em" src="images/edit.png" /> icon, a box will open where you can do modifications to the report by changing name, updating description, adding tags and removing tags related to the dump.</p>
<p>You can remove dump and all its data from DB by pressing  <img style="max-width: 1em" src="images/delete.png" /> icon.</p>
`;

const pageHeaderUsage = `
<h2>Search how-to</h2>
<h3>Operators</h3>
<p>Search strings are combined with logical AND (Whitespace) by default, but can also be combined with logical OR by writing OR between the strings.</p>
<ol>
    <li><span style="color:green">PID:"620" OR PID:"800"</span> - Show plugin data block if it contains column PID with either value 620 OR 800</li>
    <li><span style="color:green">PID:"620" Value:"AMD64"</span> - Show plugin data block if it contains data row that has column PID with value 620 AND another column Value with value AMD64. (<b>NOTE</b>: Value is column name like Process, PID, Modules, Offset etc. and has nothing to do with search syntax)</li>
</ol>
<h3>Regex</h3>
<p>Quotation mark and free search use regex, so it is important to know special regex characters which are <b>. + * ? ^ $ ( ) [ ] { } | \\</b> . If any these marks are part of the value you are searching, you should comment the mark out using <b>\\</b>, which is one of the special characters, so the same policy applies to it as well.</p>
<ol>
    <li><span style="color:green">Path:"C:\\\\Windows\\\\System32\\\\kernel32\\.dll"</span> - Show plugin data blocks that have column Path that contains value C:\\Windows\\System32\\kernel32.dll. <b>NOTE:</b> Commenting dot is usually not needed since it applies to any character except newline in regex syntax.</li>
    <li><span style="color:green">"File Path":"\\[vdso\\]"</span> - Show plugin data blocks that contain column File Path with value [vdso].</li>
</ol>
<h3>Quotation marks</h3>
<p>Strings that are surrounded by quotation marks are compared to values in each column in each plugin. This search uses regex, so all regex marks should be commented. Quotation marks that are part of the value should also be commented using \\, so the value can be parsed correctly.</p>
<ol>
    <li><span style="color:green">"/dev/*"</span> - Show plugin data blocks if any column contains value that starts with /dev/</li>
    <li><span style="color:green">Variable:"EXAMPLE" Value:"\\[\\\"text\\\"\\]"</span> - Show plugin data block if it contains data row that has column Variable with value EXAMPLE AND column Value with value ["text"].</li>
</ol>
<h3>Free search</h3>
<p>Strings that are not surrounded by quotation marks are parsed mostly the sameway as strings surrounded by quotation marks.</p>
<p>Difference is that non-quotation marked strings are separated by whitespaces, so values can't contain any whitespaces and non-quotation marked strings target all columns, so they cannot be used to target single column name by using column name as prefix (e.g. <span style="color:green">PID:1000</span> would search all columns for value PID:1000).</sp>
<ol>
    <li><span style="color:green">*\\.ps1</span> - Show plugin data block if any column contains value that ends with .ps1.</li>
    <li><span style="color:green">VBoxClient*</span> - Show plugin data block that contains any column with value starting with VBoxClient.</li>
</ol>
<h3>Ranges</h3>
<p>Range filters can be used to search <b>numerical</b> data within certain range. Range needs to always have a prefix containing column name which is targeted. Range syntax is: <span style="color:green">column:(startvalue-endvalue)</span>. No whitespaces inside brackets are allowed.</p>
<ol>
    <li><span style="color:green">Offset:(0x0000850000036750-0x00008F03C0E483B0)</span> - Show plugin data blocks that contain column Offset which has value between 0x0000850000036750 and 0x00008F03C0E483B0.</li>
    <li><span style="color:green">PID:(50-1000)</span> - Show plugin data blocks that contain column PID which has value between 50 and 1000.</li>
</ol>
<h3>Column names</h3>
<p> Column names before the actual value tell which column is being targeted. Currently there is no way to specify an individual plugin with certain value. e.g. if search is: <span style="color:green">PID:"500"</span>, all plugins with column PID are targeted. If column name contains whitespaces, it can be surrounded by quotation marks. Column name can not be specified when using free search.</p>
<ol>
    <li><span style="color:green">"Last Write Time":"2019-09-18*"</span> - Show plugin data blocks that contain column Last Write Time with value starting with 2019-09-18</li>
</ol>
<h3>Negating search</h3>
<p>Negating search can be used to remove out some results from search. It works the opposite way as regular search. Other than nested and free search can be turned into negating search by adding - front of the search string.</p>
<ol>
    <li><span style="color:green">-Offset:(0x0000850000036750-0x00008F03C0E483B0)</span> - Show plugin data blocks that do not contain ANY columns with Offset which has value between 0x0000850000036750 and 0x00008F03C0E483B0. This maybe works for one plugin with Offset column, but some other plugins do not have Offset column, so all those plugins data blocks are shown.</li>
    <li><span style="color:green">-"*a*" OR -"*0*"</span> - Show plugin data block if it does not contain any a or 0 characters under any column</li>
</ol>
<h3>Nested search</h3>
<p>Nested searches can be used to do more complex searches. In nested search, search strings are put inside brackets turning them into a group. If range search is used inside nested search, closing bracket ) at the end of the search has to be commented out. Currently nested search doesn't support negating searches and other nests inside nest.</p>
<p><b>NOTE:</b> nested searches can be very heavy to browser if several of them occur in same search string!</p>
<ol>
    <li><span style="color:green">(Process:"smss.exe" Variable:"*SystemDrive*") OR (Module:"Wd*" -Type:"KeBugCheckReasonCallbackListHead")</span> - Show plugin data blocks that contain (column Process with value smss.exe AND column Variable containing SystemDrive somewhere within value) OR (column Module which has value starting with Wd*, but that row does not have column Type with value KeBugCheckReasonCallbackListHead).</li>
    <li><span style="color:green">Process:"lsass.exe" (Base:(0x00007FF7F1460000-0x00007FF993D40000\\) OR Variable:"*")</span> - Show plugin data blocks that contain column Process with value lsass.exe AND (column Base with value between 0x00007FF7F1460000 and 0x00007FF993D40000 OR column Variable with any value)</li>
</ol>
<h2>Data blocks</h2>
<p>Data blocks menu lets user select how many rows of data are displayed in each plugin. Most of the plugins also have their own individual setting for this.</p>
<h2>Plugin selection and categories</h2>
<p>By default, all plugin results are displayed to user when she opens some dump's analysis page. Any plugin's results can be filtered out by deselecting them from menu that contains all plugin names. Plugins can be reselected from the same menu if their results are needed at some point again.</p>
<p>There is also plugin category menu, which lets user select the category of plugins resulting in showing plugins only in that particular category.</p>
<h2>JSON download</h2>
<p>Plugin output can be downloaded as JSON by clicking <img id="info-box-image" src="images/json-download.svg" />-icon in plugin header. <b>NOTE:</b> Your browser may not be able to download all of the JSON data if it takes too much space.</p>
`;

const pluginSelectImages = `
<div id="plugin-image-meaning">
    <h2>Meanings of different icons</h2>
    <p><img id="plugin-usage-image" src="images/plugin-loading.gif" /> Plugin results are still being fetched from database. </p>
    <p><img id="plugin-usage-image" src="images/plugin-not-found.png" /> Plugin results were not found from database, likely due to plugin not being run yet. </p>
    <p><img id="plugin-usage-image" src="images/plugin-ok.png" /> Plugin ran successfully and gave output.</p>
    <p><img id="plugin-usage-image" src="images/plugin-empty.png" /> Plugin ran successfully, but gave no output.</p>
    <p><img id="plugin-usage-image" src="images/plugin-error.png" /> Error occurred when running plugin.</p>
    <p><img id="plugin-usage-image" src="images/plugin-unsatisfied.png" /> Plugin requirements are unsatisfied. Proper ISF is missing.</p>
</div>
`;

export {reportsSearchUsage, reportsUsage, pageHeaderUsage, pluginSelectImages};
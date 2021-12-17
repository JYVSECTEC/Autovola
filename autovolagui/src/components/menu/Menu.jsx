import React from "react";
import {Fragment} from "react";
import './Menu.css';
import { Link, withRouter } from "react-router-dom";                     

function Menu(props) { // Top and side menu
    return (

            <div id="main">
                <div id="topmenu"> </div>
                <div id="sidemenu">
                    <div id="sidemenu-top">
                        <img id="image" src="images/autovola.jpg" alt="AUTOVOLA"/>
                    </div>
                    <div id="menu-block" className="up-block">
                        <img className="inner" id="menu-button-image" src="images/reports.png" />
                        <a href="/reports" className="inner" id={`menu-item  ${props.location.pathname === "/reports" ? "active" : ""}`}>Reports</a>
                    </div>
                    <div id="menu-block">
                        <img className="inner" id="menu-button-image" src="images/upload-isf.png" />
                        <a href="/symbols" className="inner" id={`menu-item  ${props.location.pathname === "/symbols" ? "active" : ""}`}>Upload ISF</a>
                    </div>
                    <div id="menu-block">
                        <img className="inner" id="menu-button-image" src="images/upload-dump.png" />
                        <a href="/dump" className="inner" id={`menu-item  ${props.location.pathname === "/dump" ? "active" : ""}`}>Upload dump</a>
                    </div>
                </div>
            </div>
        
    );
    //Fragment>
    //</Fragment>
}

export default withRouter(Menu); 
import './App.css';
import { BrowserRouter as Router, Route, Switch, Redirect } from "react-router-dom";
import Menu from "../menu/Menu";
import Dump from "../dump/Dump";
import Symbols from "../symbols/Symbols";
import Reports from "../reports/Reports";

function App() {
  return (
    <div className="App">
      <Router>
        <Menu />
        <Switch>
          <Route exact path="/">
                <Redirect to="/reports"/>
          </Route>
          <Route key={"Reports"} path="/reports" exact component={() => <Reports />} />
          <Route key={"Dump"} path="/dump" exact component={() => <Dump />} />
          <Route key={"Symbols"} path="/symbols" exact component={() => <Symbols />} />
        </Switch>
      </Router>
    </div>
  );
}

export default App;

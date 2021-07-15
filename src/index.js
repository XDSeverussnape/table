import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import Table from "./Table";
import reportWebVitals from "./reportWebVitals";

const someText = "Some beautiful text";

ReactDOM.render(
  <React.StrictMode>
    <div style={{ maxHeight: "90vh", width: "99vw" }}>
      <Table
        title="Test"
        data={Array.from({ length: 10000 }).map((el, i) => ({
          id: i + 1,
          name: someText,
        }))}
        columns={[{ label: "test1", dataKey: "name" }]}
      />
    </div>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

import React from "react"
import ReactDOM from "react-dom"
import "./index.css"
import Table from "./Table"
import reportWebVitals from "./reportWebVitals"

const someText = "Some beautiful text"
const testText =
  "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Dicta, obcaecati! Temporibus, dicta quidem? Nobis sunt qui impedit corporis voluptas voluptate optio mollitia quis laudantium pariatur iste nemo, tenetur, minima fugiat modi, iure dolorum unde. Deleniti iste suscipit rem repellat ipsum amet similique quos recusandae enim eos aliquam doloremque, accusamus, in reprehenderit veniam blanditiis temporibus! Eius natus aspernatur deleniti illum vitae atque laudantium eligendi fugiat porro commodi. Minima, dolor, facere dolore iure libero, fuga dolores consectetur quidem officiis accusantium exercitationem ab odio. Veniam quo excepturi non, fugiat nisi voluptates velit quisquam omnis? Ea fugiat reiciendis nesciunt voluptas! Vel ea eum eveniet?"

ReactDOM.render(
  <div
    style={{
      maxHeight: "90vh",
      width: "99vw",
      padding: 20,
      boxSizing: "border-box",
    }}
  >
    <Table
      onRowClick={() => console.log("48")}
      add={() => console.log("48")}
      edit={() => console.log("48")}
      title="Test"
      data={Array.from({ length: 3 }).map((el, i) => ({
        id: Math.random(),
        test1: someText,
        test2: someText,
        test3: someText,
        test4: someText,
        test5: i === 2 || i === 10 ? testText : someText,
        test6: someText,
        test7: someText,
        test8: someText,
      }))}
      columns={[
        { label: "test1", dataKey: "test1" },
        { label: "test2", dataKey: "test2" },
        { label: "test3", dataKey: "test3" },
        { label: "test4", dataKey: "test4" },
        { label: "test5", dataKey: "test5" },
        { label: "test6", dataKey: "test6" },
        { label: "test7", dataKey: "test7" },
        { label: "test8", dataKey: "test8" },
      ]}
    />
  </div>,
  document.getElementById("root"),
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()

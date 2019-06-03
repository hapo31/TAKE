import React from "react";
import ReactDOM from "react-dom";
import Root from "./Root/Root";

const { body } = document;

body.style.backgroundColor = "#fefefe";

ReactDOM.render(
  <Root width={window.parent.innerWidth} height={window.parent.innerHeight} />,
  document.getElementById("app")
);

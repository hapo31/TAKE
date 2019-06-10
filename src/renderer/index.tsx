import React from "react";
import ReactDOM from "react-dom";
import Root from "./Root/Root";
import parseGetParam from "../utils/parseGetParam";

const { body } = document;
const param = parseGetParam();

window.name = param["id"];

body.style.backgroundColor = "#fefefe";

ReactDOM.render(
  <Root width={window.parent.innerWidth} height={window.parent.innerHeight} />,
  document.getElementById("app")
);
